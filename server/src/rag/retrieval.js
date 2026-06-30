const { searchIndex, getTextChunks } = require('./store');
const bm25 = require('./bm25');

const VECTOR_THRESHOLD = 0.2;
const BM25_THRESHOLD = 0.2;

function rrfMerge(rankedLists, k = 60) {
  const scores = new Map();
  const sourceMap = new Map();
  for (const list of rankedLists) {
    list.forEach(({ text, source }, rank) => {
      scores.set(text, (scores.get(text) || 0) + 1 / (k + rank + 1));
      if (source) sourceMap.set(text, source);
    });
  }
  return Array.from(scores.entries())
    .map(([text, score]) => ({ text, score, source: sourceMap.get(text) }))
    .sort((a, b) => b.score - a.score);
}

async function searchDoc(docName, queryVector, query, topK) {
  let vectorResults = [];

  if (queryVector) {
    try {
      const raw = await searchIndex(docName, queryVector, topK);
      vectorResults = raw
        .filter(r => r.score >= VECTOR_THRESHOLD)
        .map(r => ({ ...r, source: docName }));
      console.log(
        `[RETRIEVAL] "${docName}" vector: ${raw.length} raw → ${vectorResults.length} kept` +
        ` (threshold: ${VECTOR_THRESHOLD}, rejected: ${raw.length - vectorResults.length})`
      );
    } catch (err) {
      console.error(`[RETRIEVAL] Vector search failed for "${docName}": ${err.message}`);
    }
  } else {
    console.log(`[RETRIEVAL] "${docName}" vector: skipped (embedding unavailable)`);
  }

  const chunks = getTextChunks(docName);
  const rawBm25 = bm25.search(chunks, query, topK);
  const bm25Results = rawBm25
    .filter(r => r.score >= BM25_THRESHOLD)
    .map(r => ({ ...r, source: docName }));
  console.log(
    `[RETRIEVAL] "${docName}" BM25: ${rawBm25.length} raw → ${bm25Results.length} kept` +
    ` (threshold: ${BM25_THRESHOLD}, rejected: ${rawBm25.length - bm25Results.length})`
  );

  const merged = rrfMerge([vectorResults, bm25Results]).slice(0, topK);
  console.log(
    `[RETRIEVAL] "${docName}" RRF merge: ${vectorResults.length} vector + ${bm25Results.length} BM25 → ${merged.length} merged`
  );

  return merged;
}

async function hybridSearch(query, docNames, topK = 10) {
  const { embed } = require('../llm/ollama'); // lazy — breaks circular dep

  const queryPreview = query.length > 60 ? `${query.slice(0, 60)}...` : query;

  let queryVector = null;
  try {
    queryVector = await embed(query);
    console.log(`[RETRIEVAL] Embedding ready for query: "${queryPreview}"`);
  } catch (err) {
    console.error(`[RETRIEVAL] Embedding failed — falling back to BM25 only: ${err.message}`);
  }

  const perDocResults = await Promise.all(
    docNames.map(d =>
      searchDoc(d, queryVector, query, topK).catch(err => {
        console.error(`[RETRIEVAL] searchDoc failed for "${d}": ${err.message}`);
        return [];
      })
    )
  );

  const grouped = new Map();
  for (const results of perDocResults) {
    for (const chunk of results) {
      if (!grouped.has(chunk.source)) grouped.set(chunk.source, []);
      grouped.get(chunk.source).push(chunk);
    }
  }

  const flat = Array.from(grouped.values())
    .flatMap(chunks => chunks.sort((a, b) => b.score - a.score));

  const sourceList = [...grouped.keys()].join(', ') || 'none';
  console.log(`[RETRIEVAL] Total candidates: ${flat.length} across ${grouped.size} doc(s) — [${sourceList}]`);

  return flat;
}

module.exports = { hybridSearch };
