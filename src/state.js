// Centralized state management
const state = {
  game: null,
  board: null,
  correctMoves: [],
  currentProblemId: null,
  urlParameters: {},
};

const STORAGE_KEY = "lastProblemId";

function getState() {
  return state;
}

function setState(updates) {
  Object.assign(state, updates);
}

function saveToStorage() {
  if (state.currentProblemId) {
    localStorage.setItem(STORAGE_KEY, state.currentProblemId);
  }
}

function loadFromStorage() {
  const savedId = parseInt(localStorage.getItem(STORAGE_KEY));
  return savedId && savedId >= 1 ? savedId : null;
}

export { state, getState, setState, saveToStorage, loadFromStorage, STORAGE_KEY };
