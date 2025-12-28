// Pure game logic functions (no DOM manipulation)
import { Chess } from "chess.js";

/**
 * Parse move string format "e2-e4" or "e7-e8q" (with promotion)
 */
function parseMove(move) {
  const [source, target] = move.split("-");
  const promotion = target.length === 2 ? "q" : target[2];
  return { source, target: target.slice(0, 2), promotion };
}

/**
 * Convert word number to digit (for puzzle types)
 */
function wordToNumber(word) {
  const map = { "One": "1", "Two": "2", "Three": "3" };
  return map[word] || "";
}

/**
 * Get move count from problem type string
 */
function getMoveCount(problemType) {
  const lastWord = problemType.split(" ").pop();
  return wordToNumber(lastWord);
}

/**
 * Get color indicator in Dutch
 */
function getColorIndicator(firstMove) {
  return firstMove === "White to Move" ? "Wit" : "Zwart";
}

/**
 * Check if a move results in checkmate
 */
function wouldBeCheckmate(fen, from, to, promotion) {
  const testGame = new Chess(fen);
  const moveResult = testGame.move({ from, to, promotion });
  return moveResult && testGame.isCheckmate();
}

/**
 * Create a new chess game from FEN
 */
function createGame(fen) {
  return new Chess(fen);
}

/**
 * Get the turn color ('w' or 'b')
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
