// Main orchestrator - imports and coordinates all modules
import { Chessboard, INPUT_EVENT_TYPE, COLOR } from "cm-chessboard";
import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog, PROMOTION_DIALOG_RESULT_TYPE } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";

import { state, setState, saveToStorage } from "./state.js";
import { parseMove, getMoveCount, getColorIndicator, wouldBeCheckmate, createGame, getTurnColor } from "./game.js";
import { initUrlParameters, pushState, getInitialProblemId } from "./router.js";
import { getProblem, getTotalProblems, preloadAdjacent } from "./puzzleLoader.js";
import {
  cacheElements,
  getElements,
  showQuote,
  showError,
  updateTitle,
  showSolvedState,
  showPuzzleNav,
  updateProblemInput,
  getProblemInputValue,
  setNextButtonHandler,
  setGoButtonHandler,
  setProblemInputHandler,
} from "./ui.js";

let totalProblems = 4462; // Will be updated from manifest

// --- Promotion Detection ---

function isPromotionMove(game, from, to) {
  const piece = game.get(from);
  if (!piece || piece.type !== 'p') return false;
  const targetRank = to.charAt(1);
  return targetRank === '8' || targetRank === '1';
}

// --- Move Execution ---

function makeOpponentMove() {
  const { source, target, promotion } = parseMove(state.correctMoves[0]);
  state.game.move({ from: source, to: target, promotion });
  state.board.movePiece(source, target, true).then(() => {
    // Update board position to show promoted piece
    state.board.setPosition(state.game.fen(), false);
    state.correctMoves.shift();
  });
}

// --- Input Handler ---

function handlePromotionSelection(src, tgt, expectedPromotion, selectedPromotion, isLastMove) {
  // Check if user selected the correct piece
  if (selectedPromotion !== expectedPromotion) {
    showQuote(false);
    // Reset board to current position (piece goes back)
    state.board.setPosition(state.game.fen(), false);
    return;
  }

  // Correct promotion piece selected
  state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
  state.correctMoves.shift();
  state.board.setPosition(state.game.fen(), true);

  if (isLastMove) {
    onPuzzleSolved();
  } else {
    setTimeout(makeOpponentMove, 500);
  }
}

function inputHandler(event) {
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    return true;
  }

  if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
    try {
      const src = event.squareFrom;
      const tgt = event.squareTo;

      if (!state.correctMoves || state.correctMoves.length === 0) {
        return false;
      }

      if (state.game.isCheckmate()) {
        return false;
      }

      // Check if the move is even legal in chess
      const testMove = state.game.move({ from: src, to: tgt, promotion: 'q' });
      if (!testMove) {
        // Illegal move - reject silently
        return false;
      }
      // Undo the test move
      state.game.undo();

      const { source, target, promotion: expectedPromotion } = parseMove(state.correctMoves[0]);
      const isLastMove = state.correctMoves.length === 1;

      // Check if this is a promotion move
      if (isPromotionMove(state.game, src, tgt)) {
        // For last move, also verify it would be checkmate with the expected promotion
        if (isLastMove && !wouldBeCheckmate(state.game.fen(), src, tgt, expectedPromotion)) {
          showQuote(false);
          return false;
        }

        // For non-last moves, squares must match exactly
        if (!isLastMove && (src !== source || tgt !== target)) {
          showQuote(false);
          return false;
        }

        // Show promotion dialog
        const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;
        state.board.showPromotionDialog(tgt, turnColor, (result) => {
          if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
            // Extract piece type from result (e.g., "wq" -> "q")
            const selectedPromotion = result.piece.charAt(1);
            handlePromotionSelection(src, tgt, expectedPromotion, selectedPromotion, isLastMove);
          } else {
            // Canceled - reset board
            state.board.setPosition(state.game.fen(), false);
          }
        });

        return false; // Don't let cm-chessboard handle the move
      }

      // Non-promotion move handling
      if (isLastMove) {
        // Last move - check if it results in checkmate
        if (!wouldBeCheckmate(state.game.fen(), src, tgt, expectedPromotion)) {
          showQuote(false);
          return false;
        }

        state.game.move({ from: src, to: tgt, promotion: expectedPromotion });
        state.correctMoves.shift();
        state.board.setPosition(state.game.fen(), true);
        onPuzzleSolved();
        return false;
      } else {
        // Not last move - must match exactly
        if (src !== source || tgt !== target) {
          showQuote(false);
          return false;
        }

        state.game.move({ from: source, to: target, promotion: expectedPromotion });
        state.correctMoves.shift();
        setTimeout(makeOpponentMove, 500);
        return true;
      }
    } catch (error) {
      console.error("Move validation error:", error);
      return false;
    }
  }

  if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
    state.board.setPosition(state.game.fen(), false);
  }
}

