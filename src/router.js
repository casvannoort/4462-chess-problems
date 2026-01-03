// URL and routing logic
import URI from "urijs";
import { state } from "./state.js";
import { STORAGE_KEYS } from "./constants.js";

/**
 * Parse URL query parameters
 * @returns {Object} Query parameters as key-value pairs
 */
function getUrlParameters() {
  return new URI(window.location.href).search(true);
}

/**
 * Initialize URL parameters in application state
 */
function initUrlParameters() {
  state.urlParameters = getUrlParameters();
}

/**
 * Push new problem ID to browser history
 * @param {number} problemId - Problem ID to add to URL
 */
function pushState(problemId) {
  if (window.history && window.history.pushState && "o" in state.urlParameters) {
    state.urlParameters["id"] = problemId;
    if (window.history.state && window.history.state["id"] === problemId) {
      return;
    }
    window.history.pushState(
      state.urlParameters,
      "",
      new URI(window.location.href).search(state.urlParameters).toString()
    );
  }
}

/**
 * Determine initial problem ID from URL, localStorage, or default
 * @param {number} totalProblems - Total number of available problems
 * @returns {number} Initial problem ID to load
 */
function getInitialProblemId(totalProblems) {
  // First check URL parameter
  const urlId = state.urlParameters["id"];
  if (urlId && urlId <= totalProblems && urlId > 0) {
    return parseInt(urlId);
  }

  // Then check localStorage
  const savedId = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_PROBLEM_ID));
  if (savedId && savedId >= 1 && savedId <= totalProblems) {
    return savedId;
  }

  // Default to problem 1
  return 1;
}

export { getUrlParameters, initUrlParameters, pushState, getInitialProblemId };
