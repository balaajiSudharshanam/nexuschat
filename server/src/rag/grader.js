const config = require('../config');

const CONFIDENCE_THRESHOLD = 2; // 1–5 scale; tangentially related or better passes
const MAX_RETRIES = 2;

async function gradeOne(chunk, query, attempt = 0) {
  const res = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [{
        role: 'user',
        content: `Be STRICT. Rate how useful this chunk is for answering the question on a scale of 1 to 5. Only give high scores if the chunk directly and specifically answers the question. Tangentially related content must score 2 or lower.\n\n1 = completely irrelevant / unrelated to the question\n2 = tangentially related but not useful\n3 = somewhat related but missing key details\n4 = directly answers the question\n5 = perfectly directly answers the question\n\nReply with a single digit (1, 2, 3, 4, or 5) and nothing else. Do not explain.\n\nQuestion: ${query}\n\nChunk: ${chunk.text}`,
      }],
      stream: false,
    }),
  });
  const data = await res.json();
  const raw = data.message?.content?.trim();
  const score = parseInt(raw, 10);

  if (!Number.isFinite(score) || score < 1 || score > 5) {
    if (attempt < MAX_RETRIES) {
      console.warn(`[GRADER] Malformed response "${raw}" from "${chunk.source || 'unknown'}" — retry ${attempt + 1}/${MAX_RETRIES}`);
      return gradeOne(chunk, query, attempt + 1);
    }
    console.error(`[GRADER] Could not parse score after ${MAX_RETRIES} retries for chunk from "${chunk.source || 'unknown'}" (raw: "${raw}")`);
    return null;
  }

  return score;
}

async function gradeAll(chunks, query) {
  if (chunks.length === 0) return [];

  const queryPreview = query.length > 60 ? `${query.slice(0, 60)}...` : query;
  console.log(`[GRADER] Grading ${chunks.length} chunk(s) for query: "${queryPreview}"`);

  const scores = await Promise.all(
    chunks.map(c =>
      gradeOne(c, query).catch(err => {
        console.error(`[GRADER] gradeOne threw for chunk from "${c.source || 'unknown'}": ${err.message}`);
        return null;
      })
    )
  );

  // Log every chunk's score before filtering so the full picture is visible
  chunks.forEach((chunk, i) => {
    const score = scores[i];
    const src = chunk.source || 'unknown';
    const preview = chunk.text.slice(0, 70).replace(/\n/g, ' ');
    if (score === null) {
      console.warn(`[GRADER] Score unavailable for chunk from "${src}" — will be excluded`);
    } else if (score < CONFIDENCE_THRESHOLD) {
      console.log(`[GRADER] Rejected  score=${score}/5  src="${src}"  preview="${preview}..."`);
    } else {
      console.log(`[GRADER] Accepted  score=${score}/5  src="${src}"  preview="${preview}..."`);
    }
  });

  const graded = chunks
    .map((chunk, i) => ({ chunk, score: scores[i] }))
    .filter(({ score }) => score !== null && score >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map(({ chunk, score }) => ({ ...chunk, graderScore: score }));

  if (graded.length === 0) {
    console.warn(`[GRADER] All ${chunks.length} chunk(s) scored below threshold (${CONFIDENCE_THRESHOLD}) for query: "${queryPreview}"`);
  } else {
    const passSources = [...new Set(graded.map(c => c.source).filter(Boolean))].join(', ');
    console.log(`[GRADER] Passed: ${graded.length}/${chunks.length} chunks (threshold: ${CONFIDENCE_THRESHOLD}) — sources: [${passSources}]`);
  }

  return graded;
}

module.exports = { gradeAll };
