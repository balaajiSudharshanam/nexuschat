const path = require('path');
const { pathToFileURL } = require('url');
const { embed } = require('../llm/ollama');
const { addChunks } = require('./store');

const CHUNK_SIZE = 800;    // characters
const CHUNK_OVERLAP = 100; // characters

// Extract text from a PDF buffer using pdfjs-dist with coordinate-aware
// reconstruction. Text items are sorted by page then by Y/X position so
// multi-column and templated layouts (resumes, forms) read in the correct order.
async function extractText(buffer) {
  // pdfjs-dist v6 is ESM-only; legacy build avoids browser-only globals like DOMMatrix
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Point to the worker file so Node.js can spawn it as a worker_thread
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
  ).href;

  const standardFontDataUrl = pathToFileURL(
    path.join(require.resolve('pdfjs-dist/package.json'), '..', 'standard_fonts', '/')
  ).href;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), standardFontDataUrl });
  const pdf = await loadingTask.promise;

  const pageTexts = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Sort items top-to-bottom, left-to-right using their transform coordinates.
    // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
    // translateY increases downward in PDF space, so we negate for sort order.
    const items = content.items
      .filter(item => item.str)
      .sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5]; // descending Y = top first
        if (Math.abs(yDiff) > 5) return yDiff;         // 5pt tolerance for same line
        return a.transform[4] - b.transform[4];         // ascending X = left first
      });

    // Join items, inserting a newline when Y jumps enough to indicate a new line
    let pageText = '';
    let lastY = null;
    for (const item of items) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str + (item.hasEOL ? '\n' : ' ');
      lastY = y;
    }

    pageTexts.push(pageText.trim());
  }

  return pageTexts.join('\n\n');
}

function chunkText(text) {
  if (!text || !text.trim()) return [];
  const src = text.trim();
  const chunks = [];
  let start = 0;
  while (start < src.length) {
    let end = Math.min(start + CHUNK_SIZE, src.length);
    // Snap end back to the nearest whitespace to avoid splitting mid-word,
    // unless we're already at the very end of the text.
    if (end < src.length) {
      const boundary = src.lastIndexOf(' ', end);
      if (boundary > start) end = boundary;
    }
    chunks.push(src.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start >= src.length - CHUNK_OVERLAP) break;
  }
  return chunks;
}

async function ingestPdf(buffer, docName) {
  console.log(`[INGEST] Starting ingestion for "${docName}" (${(buffer.length / 1024).toFixed(1)} KB)`);

  const text = await extractText(buffer);
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
