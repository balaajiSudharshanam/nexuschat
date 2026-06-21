const pdfParse = require('pdf-parse');
const { embed } = require('../llm/ollama');
const { addChunks } = require('./store');

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text) {
  if (!text || !text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function ingestPdf(buffer, docName) {
  const { text } = await pdfParse(buffer);
  const chunks = chunkText(text);

  let embedded;
  try {
    embedded = await Promise.all(
      chunks.map(async (t) => ({ text: t, embedding: await embed(t) }))
    );
  } catch (err) {
    console.warn(`[ingest] embedding skipped for ${docName}: ${err.message}`);
    embedded = chunks.map((t) => ({ text: t })); // no embedding — keyword fallback only
  }

  await addChunks(docName, embedded);
  return chunks.length;
}

module.exports = { ingestPdf, chunkText };
