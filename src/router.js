// URL and routing logic
import URI from "urijs";
import { state } from "./state.js";

function getUrlParameters() {
  return new URI(window.location.href).search(true);
}

function initUrlParameters() {
  state.urlParameters = getUrlParameters();
}

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

function getInitialProblemId(problems) {
  const totalProblems = problems.length;

  // First check URL parameter
  const urlId = state.urlParameters["id"];
  if (urlId && urlId <= totalProblems && urlId > 0) {
    return parseInt(urlId);
  }

  // Then check localStorage
  const savedId = parseInt(localStorage.getItem("lastProblemId"));
  if (savedId && savedId >= 1 && savedId <= totalProblems) {
    return savedId;
  }

  // Default to problem 1
  return 1;
}

export { getUrlParameters, initUrlParameters, pushState, getInitialProblemId };
