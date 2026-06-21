const config = require('../config');

async function gradeOne(chunk, query) {
  const res = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [{
        role: 'user',
        content: `Is the following chunk useful for answering the question? Reply with only "yes" or "no".\n\nQuestion: ${query}\n\nChunk: ${chunk.text}`,
      }],
      stream: false,
    }),
  });
  const data = await res.json();
  return data.message?.content?.trim().toLowerCase().startsWith('yes') ?? true;
}

async function gradeAll(chunks, query) {
  if (chunks.length === 0) return [];
  const grades = await Promise.all(
    chunks.map(c => gradeOne(c, query).catch(() => true)) // keep on error
  );
  const relevant = chunks.filter((_, i) => grades[i]);
  // If the grader filtered everything out, fall back to top-2 by score
  return relevant.length > 0 ? relevant : chunks.slice(0, 2);
}

module.exports = { gradeAll };
