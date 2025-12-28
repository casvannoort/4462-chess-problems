// Lazy puzzle loading - fetches chunks on demand

const CHUNK_SIZE = 100;
const cache = new Map();
let manifest = null;

async function loadManifest() {
  if (manifest) return manifest;

  const response = await fetch('/puzzles/manifest.json');
  manifest = await response.json();
  return manifest;
}

function getChunkIndex(problemId) {
  return Math.floor((problemId - 1) / CHUNK_SIZE);
}

async function loadChunk(chunkIndex) {
  if (cache.has(chunkIndex)) {
    return cache.get(chunkIndex);
  }

  const response = await fetch(`/puzzles/chunk-${chunkIndex}.json`);
  const problems = await response.json();
  cache.set(chunkIndex, problems);
  return problems;
}

async function getProblem(problemId) {
  const chunkIndex = getChunkIndex(problemId);
  const problems = await loadChunk(chunkIndex);
  const indexInChunk = (problemId - 1) % CHUNK_SIZE;
  return problems[indexInChunk];
}

async function getTotalProblems() {
  const m = await loadManifest();
  return m.totalProblems;
}

// Preload adjacent chunks for smoother navigation
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
