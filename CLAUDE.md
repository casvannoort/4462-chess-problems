# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Development Commands

### Running the App

The app is served via Docker. After making code changes, rebuild and restart:

```bash
make run    # Rebuilds Docker container and serves at http://localhost:3000
make stop   # Stop the container
make clean  # Stop and remove images
```

**Important:** `npm start` only runs webpack to build assets locally - it does NOT serve the website. The site is always served from Docker on port 3000.

### Build Process

1. Edit source files in `src/`
2. Run `make run` to rebuild the Docker container
3. Refresh browser to see changes

### Puzzle Generation

```bash
make solve  # Runs polgar.py with Stockfish to generate puzzle solutions
```

Requires Stockfish 17+ installed at `/usr/games/stockfish`.

## Architecture

- `src/display.js` - Main orchestrator, handles board setup and move input
- `src/game.js` - Pure chess logic functions (using chess.js)
- `src/ui.js` - DOM manipulation and UI updates
- `src/state.js` - Application state management
- `src/router.js` - URL handling and browser history
- `src/puzzleLoader.js` - Lazy loading of puzzle chunks

## Key Libraries

- **cm-chessboard** - SVG chessboard rendering
- **chess.js** - Chess move validation and game state

## Promotion Handling

cm-chessboard doesn't natively handle pawn promotion display. When a pawn promotes:
1. The library animates the pawn to the promotion square
2. We must call `setPosition(fen, true)` to update the piece type
3. For the final move (checkmate), we return `false` from `validateMoveInput` and handle the board update ourselves to avoid cm-chessboard's animation overwriting our position
