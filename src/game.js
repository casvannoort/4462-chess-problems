// Pure game logic functions (no DOM manipulation)
import { Chess } from "chess.js";

/**
 * Parse move string format "e2-e4" or "e7-e8q" (with promotion)
 * @param {string} move - Move in format "e2-e4" or "e7-e8q"
 * @returns {{source: string, target: string, promotion: string}} Parsed move components
 */
function parseMove(move) {
  const [source, target] = move.split("-");
  const promotion = target.length === 2 ? "q" : target[2];
  return { source, target: target.slice(0, 2), promotion };
}

/**
 * Convert word number to digit (for puzzle types)
 * @param {string} word - Number word like "One", "Two", "Three"
 * @returns {string} Digit string or empty string if not found
 */
function wordToNumber(word) {
  const map = { "One": "1", "Two": "2", "Three": "3" };
  return map[word] || "";
}

/**
 * Get move count from problem type string
 * @param {string} problemType - Type like "Mate in Two"
 * @returns {string} Move count as string (e.g., "2")
 */
function getMoveCount(problemType) {
  const lastWord = problemType.split(" ").pop();
  return wordToNumber(lastWord);
}

/**
 * Get color indicator in Dutch
 * @param {string} firstMove - "White to Move" or "Black to Move"
 * @returns {string} "Wit" or "Zwart"
 */
function getColorIndicator(firstMove) {
  return firstMove === "White to Move" ? "Wit" : "Zwart";
}

/**
 * Check if a move results in checkmate
 * @param {string} fen - Board position in FEN notation
 * @param {string} from - Source square (e.g., "e2")
 * @param {string} to - Target square (e.g., "e4")
 * @param {string|null} promotion - Promotion piece or null
 * @returns {boolean} True if move results in checkmate
 */
function wouldBeCheckmate(fen, from, to, promotion) {
  const testGame = new Chess(fen);
  const moveResult = testGame.move({ from, to, promotion });
  return moveResult && testGame.isCheckmate();
}

/**
 * Create a new chess game from FEN
 * @param {string} fen - Board position in FEN notation
 * @returns {Chess} New chess.js game instance
 */
function createGame(fen) {
  return new Chess(fen);
}

/**
 * Get the turn color ('w' or 'b')
 * @param {Chess} game - chess.js game instance
 * @returns {string} 'w' for white, 'b' for black
 */
function getTurnColor(game) {
  return game.turn();
}

export {
  Chess,
  parseMove,
  wordToNumber,
  getMoveCount,
  getColorIndicator,
  wouldBeCheckmate,
  createGame,
  getTurnColor,
};
