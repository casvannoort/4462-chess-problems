// Lazy puzzle loading - fetches chunks on demand

/** @typedef {Object} Puzzle
 * @property {number} problemid - Unique puzzle ID
 * @property {string} fen - Board position in FEN notation
 * @property {string} type - Puzzle type (e.g., "Mate in Two")
 * @property {string} first - Who moves first (e.g., "White to Move")
 * @property {Object} solutions - Solution tree
 */

/** @typedef {Object} Manifest
 * @property {number} totalProblems - Total number of puzzles
 * @property {number} chunks - Number of chunk files
 */

const CHUNK_SIZE = 100;
/** @type {Map<number, Puzzle[]>} */
const cache = new Map();
/** @type {Manifest|null} */
let manifest = null;

/**
 * Load puzzle manifest (cached after first load)
 * @returns {Promise<Manifest>} Puzzle manifest
 */
async function loadManifest() {
  if (manifest) return manifest;

  const response = await fetch('/puzzles/manifest.json');
  manifest = await response.json();
  return manifest;
}

/**
 * Calculate chunk index for a problem ID
 * @param {number} problemId - Problem ID (1-based)
 * @returns {number} Chunk index (0-based)
 */
function getChunkIndex(problemId) {
  return Math.floor((problemId - 1) / CHUNK_SIZE);
}

/**
 * Load a chunk of puzzles (cached after first load)
 * @param {number} chunkIndex - Chunk index to load
 * @returns {Promise<Puzzle[]>} Array of puzzles in chunk
 */
async function loadChunk(chunkIndex) {
  if (cache.has(chunkIndex)) {
    return cache.get(chunkIndex);
  }

  const response = await fetch(`/puzzles/chunk-${chunkIndex}.json`);
  const problems = await response.json();
  cache.set(chunkIndex, problems);
  return problems;
}

/**
 * Get a specific puzzle by ID
 * @param {number} problemId - Problem ID to fetch
 * @returns {Promise<Puzzle>} Puzzle data
 */
async function getProblem(problemId) {
  const chunkIndex = getChunkIndex(problemId);
  const problems = await loadChunk(chunkIndex);
  const indexInChunk = (problemId - 1) % CHUNK_SIZE;
  return problems[indexInChunk];
}

/**
 * Get total number of puzzles from manifest
 * @returns {Promise<number>} Total puzzle count
 */
async function getTotalProblems() {
  const m = await loadManifest();
  return m.totalProblems;
}

/**
 * Preload adjacent chunks for smoother navigation
 * @param {number} problemId - Current problem ID
 */
async function preloadAdjacent(problemId) {
  const currentChunk = getChunkIndex(problemId);
  const m = await loadManifest();

  // Preload next chunk
  if (currentChunk + 1 < m.chunks) {
    loadChunk(currentChunk + 1);
  }

  // Preload previous chunk
  if (currentChunk > 0) {
    loadChunk(currentChunk - 1);
  }
}

export { getProblem, getTotalProblems, preloadAdjacent, loadManifest };
