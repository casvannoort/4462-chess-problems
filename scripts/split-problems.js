const fs = require('fs');
const path = require('path');

const CHUNK_SIZE = 100;
const inputFile = path.join(__dirname, '..', 'problems.json');
const outputDir = path.join(__dirname, '..', 'public', 'puzzles');

// Read the problems
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const problems = data.problems;
const totalProblems = problems.length;

// Create output directory
fs.mkdirSync(outputDir, { recursive: true });

// Split into chunks
const chunks = [];
for (let i = 0; i < totalProblems; i += CHUNK_SIZE) {
  const chunkIndex = Math.floor(i / CHUNK_SIZE);
  const chunk = problems.slice(i, i + CHUNK_SIZE);

  const chunkFile = path.join(outputDir, `chunk-${chunkIndex}.json`);
  fs.writeFileSync(chunkFile, JSON.stringify(chunk));

  chunks.push({
    index: chunkIndex,
    start: i + 1,
    end: Math.min(i + CHUNK_SIZE, totalProblems),
    file: `chunk-${chunkIndex}.json`
  });
}

// Create manifest
const manifest = {
  totalProblems,
  chunkSize: CHUNK_SIZE,
  chunks: chunks.length,
  chunkFiles: chunks.map(c => c.file)
};

fs.writeFileSync(
  path.join(outputDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`Split ${totalProblems} problems into ${chunks.length} chunks of ${CHUNK_SIZE}`);
console.log(`Output: ${outputDir}`);
