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
  console.log(`[INGEST] Starting ingestion for "${docName}" (${(buffer.length / 1024).toFixed(1)} KB)`);

  const { text } = await pdfParse(buffer);
  console.log(`[INGEST] "${docName}" extracted ${text.length} characters of text`);

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    console.warn(`[INGEST] "${docName}" produced 0 chunks — PDF may be image-based or have no extractable text`);
    await addChunks(docName, []);
    return 0;
  }
  console.log(`[INGEST] "${docName}" split into ${chunks.length} chunk(s) (~${CHUNK_SIZE} words each)`);

  let embedded;
  let embeddedCount = 0;
  try {
    embedded = await Promise.all(
      chunks.map(async (t) => {
        const embedding = await embed(t);
        if (!embedding || !Array.isArray(embedding)) {
          throw new Error(`embed() returned invalid value: ${JSON.stringify(embedding)}`);
        }
        return { text: t, embedding };
      })
    );
    embeddedCount = embedded.length;
    console.log(`[INGEST] "${docName}" embedded ${embeddedCount}/${chunks.length} chunk(s) successfully`);
  } catch (err) {
    console.warn(`[INGEST] "${docName}" embedding failed — storing text-only for BM25 fallback: ${err.message}`);
    embedded = chunks.map((t) => ({ text: t }));
  }

  await addChunks(docName, embedded);
  console.log(`[INGEST] "${docName}" ingestion complete — ${chunks.length} chunk(s) stored (${embeddedCount} with vectors)`);
  return chunks.length;
}

module.exports = { ingestPdf, chunkText };
