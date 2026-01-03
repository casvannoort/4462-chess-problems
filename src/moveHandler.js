// Move validation and handling logic
import { INPUT_EVENT_TYPE, COLOR } from "cm-chessboard";
import { PROMOTION_DIALOG_RESULT_TYPE } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";

import { state, setState } from "./state.js";
import { wouldBeCheckmate, getTurnColor } from "./game.js";
import { showQuote, announce } from "./ui.js";

// --- Tree Navigation Helpers ---

/**
 * Check if a tree node is terminal (empty object = end of solution)
 * @param {Object} tree - Solution tree node
 * @returns {boolean} True if node has no children
 */
function isTerminalNode(tree) {
  return tree && Object.keys(tree).length === 0;
}

/**
 * Get the first move from a solution tree node
 * @param {Object} tree - Solution tree node
 * @returns {string|null} First move key or null if empty
 */
function getFirstMove(tree) {
  const moves = Object.keys(tree);
  return moves.length > 0 ? moves[0] : null;
}

// --- Promotion Detection ---

/**
 * Check if a move is a pawn promotion
 * @param {import('chess.js').Chess} game - Chess game instance
 * @param {string} from - Source square
 * @param {string} to - Target square
 * @returns {boolean} True if move promotes a pawn
 */
function isPromotionMove(game, from, to) {
  const piece = game.get(from);
  if (!piece || piece.type !== 'p') return false;
  const targetRank = to.charAt(1);
  return targetRank === '8' || targetRank === '1';
}

// --- Move Execution ---

/**
 * Execute the opponent's response move from solution tree
 */
function makeOpponentMove() {
  const move = getFirstMove(state.solutionTree);
  if (!move) return;

  const source = move.slice(0, 2);
  const target = move.slice(2, 4);
  const promotion = move.length > 4 ? move[4] : undefined;

  state.game.move({ from: source, to: target, promotion });
  state.board.movePiece(source, target, true).then(() => {
    state.board.setPosition(state.game.fen(), false);
    setState({ solutionTree: state.solutionTree[move] });
  });
}

// --- Input Handler Factory ---

/**
 * Create the input handler for the chessboard
 * @param {Function} onPuzzleSolved - Callback when puzzle is solved
 * @returns {Function} Input handler function
 */
function createInputHandler(onPuzzleSolved) {
  return function inputHandler(event) {
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      return true;
    }

    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      try {
        const src = event.squareFrom;
        const tgt = event.squareTo;

        if (state.game.isCheckmate()) {
          return false;
        }

        // Check if the move is even legal in chess
        const testMove = state.game.move({ from: src, to: tgt, promotion: 'q' });
        if (!testMove) {
          return false;
        }
        state.game.undo();

        const userMoveBase = src + tgt;

        // --- FIRST MOVE: check against solution tree root ---
        if (state.isFirstMove) {
          if (isPromotionMove(state.game, src, tgt)) {
            const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;
            state.board.showPromotionDialog(tgt, turnColor, (result) => {
              if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
                const selectedPromotion = result.piece.charAt(1);
                const userMove = userMoveBase + selectedPromotion;

                if (state.solutions[userMove]) {
                  state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
                  const nextTree = state.solutions[userMove];
                  setState({
                    solutionTree: nextTree,
                    isFirstMove: false,
                  });
                  state.board.setPosition(state.game.fen(), true);

                  if (isTerminalNode(nextTree)) {
                    onPuzzleSolved();
                  } else {
                    setTimeout(makeOpponentMove, 500);
                  }
                } else {
                  showQuote(false);
                  announce("Fout, probeer opnieuw");
                  state.board.setPosition(state.game.fen(), false);
                }
              } else {
                state.board.setPosition(state.game.fen(), false);
              }
            });
            return false;
          }

          // Non-promotion first move
          if (state.solutions[userMoveBase]) {
            state.game.move({ from: src, to: tgt });
            const nextTree = state.solutions[userMoveBase];
            setState({
              solutionTree: nextTree,
              isFirstMove: false,
            });

            if (isTerminalNode(nextTree)) {
              state.board.setPosition(state.game.fen(), true);
              onPuzzleSolved();
              return false;
            } else {
              setTimeout(makeOpponentMove, 500);
              return true;
            }
          } else {
            showQuote(false);
            announce("Fout, probeer opnieuw");
            return false;
          }
        }

        // --- SUBSEQUENT MOVES: validate against current tree level ---
        if (!state.solutionTree) {
          return false;
        }

        const validMoves = Object.keys(state.solutionTree);
        const isLastMove = validMoves.every(m => isTerminalNode(state.solutionTree[m]));

        if (isPromotionMove(state.game, src, tgt)) {
          const turnColor = getTurnColor(state.game) === 'w' ? COLOR.white : COLOR.black;
          state.board.showPromotionDialog(tgt, turnColor, (result) => {
            if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
              const selectedPromotion = result.piece.charAt(1);
              const userMove = userMoveBase + selectedPromotion;

              if (isLastMove) {
                if (state.solutionTree[userMove] || wouldBeCheckmate(state.game.fen(), src, tgt, selectedPromotion)) {
                  state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
                  state.board.setPosition(state.game.fen(), true);
                  onPuzzleSolved();
                } else {
                  showQuote(false);
                  announce("Fout, probeer opnieuw");
                  state.board.setPosition(state.game.fen(), false);
                }
              } else {
                if (state.solutionTree[userMove]) {
                  state.game.move({ from: src, to: tgt, promotion: selectedPromotion });
                  setState({ solutionTree: state.solutionTree[userMove] });
                  state.board.setPosition(state.game.fen(), true);
                  setTimeout(makeOpponentMove, 500);
                } else {
                  showQuote(false);
                  announce("Fout, probeer opnieuw");
                  state.board.setPosition(state.game.fen(), false);
                }
              }
            } else {
              state.board.setPosition(state.game.fen(), false);
            }
          });
          return false;
        }

        // Non-promotion subsequent move
        if (isLastMove) {
          if (state.solutionTree[userMoveBase] || wouldBeCheckmate(state.game.fen(), src, tgt, null)) {
            state.game.move({ from: src, to: tgt });
            state.board.setPosition(state.game.fen(), true);
            onPuzzleSolved();
            return false;
          } else {
            showQuote(false);
            announce("Fout, probeer opnieuw");
            return false;
          }
        } else {
          if (state.solutionTree[userMoveBase]) {
            state.game.move({ from: src, to: tgt });
            setState({ solutionTree: state.solutionTree[userMoveBase] });
            setTimeout(makeOpponentMove, 500);
            return true;
          } else {
            showQuote(false);
            announce("Fout, probeer opnieuw");
            return false;
          }
        }
      } catch (error) {
        console.error("Move validation error:", error);
        return false;
      }
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
      state.board.setPosition(state.game.fen(), false);
    }
  };
}

export { createInputHandler, isTerminalNode, getFirstMove };
