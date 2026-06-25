const config = require('../config');
const { queryRag } = require('../rag/query');
const { validateResults } = require('../rag/validateResults');
const { addMessage } = require('../ws/history');

// Queries that should go straight to the LLM without touching the RAG pipeline.
// Only applies when no /doc: target is specified.
function isConversational(query) {
  const trimmed = query.trim();
  if (trimmed.split(/\s+/).length <= 3) return true;
  return /^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|bye|good(bye| morning| afternoon| evening)|how are you|what'?s up|greetings|nice|great|awesome|cool|perfect|got it|understood|noted)[\s!?.]*$/i.test(trimmed);
}

async function handleLlmMention({ query, docName, threadId, history = [], msgId }, broadcast, ragQuery = queryRag) {
  let chunks = [];

  if (docName || !isConversational(query)) {
    // RAG path: /doc: specified OR query looks like it's seeking document content
    const rawChunks = await ragQuery(query, docName);
    if (rawChunks === null) {
      broadcast({ type: 'message', username: 'Nexus', text: `Document "${docName}" not found.`, ts: Date.now() });
      return;
    }

    chunks = rawChunks; // validateResults disabled

    if (chunks.length === 0 && docName) {
      broadcast({
        type: 'message',
        username: 'Nexus',
        text: `I couldn't find relevant information in "${docName}" to answer: ${query}`,
        ts: Date.now(),
      });
      return;
    }
  }

  const sources = [...new Set(chunks.map(c => c.source).filter(Boolean))];

  const context = chunks
    .map(c => `[Source: ${c.source || 'unknown'}]\n${c.text}`)
    .join('\n\n');

  const systemPrompt = context
    ? `Answer ONLY based on the context below. If the answer is not present in the context, say so explicitly — do not use outside knowledge.\n\nContext:\n${context}`
    : `You are Nexus, a helpful assistant. Answer the user's question conversationally.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: query },
  ];

  const body = { model: config.model, messages, stream: true };

  const res = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  let fullResponse = '';
  let buf = '';
  let streamDone = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        const token = chunk.message?.content || '';
        if (token) {
          fullResponse += token;
          broadcast({ type: 'llm_token', token, threadId, msgId });
        }
        if (chunk.done) {
          broadcast({ type: 'llm_done', threadId, msgId, sources });
          streamDone = true;
        }
      } catch {}
    }
  }

  if (!streamDone) broadcast({ type: 'llm_done', threadId, msgId, sources });

  if (fullResponse) {
    addMessage('user', query);
    addMessage('assistant', fullResponse);
  }
}

async function embed(text) {
  const res = await fetch(`${config.ollamaBaseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.embedModel, input: text }),
  });
  const data = await res.json();
  // Ollama ≥0.3 returns { embeddings: [[...]] }; older versions return { embedding: [...] }
  const vector = data.embeddings?.[0] ?? data.embedding ?? null;
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    throw new Error(`Ollama embed returned no vector (model: ${config.embedModel}, response: ${JSON.stringify(data).slice(0, 120)})`);
  }
  return vector;
}

module.exports = { handleLlmMention, embed };
