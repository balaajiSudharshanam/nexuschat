const { listDocs } = require('./store');
const { hybridSearch } = require('./retrieval');
const { gradeAll } = require('./grader');

async function queryRag(query, docName = null) {
  const allDocs = await listDocs();

  const targetDocs = docName
    ? (allDocs.includes(docName) ? [docName] : null)
    : allDocs;

  if (targetDocs === null) return null; // requested doc does not exist
  if (targetDocs.length === 0) return [];

  const qualified = [];

  for (const doc of targetDocs) {
    const candidates = await hybridSearch(query, [doc]);
    if (candidates.length === 0) continue;

    const graded = await gradeAll(candidates, query);
    qualified.push(...graded);
  }

  if (qualified.length === 0) {
    console.warn(`[queryRag] No chunks passed confidence threshold for query: "${query}"`);
    return [];
  }

  const sourceDocs = new Set(qualified.map(c => c.source).filter(Boolean));
  console.log(`[queryRag] Retrieved ${qualified.length} high-confidence chunk(s) from ${sourceDocs.size} document(s)`);

  return qualified;
}

module.exports = { queryRag };
