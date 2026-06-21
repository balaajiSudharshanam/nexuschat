const path = require('path');
const config = require('../config');

const indexes = new Map(); // docName -> LocalIndex
const texts = new Map();   // docName -> string[]  (keyword fallback)

async function getIndex(docName) {
  if (!indexes.has(docName)) {
    const { LocalIndex } = require('vectra'); // lazy — avoids ESM cascade
    const indexPath = path.join(config.dataDir, docName);
    const index = new LocalIndex(indexPath);
    if (!await index.isIndexCreated()) await index.createIndex();
    indexes.set(docName, index);
  }
  return indexes.get(docName);
}

async function addChunks(docName, chunks) {
  // Always register the doc name so listDocs() includes it
  await getIndex(docName);

  // Always persist raw text for keyword fallback
  texts.set(docName, chunks.map(c => c.text).filter(Boolean));

  const vectorChunks = chunks.filter(c => c.embedding);
  if (vectorChunks.length === 0) return;

  const index = await getIndex(docName);
  for (const chunk of vectorChunks) {
    await index.insertItem({ vector: chunk.embedding, metadata: { text: chunk.text, source: docName } });
  }
}

async function searchIndex(docName, queryVector, topK = 5) {
  const index = await getIndex(docName);
  const results = await index.queryItems(queryVector, topK);
  return results.map((r) => ({ text: r.item.metadata.text, score: r.score }));
}

function getTextChunks(docName) {
  return texts.get(docName) || [];
}

async function listDocs() {
  return Array.from(indexes.keys());
}

async function deleteDoc(docName) {
  indexes.delete(docName);
  texts.delete(docName);
}

module.exports = { addChunks, searchIndex, getTextChunks, listDocs, deleteDoc };
