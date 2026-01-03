// Puzzle navigation and loading
import { COLOR } from "cm-chessboard";

import { state, setState, saveToStorage } from "./state.js";
import { getMoveCount, getColorIndicator, createGame, getTurnColor } from "./game.js";
import { pushState } from "./router.js";
import { getProblem, preloadAdjacent } from "./puzzleLoader.js";
import {
  showPuzzleNav,
  updateTitle,
  updateProblemInput,
  getProblemInputValue,
  setGoButtonHandler,
  setProblemInputHandler,
} from "./ui.js";

let totalProblems = 4462;
let inputHandler = null;

/**
 * Set the total number of problems (from manifest)
 * @param {number} count - Total puzzle count
 */
function setTotalProblems(count) {
  totalProblems = count;
}

/**
 * Set the input handler for move validation
 * @param {Function} handler - Move input handler function
 */
function setInputHandler(handler) {
  inputHandler = handler;
}

// --- Navigation Functions ---

/**
 * Navigate to next puzzle
 */
async function nextProblem() {
  await changeProblem(1);
}

/**
 * Navigate to previous puzzle
 */
async function previousProblem() {
  await changeProblem(-1);
}

/**
 * Change puzzle by relative direction
 * @param {number} direction - +1 for next, -1 for previous
 */
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
  preloadAdjacent(newId).catch(() => {});
}

/**
 * Navigate directly to a specific puzzle by ID
 * @param {number} id - Problem ID to load
 */
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
  preloadAdjacent(id).catch(() => {});
}

// --- Load Problem ---

/**
 * Load and display a puzzle on the board
 * @param {import('./puzzleLoader.js').Puzzle} problem - Puzzle data
 * @param {boolean} [useAnimation=true] - Whether to animate piece placement
 */
function loadProblem(problem, useAnimation = true) {
  showPuzzleNav();

  setState({
    currentProblemId: problem.problemid,
    game: createGame(problem.fen),
    solutions: problem.solutions,
    solutionTree: null,
    isFirstMove: true,
  });

  saveToStorage();

  const moveCount = getMoveCount(problem.type);
  const colorIndicator = getColorIndicator(problem.first);

  updateTitle(problem.problemid, moveCount, colorIndicator);
  updateProblemInput(problem.problemid);

  const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;

  state.board.setOrientation(turnColor);
  state.board.setPosition(problem.fen, useAnimation);
  state.board.enableMoveInput(inputHandler, turnColor);
}

// --- Keyboard Navigation ---

/**
 * Setup keyboard shortcuts for puzzle navigation
 * Arrow keys and Space for next/previous puzzle
 */
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

/**
 * Setup handler for browser back/forward navigation
 */
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

// --- Setup UI Handlers ---

/**
 * Initialize all navigation event handlers
 */
function setupNavigationHandlers() {
  setGoButtonHandler(() => goToProblem(getProblemInputValue()));
  setProblemInputHandler(() => goToProblem(getProblemInputValue()));
  setupKeyboardNavigation();
  setupPopstateHandler();
}

export {
  setTotalProblems,
  setInputHandler,
  nextProblem,
  previousProblem,
  goToProblem,
  loadProblem,
  setupNavigationHandlers,
};
