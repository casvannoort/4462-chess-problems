// Centralized state management
import { STORAGE_KEYS } from "./constants.js";

/**
 * @typedef {Object} AppState
 * @property {import('chess.js').Chess|null} game - Current chess.js game instance
 * @property {import('cm-chessboard').Chessboard|null} board - Chessboard instance
 * @property {Object} solutions - Solution tree: { "move": { "opp": { "mate": {} } } }
 * @property {Object|null} solutionTree - Current position in solution tree (set after first move)
 * @property {boolean} isFirstMove - Whether waiting for first move
 * @property {number|null} currentProblemId - Current puzzle ID
 * @property {Object} urlParameters - URL query parameters
 */

/** @type {AppState} */
const state = {
  game: null,
  board: null,
  solutions: {},
  solutionTree: null,
  isFirstMove: true,
  currentProblemId: null,
  urlParameters: {},
};

/**
 * Get the current application state
 * @returns {AppState} Current state object
 */
function getState() {
  return state;
}

/**
 * Update application state with new values
 * @param {Partial<AppState>} updates - State properties to update
 */
function setState(updates) {
  Object.assign(state, updates);
}

/**
 * Save current problem ID to localStorage
 */
function saveToStorage() {
  if (state.currentProblemId) {
    localStorage.setItem(STORAGE_KEYS.LAST_PROBLEM_ID, state.currentProblemId);
  }
}

/**
 * Load saved problem ID from localStorage
 * @returns {number|null} Saved problem ID or null if not found
 */
function loadFromStorage() {
  const savedId = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_PROBLEM_ID));
  return savedId && savedId >= 1 ? savedId : null;
}

export { state, getState, setState, saveToStorage, loadFromStorage };
