// Centralized state management
import { STORAGE_KEYS } from "./constants.js";

const state = {
  game: null,
  board: null,
  solutions: {},      // { "d5c3": ["e6f6", "e8f8"], ... }
  correctMoves: null, // Set after user's first move
  isFirstMove: true,
  currentProblemId: null,
  urlParameters: {},
};

function getState() {
  return state;
}

function setState(updates) {
  Object.assign(state, updates);
}

function saveToStorage() {
  if (state.currentProblemId) {
    localStorage.setItem(STORAGE_KEYS.LAST_PROBLEM_ID, state.currentProblemId);
  }
}

function loadFromStorage() {
  const savedId = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_PROBLEM_ID));
  return savedId && savedId >= 1 ? savedId : null;
}

export { state, getState, setState, saveToStorage, loadFromStorage };
