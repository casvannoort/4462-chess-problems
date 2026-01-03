// Main orchestrator - imports and coordinates all modules
import { state, setState } from "./state.js";
import { initUrlParameters, pushState, getInitialProblemId } from "./router.js";
import { getProblem, getTotalProblems, preloadAdjacent } from "./puzzleLoader.js";
import { cacheElements, getElements, showQuote, showSolvedState, setNextButtonHandler } from "./ui.js";

import { createBoard } from "./board.js";
import { createInputHandler } from "./moveHandler.js";
import {
  setTotalProblems,
  setInputHandler,
  nextProblem,
  loadProblem,
  setupNavigationHandlers,
} from "./navigation.js";

// --- Puzzle State Callback ---

function onPuzzleSolved() {
  showSolvedState();
  setNextButtonHandler(nextProblem);
  showQuote(true);
  state.board.disableMoveInput();
}

// --- Initialize ---

async function init() {
  cacheElements();
  initUrlParameters();

  // Get total problems from manifest
  const totalProblems = await getTotalProblems();
  setTotalProblems(totalProblems);

  // Create the board
  const board = createBoard(getElements().board);
  setState({ board });

  // Create input handler with solved callback
  const inputHandler = createInputHandler(onPuzzleSolved);
  setInputHandler(inputHandler);

  // Load initial problem
  const initialProblemId = getInitialProblemId(totalProblems);
  const initialProblem = await getProblem(initialProblemId);
  loadProblem(initialProblem, false);
  pushState(initialProblemId);
  preloadAdjacent(initialProblemId);

  // Setup event handlers
  setupNavigationHandlers();
}

export { init };
