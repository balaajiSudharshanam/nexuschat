const fs = require('fs');
const path = require('path');
const config = require('../config');

const indexes = new Map(); // docName -> LocalIndex
const texts = new Map();   // docName -> string[]

// Path to the sidecar file that persists text chunks alongside the vectra index
function textsPath(docName) {
  return path.join(config.dataDir, docName, 'texts.json');
}

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
  await getIndex(docName); // registers the doc name

  const textChunks = chunks.map(c => c.text).filter(Boolean);
  texts.set(docName, textChunks);

  // Persist text chunks to disk so BM25 survives server restarts
  const p = textsPath(docName);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(textChunks), 'utf8');
  console.log(`[STORE] "${docName}" saved ${textChunks.length} text chunk(s) to disk`);

  const vectorChunks = chunks.filter(c => c.embedding);
  if (vectorChunks.length === 0) {
    console.warn(`[STORE] "${docName}" no embeddings to store — vector search will be unavailable for this doc`);
    return;
  }

  const index = await getIndex(docName);
  for (const chunk of vectorChunks) {
    await index.insertItem({ vector: chunk.embedding, metadata: { text: chunk.text, source: docName } });
  }
  console.log(`[STORE] "${docName}" inserted ${vectorChunks.length} vector(s) into index`);
}

async function searchIndex(docName, queryVector, topK = 5) {
  const index = await getIndex(docName);
  // queryItems(vector, query, topK, filter, isBm25) — skip the query string param
  const results = await index.queryItems(queryVector, undefined, topK);
  return results.map((r) => ({ text: r.item.metadata.text, score: r.score }));
}

function getTextChunks(docName) {
  if (!texts.has(docName)) {
    // Lazy-load from the sidecar file written during ingestion
    const p = textsPath(docName);
    if (fs.existsSync(p)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(p, 'utf8'));
        texts.set(docName, loaded);
        console.log(`[STORE] "${docName}" lazy-loaded ${loaded.length} text chunk(s) from disk`);
      } catch (err) {
        console.error(`[STORE] Failed to load texts for "${docName}": ${err.message}`);
        texts.set(docName, []);
      }
    } else {
      console.warn(`[STORE] No text chunks found on disk for "${docName}"`);
      texts.set(docName, []);
    }
  }
  return texts.get(docName);
}

async function listDocs() {
  return Array.from(indexes.keys());
}

async function deleteDoc(docName) {
  indexes.delete(docName);
  texts.delete(docName);

  const p = textsPath(docName);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch {}
  }
}

// Called at startup to restore in-memory state from disk
async function loadDocs() {
  if (!fs.existsSync(config.dataDir)) return;

  const entries = fs.readdirSync(config.dataDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const docName = entry.name;
    try {
      await getIndex(docName); // registers in indexes Map, checks disk index

      const p = textsPath(docName);
      if (fs.existsSync(p)) {
        const loaded = JSON.parse(fs.readFileSync(p, 'utf8'));
        texts.set(docName, loaded);
        console.log(`[STORE] Restored "${docName}" — ${loaded.length} text chunk(s)`);
      } else {
        // Reconstruct text chunks from vectra's index.json metadata
        const indexFile = path.join(config.dataDir, docName, 'index.json');
        if (fs.existsSync(indexFile)) {
          const { items = [] } = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
          const reconstructed = items.map(item => item.metadata?.text).filter(Boolean);
          if (reconstructed.length > 0) {
            texts.set(docName, reconstructed);
            fs.writeFileSync(p, JSON.stringify(reconstructed), 'utf8');
            console.log(`[STORE] "${docName}" reconstructed ${reconstructed.length} text chunk(s) from vectra index — texts.json saved`);
          } else {
            console.warn(`[STORE] "${docName}" vectra index exists but has no text metadata — BM25 unavailable`);
          }
        } else {
          console.warn(`[STORE] "${docName}" has no index.json or texts.json — skipping`);
        }
      }
    } catch (err) {
      console.error(`[STORE] Failed to restore "${docName}": ${err.message}`);
    }
  }
}

module.exports = { addChunks, searchIndex, getTextChunks, listDocs, deleteDoc, loadDocs };
