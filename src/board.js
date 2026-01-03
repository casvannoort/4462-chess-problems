// Board setup and configuration
import { Chessboard } from "cm-chessboard";
import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";

/**
 * Create and configure a chessboard instance
 * @param {HTMLElement} element - DOM element to attach the board to
 * @returns {Chessboard} Configured chessboard instance
 */
function createBoard(element) {
  return new Chessboard(element, {
    assetsUrl: "node_modules/cm-chessboard/assets/",
    style: {
      cssClass: "default",
      showCoordinates: true,
      aspectRatio: 1,
    },
    extensions: [
      { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
      { class: PromotionDialog },
    ],
  });
}

export { createBoard };
