// Patterns whose presence suggests a chunk is referencing content outside itself,
// which is a common sign of cross-document contamination or model hallucination.
const HALLUCINATION_MARKERS = [
  /\bas mentioned (in|above|below|earlier|previously)\b/i,
  /\bsee (also|section|page|figure|document|appendix)\b/i,
  /\brefer(red)? to\b/i,
  /\baccording to (the )?(document|file|pdf|source|report)\b/i,
  /\bin (the )?(other|another|previous|next) (document|file|section|chapter)\b/i,
];

function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter(t => t.length > 2);
}

function queryOverlapRatio(chunkText, queryTerms) {
  if (queryTerms.length === 0) return 1;
  const lower = chunkText.toLowerCase();
  const matches = queryTerms.filter(t => lower.includes(t)).length;
  return matches / queryTerms.length;
}

function checkCrossDocContamination(bySource) {
  const sources = Array.from(bySource.keys());
  if (sources.length < 2) return;

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const tokensA = new Set(tokenize(bySource.get(sources[i]).map(c => c.text).join(' ')));
      const tokensB = new Set(tokenize(bySource.get(sources[j]).map(c => c.text).join(' ')));
      const overlap = [...tokensA].filter(t => tokensB.has(t)).length;
      const ratio = overlap / Math.min(tokensA.size, tokensB.size);

      if (ratio < 0.1) {
        console.warn(
          `[VALIDATION] Suspicious cross-doc match: "${sources[i]}" chunk matched with "${sources[j]}"` +
          ` (term overlap: ${(ratio * 100).toFixed(0)}%)`
        );
      } else {
        console.log(
          `[VALIDATION] Cross-doc overlap "${sources[i]}" ↔ "${sources[j]}": ${(ratio * 100).toFixed(0)}% — OK`
        );
      }
    }
  }
}

function validateResults(results, query) {
  if (!results || results.length === 0) return [];

  const queryPreview = query.length > 60 ? `${query.slice(0, 60)}...` : query;
  const queryTerms = tokenize(query);
  console.log(`[VALIDATION] Validating ${results.length} chunk(s) for query: "${queryPreview}"`);

  // Warn if the top-ranked result has a low grader score
  const top = results[0];
  if (top.graderScore !== undefined && top.graderScore < 4) {
    console.warn(`[VALIDATION] Top result has low grader confidence (${top.graderScore}/5) from "${top.source || 'unknown'}"`);
  }

  const validated = [];
  const bySource = new Map();

  for (const chunk of results) {
    const src = chunk.source || 'unknown';
    const preview = chunk.text.slice(0, 70).replace(/\n/g, ' ');

    // Off-topic check: reject if too few query terms appear in the chunk
    if (queryTerms.length > 3) {
      const overlap = queryOverlapRatio(chunk.text, queryTerms);
      if (overlap < 0.1) {
        console.warn(
          `[VALIDATION] Rejected off-topic chunk from "${src}"` +
          ` (query overlap: ${(overlap * 100).toFixed(0)}%)  preview="${preview}..."`
        );
        continue;
      }
    }

    // Hallucination marker check: warn but keep
    for (const marker of HALLUCINATION_MARKERS) {
      if (marker.test(chunk.text)) {
        console.warn(`[VALIDATION] Hallucination marker in chunk from "${src}" matched ${marker}  preview="${preview}..."`);
        break;
      }
    }

    validated.push(chunk);
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src).push(chunk);
  }

  checkCrossDocContamination(bySource);

  if (validated.length === 0) {
    console.warn(`[VALIDATION] All ${results.length} chunk(s) rejected — returning empty set`);
  } else {
    const finalSources = [...bySource.keys()].join(', ');
    console.log(`[VALIDATION] Final: ${validated.length}/${results.length} chunks passed — sources: [${finalSources}]`);
  }

  return validated;
}

module.exports = { validateResults };
