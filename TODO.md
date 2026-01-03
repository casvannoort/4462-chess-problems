# Refactoring TODO

## Priority 1: Code Organization

### Split `display.js` (393 lines)
The main orchestrator file does too much. Split into:
- `src/board.js` - Board setup, cm-chessboard configuration
- `src/moveHandler.js` - Move validation, promotion handling, input handler
- `src/navigation.js` - Problem navigation (next/prev/goto), keyboard nav
- `src/display.js` - Keep as thin orchestrator that imports and wires everything

### Fix Outdated Comments
- `src/state.js:5-8` - Comment shows old data structure `{ "d5c3": ["e6f6"] }`, should reflect tree structure
- `src/state.js:8` - `correctMoves` field is unused (now using `solutionTree`)

### Fix Broken Utility Script
- `check_puzzle.py:177` - References `puzzle['moves']` which no longer exists (now `solutions` tree)

## Priority 2: File Structure

### Current (flat):
```
.
├── polgar.py
├── check_puzzle.py
├── polgar.pgn
├── problems.json
├── index.js
├── index.html
├── sw.js
├── scripts/split-problems.js
└── src/
```

### Proposed:
```
.
├── solver/
│   ├── polgar.py
│   ├── check_puzzle.py
│   └── polgar.pgn
├── public/
│   ├── index.html
│   ├── sw.js
│   ├── fonts/
│   ├── icons/
│   └── puzzles/
├── src/
│   ├── index.js (entry point)
│   ├── board.js
│   ├── moveHandler.js
│   ├── navigation.js
│   ├── display.js
│   ├── game.js
│   ├── puzzleLoader.js
│   ├── quotes.js
│   ├── router.js
│   ├── state.js
│   ├── ui.js
│   ├── constants.js
│   └── styles.css
├── scripts/
│   └── split-problems.js
└── data/
    └── problems.json
```

Benefits:
- Python solver code isolated in `solver/`
- Static assets consolidated in `public/`
- Entry point moved to `src/`
- Generated data in `data/`

## Priority 3: Python Code Improvements

### Dependency Management
No `requirements.txt` or `pyproject.toml` exists. Create one:
```
# requirements.txt
python-chess>=1.999
python-dotenv>=1.0.0
```

Or modern `pyproject.toml`:
```toml
[project]
name = "chess-puzzle-solver"
version = "1.0.0"
dependencies = [
    "python-chess>=1.999",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = ["ruff", "pytest"]
```

### Code Duplication
`parse_mate_count()` is duplicated in both Python files:
- `polgar.py:29-41`
- `check_puzzle.py:34-45`

Extract to shared module:
```
solver/
├── __init__.py
├── polgar.py
├── check_puzzle.py
├── utils.py          # Shared: parse_mate_count, title_case
└── polgar.pgn
```

### Type Hints
Add type hints to Python functions for better IDE support:
```python
# Current
def parse_mate_count(move_type):
    ...

# Proposed
def parse_mate_count(move_type: str) -> int | None:
    ...

def solve_puzzle(puzzle_data: tuple) -> dict:
    ...
```

### Error Handling
`polgar.py:180` has bare `except:` - should catch specific exceptions:
```python
# Current
except:
    pass

# Proposed
except (ValueError, chess.InvalidMoveError):
    pass
```

### Nested Functions
`polgar.py` has deeply nested functions inside `solve_puzzle()`:
- `add_line_to_tree()` (line 135)
- `find_alt_promotions()` (line 163)

These could be module-level functions for better testability.

### Simplify check_puzzle.py
Uses raw subprocess + threading for Stockfish communication (lines 53-107).
Could use `python-chess` engine API like `polgar.py` does:
```python
# Current: 60 lines of subprocess/threading code
proc = subprocess.Popen([STOCKFISH_PATH], ...)
# ... complex queue/thread management

# Proposed: 5 lines with python-chess
engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
info = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=multipv)
engine.quit()
```

### Logging
Replace `print(..., file=sys.stderr)` with proper logging:
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Current
print(f"Solving with {args.workers} workers...", file=sys.stderr)

# Proposed
logger.info(f"Solving with {args.workers} workers...")
```

### Add Python Linting
Add `ruff` or `flake8` configuration:
```toml
# pyproject.toml
[tool.ruff]
line-length = 100
select = ["E", "F", "W", "I"]
```

### Python Tests
Create test structure:
```
solver/
├── tests/
│   ├── test_polgar.py
│   └── test_utils.py
```

Test targets:
- `parse_mate_count()` - Easy unit tests
- `title_case()` - Easy unit tests
- `extract_pgn_moves()` - Test with sample PGN
- `add_line_to_tree()` - Test tree building logic

## Priority 4: Code Quality (JavaScript)

### Remove Hardcoded Values
- `display.js:25` - `let totalProblems = 4462` should come from manifest only

### State Management Cleanup
Remove unused fields from state.js:
```javascript
// Current
const state = {
  solutions: {},      // Used
  correctMoves: null, // UNUSED - remove
  isFirstMove: true,  // Used
  solutionTree: ???,  // Missing from initial state
};

