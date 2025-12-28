# Refactoring TODO

## 1. Code Architecture

- [x] **Split display.js into modules** - Separate into `game.js`, `ui.js`, `quotes.js`, `router.js`
- [x] **Create single state object** - Replace global `var game, correct_moves, currentProblemId, board` with state pattern
- [x] **Separate pure functions from side effects** - Game logic shouldn't touch DOM directly

## 2. JavaScript Quality

- [x] **Replace var with const/let** - Lines 81-84, 224 still use `var`
- [x] **Cache DOM element references** - Stop querying `document.querySelector("#problem-title")` multiple times
- [x] **Create DOM_IDS constants** - Replace magic strings like `"next-btn"`, `"puzzle-nav"`
- [x] **Use problems.length** - Replace hardcoded `TOTAL_PROBLEMS = 4462`
- [x] **Upgrade chess.js to v1.x** - Remove import hack `ChessModule.Chess || ChessModule.default`

## 3. Performance

- [ ] **Lazy-load puzzles** - Don't bundle all 670KB JSON at startup, paginate or load on demand
- [ ] **Build Tailwind at compile time** - Replace CDN with PurgeCSS build (~10KB vs full framework)
- [ ] **Add service worker** - Enable offline support for PWA
- [ ] **Code splitting** - Split vendor chunks from main bundle (currently 744KB)

## 4. Build System

- [ ] **Use HtmlWebpackPlugin** - Remove Dockerfile `sed` hack for hash replacement
- [ ] **Separate webpack configs** - Create dev/prod configs with `webpack-merge`
- [ ] **Enable source maps** - Add for development, optional for production

## 5. UI/UX

- [ ] **Remove inline styles** - Replace `style="display:none"` with `hidden` class
- [ ] **CSS-only toast animation** - Use `data-visible` attribute instead of JS class manipulation
- [ ] **Add loading skeleton** - Replace "Laden..." text with skeleton UI
- [ ] **Add error feedback** - Show error toast if puzzle fails to load

## 6. Accessibility

- [ ] **Add ARIA labels** - `aria-label="Volgende puzzel"` on buttons
- [ ] **Add live regions** - `aria-live="polite"` for puzzle solved announcements
- [ ] **Add focus indicators** - `focus-visible:ring-2` on custom buttons
- [ ] **Add skip link** - Skip to main content for keyboard users

## 7. Data Structure

- [ ] **Simplify problem format** - Change `"first": "White to Move"` to `"white": true`
- [ ] **Use standard notation** - Change `"f6-g7"` to algebraic `"Qg7#"`

## 8. Developer Experience

- [ ] **Add TypeScript** - Type safety for game logic and state
- [ ] **Add ESLint/Prettier** - Code style enforcement with pre-commit hooks
- [ ] **Add unit tests** - Vitest for game logic (move validation, checkmate detection)
- [ ] **Update package.json** - Fix repo URL and metadata

## 9. Security

- [ ] **Add CSP headers** - Content-Security-Policy in nginx.conf
- [ ] **Self-host Tailwind** - Remove external CDN dependency

---

## Quick Wins (< 1 hour each)

- [x] Replace `var` with `const`/`let`
- [x] Use `problems.length` instead of hardcoded 4462
- [x] Cache DOM element references
- [ ] Add `aria-label` to buttons
- [ ] Replace inline `style="display:none"` with `hidden` class

## Bigger Refactors

- [x] Split display.js into modules
- [ ] Add HtmlWebpackPlugin
- [ ] Implement puzzle lazy-loading
- [ ] Build Tailwind at compile time
- [ ] Add service worker for offline
