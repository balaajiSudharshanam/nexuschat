const K1 = 1.5;
const B = 0.75;

function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

function buildIndex(docs) {
  const tokenized = docs.map(tokenize);
  const avgDl = tokenized.reduce((s, d) => s + d.length, 0) / (tokenized.length || 1);
  const df = {};
  const tf = tokenized.map(tokens => {
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    return freq;
  });
  for (const freq of tf) {
    for (const term of Object.keys(freq)) df[term] = (df[term] || 0) + 1;
  }
  return { tokenized, tf, df, avgDl, n: docs.length };
}

function scoreDoc(idx, queryTerms, { tf, df, avgDl, n, tokenized }) {
  let s = 0;
  const dl = tokenized[idx].length;
  const docTf = tf[idx];
  for (const term of queryTerms) {
    if (!docTf[term]) continue;
    const idf = Math.log((n - df[term] + 0.5) / (df[term] + 0.5) + 1);
    const tfScore = (docTf[term] * (K1 + 1)) / (docTf[term] + K1 * (1 - B + B * dl / avgDl));
    s += idf * tfScore;
  }
  return s;
}

function search(chunks, query, topK = 10) {
  if (chunks.length === 0) return [];
  const idx = buildIndex(chunks);
  const queryTerms = tokenize(query);
  return chunks
    .map((text, i) => ({ text, score: scoreDoc(i, queryTerms, idx) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { search };
