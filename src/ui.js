// UI/DOM manipulation functions
import { getRandomQuote } from "./quotes.js";
import { DOM_IDS } from "./constants.js";

// Cache DOM elements
let elements = null;

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

function getElements() {
  return elements || cacheElements();
}

function showQuote(isSuccess) {
  const { quoteToast, quoteText } = getElements();
  const quote = getRandomQuote(isSuccess);

  if (quoteToast && quoteText) {
    quoteText.textContent = quote;
    quoteToast.className = isSuccess
      ? "fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 z-50 bg-fun-green text-white"
      : "fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 z-50 bg-fun-yellow text-slate-800";
    quoteToast.style.opacity = "1";
    quoteToast.style.transform = "translateX(-50%) translateY(0)";

    setTimeout(() => {
      quoteToast.style.opacity = "0";
      quoteToast.style.transform = "translateX(-50%) translateY(-16px)";
    }, 2500);
  }
}

function updateTitle(problemId, moveCount, colorIndicator) {
  const { problemTitle } = getElements();
  const title = `<span class="text-slate-400">#${problemId}</span> Mat in ${moveCount} · <span class="text-accent-blue">${colorIndicator}</span>`;
  problemTitle.innerHTML = title;
  document.title = `#${problemId}`;
}

function showSolvedState() {
  const { problemTitle, nextBtn, puzzleNav, boardWrapper } = getElements();

  // Show next button, hide navigation
  nextBtn.style.display = "";
  puzzleNav.style.display = "none";

  // Update title with solved badge
  const titleParts = problemTitle.innerHTML.split(" · ");
  problemTitle.innerHTML = titleParts[0] + ' · <span class="text-success-600 success-badge inline-block">✓ Opgelost!</span>';

  // Celebration effect
  if (boardWrapper) {
    boardWrapper.classList.add("solved-celebration");
    setTimeout(() => boardWrapper.classList.remove("solved-celebration"), 500);
  }
}

function showPuzzleNav() {
  const { nextBtn, puzzleNav } = getElements();
  nextBtn.style.display = "none";
  puzzleNav.style.display = "";
}

function updateProblemInput(problemId) {
  const { problemInput } = getElements();
  problemInput.value = problemId;
}

function getProblemInputValue() {
  const { problemInput } = getElements();
  return parseInt(problemInput.value);
}

function setNextButtonHandler(handler) {
  const { nextBtn } = getElements();
  nextBtn.onclick = handler;
}

function setGoButtonHandler(handler) {
  const { goBtn } = getElements();
  goBtn.onclick = handler;
}

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
  updateTitle,
  showSolvedState,
  showPuzzleNav,
  updateProblemInput,
  getProblemInputValue,
  setNextButtonHandler,
  setGoButtonHandler,
  setProblemInputHandler,
};
