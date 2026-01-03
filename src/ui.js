// UI/DOM manipulation functions
import { getRandomQuote } from "./quotes.js";
import { DOM_IDS } from "./constants.js";

/** @typedef {Object} CachedElements
 * @property {HTMLElement} board
 * @property {HTMLElement} boardWrapper
 * @property {HTMLElement} problemTitle
 * @property {HTMLInputElement} problemInput
 * @property {HTMLElement} nextBtn
 * @property {HTMLElement} puzzleNav
 * @property {HTMLElement} goBtn
 * @property {HTMLElement} quoteToast
 * @property {HTMLElement} quoteText
 */

/** @type {CachedElements|null} */
let elements = null;

/**
 * Cache DOM elements for faster access
 * @returns {CachedElements} Cached DOM element references
 */
function cacheElements() {
  elements = {
    board: document.getElementById(DOM_IDS.BOARD),
    boardWrapper: document.getElementById(DOM_IDS.BOARD_WRAPPER),
    problemTitle: document.getElementById(DOM_IDS.PROBLEM_TITLE),
    problemInput: document.getElementById(DOM_IDS.PROBLEM_INPUT),
    nextBtn: document.getElementById(DOM_IDS.NEXT_BTN),
    puzzleNav: document.getElementById(DOM_IDS.PUZZLE_NAV),
    goBtn: document.getElementById(DOM_IDS.GO_BTN),
    quoteToast: document.getElementById(DOM_IDS.QUOTE_TOAST),
    quoteText: document.getElementById(DOM_IDS.QUOTE_TEXT),
  };
  return elements;
}

/**
 * Get cached DOM elements (caches on first call)
 * @returns {CachedElements} Cached DOM element references
 */
function getElements() {
  return elements || cacheElements();
}

/**
 * Show a toast with a random quote
 * @param {boolean} isSuccess - True for success quote, false for error
 */
function showQuote(isSuccess) {
  const { quoteToast, quoteText } = getElements();
  const quote = getRandomQuote(isSuccess);

  if (quoteToast && quoteText) {
    quoteText.textContent = quote;
    quoteToast.dataset.type = isSuccess ? "success" : "error";
    quoteToast.dataset.visible = "true";

    setTimeout(() => {
      quoteToast.dataset.visible = "false";
    }, 2500);
  }
}

/**
 * Show an error message toast
 * @param {string} message - Error message to display
 */
function showError(message) {
  const { quoteToast, quoteText } = getElements();

  if (quoteToast && quoteText) {
    quoteText.textContent = message;
    quoteToast.dataset.type = "error";
    quoteToast.dataset.visible = "true";

    setTimeout(() => {
      quoteToast.dataset.visible = "false";
    }, 4000);
  }
}

/**
 * Update the puzzle title display
 * @param {number} problemId - Current problem ID
 * @param {string} moveCount - Number of moves (e.g., "2")
 * @param {string} colorIndicator - "Wit" or "Zwart"
 */
function updateTitle(problemId, moveCount, colorIndicator) {
  const { problemTitle } = getElements();
  const isWhite = colorIndicator === "Wit";
  const textStyle = isWhite
    ? "color: white; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"
    : "color: black; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;";
  const circleStyle = isWhite
    ? "background: white; box-shadow: 0 0 0 1px #000;"
    : "background: #1a1a1a; box-shadow: 0 0 0 1px #fff;";

  const title = `<span class="text-mc-emerald">#${problemId}</span> Mat in ${moveCount} · <span style="${textStyle}"><span class="inline-block w-3 h-3 rounded-full" style="${circleStyle} vertical-align: 2px;"></span>&nbsp;${colorIndicator}</span>`;
  problemTitle.innerHTML = title;
  document.title = `#${problemId}`;
}

/**
 * Update UI to show puzzle solved state with celebration effect
 */
function showSolvedState() {
  const { problemTitle, nextBtn, puzzleNav, boardWrapper } = getElements();

  // Show next button, hide navigation
  nextBtn.classList.remove("hidden");
  puzzleNav.classList.add("hidden");

  // Update title with solved badge
  const titleParts = problemTitle.innerHTML.split(" · ");
  problemTitle.innerHTML = titleParts[0] + ' · <span class="text-mc-emerald success-badge inline-block">GG!</span>';

  // Celebration effect
  if (boardWrapper) {
    boardWrapper.classList.add("solved-celebration");
    setTimeout(() => boardWrapper.classList.remove("solved-celebration"), 500);
  }
}

/**
 * Show puzzle navigation controls (hide next button)
 */
function showPuzzleNav() {
  const { nextBtn, puzzleNav } = getElements();
  nextBtn.classList.add("hidden");
  puzzleNav.classList.remove("hidden");
}

/**
 * Update the problem input field value
 * @param {number} problemId - Problem ID to display
 */
function updateProblemInput(problemId) {
  const { problemInput } = getElements();
  problemInput.value = problemId;
}

/**
 * Get the current value from problem input field
 * @returns {number} Parsed problem ID
 */
function getProblemInputValue() {
  const { problemInput } = getElements();
  return parseInt(problemInput.value);
}

/**
 * Set click handler for next button
 * @param {Function} handler - Click handler function
 */
function setNextButtonHandler(handler) {
  const { nextBtn } = getElements();
  nextBtn.onclick = handler;
}

/**
 * Set click handler for go button
 * @param {Function} handler - Click handler function
 */
function setGoButtonHandler(handler) {
  const { goBtn } = getElements();
  goBtn.onclick = handler;
}

/**
 * Set Enter key handler for problem input
 * @param {Function} handler - Handler called on Enter key
 */
function setProblemInputHandler(handler) {
  const { problemInput } = getElements();
  problemInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      handler();
    }
  };
}

export {
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
};
