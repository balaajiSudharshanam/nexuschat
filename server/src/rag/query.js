const { searchIndex, listDocs, getTextChunks } = require('./store');
const bm25 = require('./bm25');
const { gradeAll } = require('./grader');

// Reciprocal Rank Fusion — merges ranked lists from multiple retrievers
function rrfMerge(rankedLists, k = 60) {
  const scores = new Map();
  for (const list of rankedLists) {
    list.forEach(({ text }, rank) => {
      scores.set(text, (scores.get(text) || 0) + 1 / (k + rank + 1));
    });
  }
  return Array.from(scores.entries())
    .map(([text, score]) => ({ text, score }))
    .sort((a, b) => b.score - a.score);
}

async function hybridSearch(query, docNames, topK = 10) {
  const { embed } = require('../llm/ollama'); // lazy — breaks circular dep

  // Vector search
  let vectorResults = [];
  try {
    const queryVector = await embed(query);
    const perDoc = await Promise.all(docNames.map(d => searchIndex(d, queryVector)));
    vectorResults = perDoc.flat().sort((a, b) => b.score - a.score).slice(0, topK);
  } catch {}

  // BM25 search across all chunks from the specified docs
  const allChunks = docNames.flatMap(d => getTextChunks(d));
  const bm25Results = bm25.search(allChunks, query, topK);

  // Merge both ranked lists with RRF
  return rrfMerge([vectorResults, bm25Results]).slice(0, topK);
}

async function queryRag(query, docName = null) {
  if (docName) {
    const docs = await listDocs();
    if (!docs.includes(docName)) return null;
    const merged = await hybridSearch(query, [docName]);
    return gradeAll(merged, query);
  }

  const docs = await listDocs();
  if (docs.length === 0) return [];

  const merged = await hybridSearch(query, docs);
  return gradeAll(merged, query);
}

module.exports = { queryRag };