// Proposed
const state = {
  solutions: {},      // Tree: { "move": { "opp": { "mate": {} } } }
  solutionTree: null, // Current position in solution tree
  isFirstMove: true,
};
```

### Add JSDoc Comments
Key functions lack documentation:
- `inputHandler()` - Complex validation logic needs explanation
- `isTerminalNode()` / `getFirstMove()` - Tree navigation helpers
- `loadProblem()` - Parameters and behavior

## Priority 4: Developer Experience

### Add TypeScript (Optional)
Benefits:
- Type safety for puzzle data structure
- Better IDE support
- Catch errors at compile time

Start with types file:
```typescript
// src/types.ts
interface Puzzle {
  problemid: number;
  first: string;
  type: string;
  fen: string;
  solutions: SolutionTree;
}

type SolutionTree = { [move: string]: SolutionTree };
```

### Add Tests
Create test structure:
```
tests/
├── game.test.js      # Pure functions, easy to test
├── router.test.js    # URL parsing logic
├── state.test.js     # State management
└── puzzleLoader.test.js
```

Priority test targets:
1. `game.js` - All pure functions
2. `router.js` - URL parameter parsing
3. Tree navigation helpers in display.js

### Add .env.example
```env
STOCKFISH_PATH=/usr/games/stockfish
```

## Priority 5: Performance & Build

### Webpack Improvements
- Consider code splitting for cm-chessboard (already done with chunks)
- Add bundle analyzer to monitor size
- Consider lazy loading quotes.js

### Service Worker
- `sw.js` in root is copied by Dockerfile, not webpack
- Consider using workbox for better PWA caching
- Add version/cache invalidation strategy

## Priority 6: Build & Config Files

### Makefile Improvements
Current targets are minimal. Consider adding:
```makefile
# Python
.PHONY: lint-py test-py
lint-py:
	ruff check solver/

test-py:
	pytest solver/tests/

# JavaScript
.PHONY: lint-js test-js
lint-js:
	npm run lint

test-js:
	npm test

# Combined
.PHONY: lint test
lint: lint-py lint-js
test: test-py test-js

# Development
.PHONY: dev
dev:
	npm run dev  # If using webpack-dev-server
```

### Dockerfile Improvements
Current Dockerfile works but could be optimized:
- Add `.dockerignore` to exclude `.venv`, `node_modules`, `.git`
- Consider multi-stage build for smaller image
- Pin nginx version for reproducibility

```dockerfile
# .dockerignore
.venv/
node_modules/
.git/
*.pyc
__pycache__/
problems.json
```

### Add Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.50.0
    hooks:
      - id: eslint
```

### Environment Configuration
Create `.env.example`:
```env
# Stockfish engine path
STOCKFISH_PATH=/usr/games/stockfish

# Optional: Number of parallel workers for solver
# SOLVER_WORKERS=8
```

### GitHub Actions (Optional)
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - uses: actions/setup-node@v4
      - run: pip install ruff
      - run: npm ci
      - run: ruff check .
      - run: npm run lint
```

## Low Priority / Nice to Have

### Internationalization
Currently hardcoded Dutch strings in:
- `ui.js` - "Wit", "Zwart", "GG!"
- `quotes.js` - Mixed Dutch/English quotes
- `index.html` - All Dutch UI text

Could extract to `src/i18n/nl.js` for future multi-language support.

### Accessibility
- Add aria-live announcements for puzzle state changes
- Keyboard shortcuts documentation (←/→/Space)
- Screen reader support for chess moves

### Documentation
- Add JSDoc to all exported functions
- Generate API docs from JSDoc
- Document puzzle JSON schema

## Migration Checklist

### Quick Wins (< 30 min total)
- [x] Fix `state.js` comments and unused fields (5 min)
- [x] Fix `check_puzzle.py` broken reference (10 min)
- [x] Add `requirements.txt` for Python deps (5 min)
- [x] Add `.env.example` with STOCKFISH_PATH (2 min)
- [x] Fix bare `except:` in polgar.py (2 min)

### Medium Effort (1-2 hours each)
- [ ] Extract shared Python utils to `solver/utils.py`
- [ ] Simplify `check_puzzle.py` to use python-chess engine API
- [ ] Split `display.js` into modules
- [ ] Add type hints to Python functions

### Larger Refactoring (half day+)
- [ ] Reorganize folder structure (update all imports)
- [ ] Add Python tests with pytest
- [ ] Add JavaScript tests with Jest/Vitest
- [ ] Add `.dockerignore` file
- [ ] Consider TypeScript migration (optional)
