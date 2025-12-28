// Main orchestrator - imports and coordinates all modules
import { Chessboard, INPUT_EVENT_TYPE, COLOR } from "cm-chessboard";
import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";
import problemsData from "../problems.json";

import { state, setState, saveToStorage } from "./state.js";
import { parseMove, getMoveCount, getColorIndicator, wouldBeCheckmate, createGame, getTurnColor } from "./game.js";
import { initUrlParameters, pushState, getInitialProblemId } from "./router.js";
import {
  cacheElements,
  getElements,
  showQuote,
  updateTitle,
  showSolvedState,
  showPuzzleNav,
  updateProblemInput,
  getProblemInputValue,
  setNextButtonHandler,
  setGoButtonHandler,
  setProblemInputHandler,
} from "./ui.js";

const problems = problemsData.problems;
const TOTAL_PROBLEMS = problems.length;

// --- Move Execution ---

function makeOpponentMove() {
  const { source, target, promotion } = parseMove(state.correctMoves[0]);
  state.game.move({ from: source, to: target, promotion });
  state.board.movePiece(source, target, true).then(() => {
    state.correctMoves.shift();
  });
}

// --- Input Handler ---

function inputHandler(event) {
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    return true;
  }

  if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
    const src = event.squareFrom;
    const tgt = event.squareTo;

    if (state.game.in_checkmate()) {
      return false;
    }

    const { source, target, promotion } = parseMove(state.correctMoves[0]);

    if (state.correctMoves.length === 1) {
      // Last move - check if it results in checkmate
      if (!wouldBeCheckmate(state.game.fen(), src, tgt, promotion)) {
        showQuote(false);
        return false;
      }

      state.game.move({ from: src, to: tgt, promotion });
      state.correctMoves.shift();
      onPuzzleSolved();
      return true;
    } else {
      // Not last move - must match exactly
      if (src !== source || tgt !== target) {
        showQuote(false);
        return false;
      }

      state.game.move({ from: source, to: target, promotion });
      state.correctMoves.shift();
      setTimeout(makeOpponentMove, 500);
      return true;
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

function nextProblem() {
  changeProblem(1);
}

function previousProblem() {
  changeProblem(-1);
}

function changeProblem(direction) {
  const newId = state.currentProblemId + direction;
  if (newId >= 1 && newId <= TOTAL_PROBLEMS) {
    loadProblem(problems[newId - 1]);
    pushState(newId);
  }
}

function goToProblem(id) {
  if (id >= 1 && id <= TOTAL_PROBLEMS) {
    loadProblem(problems[id - 1]);
    pushState(id);
  }
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

      if (e.code === "Space" && state.game && state.game.in_checkmate()) {
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
  window.onpopstate = (event) => {
    if (event.state && "id" in event.state) {
      loadProblem(problems[event.state["id"] - 1], false);
    }
  };
}

// --- Initialize ---

function init() {
  cacheElements();
  initUrlParameters();

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
    ],
  });

  setState({ board });

  // Load initial problem
  const initialProblemId = getInitialProblemId(problems);
  loadProblem(problems[initialProblemId - 1], false);
  pushState(initialProblemId);

  // Setup event handlers
  setGoButtonHandler(() => goToProblem(getProblemInputValue()));
  setProblemInputHandler(() => goToProblem(getProblemInputValue()));
  setupKeyboardNavigation();
  setupPopstateHandler();
}

export { init };