// --- Puzzle State ---

function onPuzzleSolved() {
  showSolvedState();
  setNextButtonHandler(nextProblem);
  showQuote(true);
  state.board.disableMoveInput();
}

// --- Navigation ---

async function nextProblem() {
  await changeProblem(1);
}

async function previousProblem() {
  await changeProblem(-1);
}

async function changeProblem(direction) {
  const newId = state.currentProblemId + direction;
  if (newId < 1 || newId > totalProblems) {
    return;
  }
  try {
    const problem = await getProblem(newId);
    if (!problem) {
      return;
    }
    loadProblem(problem);
    pushState(newId);
  } catch (error) {
    console.error("Failed to change puzzle:", error);
  }
  // Preload adjacent chunks (don't await, don't show errors)
  preloadAdjacent(newId).catch(() => {});
}

async function goToProblem(id) {
  if (!id || id < 1 || id > totalProblems) {
    return;
  }
  try {
    const problem = await getProblem(id);
    if (!problem) {
      console.error("Problem not found:", id);
      return;
    }
    loadProblem(problem);
    pushState(id);
  } catch (error) {
    console.error("Failed to load puzzle:", error);
  }
  // Preload adjacent chunks (don't await, don't show errors)
  preloadAdjacent(id).catch(() => {});
}

// --- Load Problem ---

function loadProblem(problem, useAnimation = true) {
  showPuzzleNav();

  setState({
    currentProblemId: problem.problemid,
    game: createGame(problem.fen),
    correctMoves: problem.moves.split(";"),
  });

  saveToStorage();

  const moveCount = getMoveCount(problem.type);
  const colorIndicator = getColorIndicator(problem.first);

  updateTitle(problem.problemid, moveCount, colorIndicator);
  updateProblemInput(problem.problemid);

  state.board.setPosition(problem.fen, useAnimation);

  const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;
  state.board.enableMoveInput(inputHandler, turnColor);
}

// --- Keyboard Navigation ---

function setupKeyboardNavigation() {
  document.body.onkeydown = (e) => {
    if (e.target.id === "problem-input") {
      return;
    }

    if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowLeft") {
      e.preventDefault();

      if (e.code === "Space" && state.game && state.game.isCheckmate()) {
        nextProblem();
      } else if (e.code === "ArrowRight") {
        nextProblem();
      } else if (e.code === "ArrowLeft") {
        previousProblem();
      }
    }
  };
}

// --- Browser History ---

function setupPopstateHandler() {
  window.onpopstate = async (event) => {
    if (event.state && "id" in event.state) {
      try {
        const problem = await getProblem(event.state["id"]);
        if (problem) {
          loadProblem(problem, false);
        }
      } catch (error) {
        console.error("Failed to load puzzle from history:", error);
      }
    }
  };
}

// --- Initialize ---

async function init() {
  cacheElements();
  initUrlParameters();

  // Get total problems from manifest
  totalProblems = await getTotalProblems();

  // Create the board
  const board = new Chessboard(getElements().board, {
    assetsUrl: "node_modules/cm-chessboard/assets/",
    style: {
      cssClass: "default",
      showCoordinates: true,
      aspectRatio: 1,
    },
    extensions: [
      { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
      { class: PromotionDialog },
    ],
  });

  setState({ board });

  // Load initial problem
  const initialProblemId = getInitialProblemId(totalProblems);
  const initialProblem = await getProblem(initialProblemId);
  loadProblem(initialProblem, false);
  pushState(initialProblemId);
  preloadAdjacent(initialProblemId);

  // Setup event handlers
  setGoButtonHandler(() => goToProblem(getProblemInputValue()));
  setProblemInputHandler(() => goToProblem(getProblemInputValue()));
  setupKeyboardNavigation();
  setupPopstateHandler();
}

export { init };
