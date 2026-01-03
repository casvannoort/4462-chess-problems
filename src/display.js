// Main orchestrator - imports and coordinates all modules
import { Chessboard, INPUT_EVENT_TYPE, COLOR } from "cm-chessboard";
import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog, PROMOTION_DIALOG_RESULT_TYPE } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";

import { state, setState, saveToStorage } from "./state.js";
import { getMoveCount, getColorIndicator, wouldBeCheckmate, createGame, getTurnColor } from "./game.js";
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

// --- Tree Navigation Helpers ---

function isTerminalNode(tree) {
  return tree && Object.keys(tree).length === 0;
}

function getFirstMove(tree) {
  const moves = Object.keys(tree);
  return moves.length > 0 ? moves[0] : null;
}

// --- Move Execution ---

function makeOpponentMove() {
  // Get the first (and typically only) opponent response from current tree level
  const move = getFirstMove(state.solutionTree);
  if (!move) return;

  const source = move.slice(0, 2);
  const target = move.slice(2, 4);
  const promotion = move.length > 4 ? move[4] : undefined;

  state.game.move({ from: source, to: target, promotion });
  state.board.movePiece(source, target, true).then(() => {
    // Update board position to show promoted piece
    state.board.setPosition(state.game.fen(), false);
    // Navigate deeper into the tree
    setState({ solutionTree: state.solutionTree[move] });
  });
}

// --- Input Handler ---

function inputHandler(event) {
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    return true;
  }

  if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
    try {
      const src = event.squareFrom;
      const tgt = event.squareTo;

      if (state.game.isCheckmate()) {
        return false;
      }

      // Check if the move is even legal in chess
      const testMove = state.game.move({ from: src, to: tgt, promotion: 'q' });
      if (!testMove) {
        return false;
      }
      state.game.undo();

      // Build UCI move string
      const userMoveBase = src + tgt;

      // --- FIRST MOVE: check against solution tree root ---
      if (state.isFirstMove) {
        if (isPromotionMove(state.game, src, tgt)) {
          const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;
          state.board.showPromotionDialog(tgt, turnColor, (result) => {
            if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
              const selectedPromotion = result.piece.charAt(1);
              const userMove = userMoveBase + selectedPromotion;

              if (state.solutions[userMove]) {
                state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
                const nextTree = state.solutions[userMove];
                setState({
                  solutionTree: nextTree,
                  isFirstMove: false,
                });
                state.board.setPosition(state.game.fen(), true);

                if (isTerminalNode(nextTree)) {
                  onPuzzleSolved();
                } else {
                  setTimeout(makeOpponentMove, 500);
                }
              } else {
                showQuote(false);
                state.board.setPosition(state.game.fen(), false);
              }
            } else {
              state.board.setPosition(state.game.fen(), false);
            }
          });
          return false;
        }

        // Non-promotion first move
        if (state.solutions[userMoveBase]) {
          state.game.move({ from: src, to: tgt });
          const nextTree = state.solutions[userMoveBase];
          setState({
            solutionTree: nextTree,
            isFirstMove: false,
          });

          if (isTerminalNode(nextTree)) {
            state.board.setPosition(state.game.fen(), true);
            onPuzzleSolved();
            return false;
          } else {
            setTimeout(makeOpponentMove, 500);
            return true;
          }
        } else {
          showQuote(false);
          return false;
        }
      }

      // --- SUBSEQUENT MOVES: validate against current tree level ---
      if (!state.solutionTree) {
        return false;
      }

      // Check if this is a valid move in the tree
      const validMoves = Object.keys(state.solutionTree);
      const isLastMove = validMoves.every(m => isTerminalNode(state.solutionTree[m]));

      if (isPromotionMove(state.game, src, tgt)) {
        const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;
        state.board.showPromotionDialog(tgt, turnColor, (result) => {
          if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
            const selectedPromotion = result.piece.charAt(1);
            const userMove = userMoveBase + selectedPromotion;

            // For final moves, accept any promotion that results in checkmate
            if (isLastMove) {
              if (state.solutionTree[userMove] || wouldBeCheckmate(state.game.fen(), src, tgt, selectedPromotion)) {
                state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
                state.board.setPosition(state.game.fen(), true);
                onPuzzleSolved();
              } else {
                showQuote(false);
                state.board.setPosition(state.game.fen(), false);
              }
            } else {
              if (state.solutionTree[userMove]) {
                state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
                setState({ solutionTree: state.solutionTree[userMove] });
                state.board.setPosition(state.game.fen(), true);
                setTimeout(makeOpponentMove, 500);
              } else {
                showQuote(false);
                state.board.setPosition(state.game.fen(), false);
              }
            }
          } else {
            state.board.setPosition(state.game.fen(), false);
          }
        });
        return false;
      }

      // Non-promotion subsequent move
      if (isLastMove) {
        // Accept any move that results in checkmate
        if (state.solutionTree[userMoveBase] || wouldBeCheckmate(state.game.fen(), src, tgt, null)) {
          state.game.move({ from: src, to: tgt });
          state.board.setPosition(state.game.fen(), true);
          onPuzzleSolved();
          return false;
        } else {
          showQuote(false);
          return false;
        }
      } else {
        if (state.solutionTree[userMoveBase]) {
          state.game.move({ from: src, to: tgt });
          setState({ solutionTree: state.solutionTree[userMoveBase] });
          setTimeout(makeOpponentMove, 500);
          return true;
        } else {
          showQuote(false);
          return false;
        }
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
    solutions: problem.solutions,  // Tree: { "move": { "opp": { "mate": {} } } }
    solutionTree: null,            // Set after user's first move
    isFirstMove: true,
  });

  saveToStorage();

  const moveCount = getMoveCount(problem.type);
  const colorIndicator = getColorIndicator(problem.first);

  updateTitle(problem.problemid, moveCount, colorIndicator);
  updateProblemInput(problem.problemid);

  const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;

  // Set board orientation based on whose turn it is
  state.board.setOrientation(turnColor);
  state.board.setPosition(problem.fen, useAnimation);
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
