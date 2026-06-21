const config = require('../config');
const { queryRag } = require('../rag/query');
const { addMessage } = require('../ws/history');

async function handleLlmMention({ query, docName, threadId, history = [], msgId }, broadcast, ragQuery = queryRag) {
  const chunks = await ragQuery(query, docName);
  if (chunks === null) {
    broadcast({ type: 'message', username: 'Nexus', text: `Document "${docName}" not found.`, ts: Date.now() });
    return;
  }

  const context = chunks.map((c) => c.text).join('\n\n');

  const messages = [
    ...(context ? [{ role: 'system', content: `Use this context:\n${context}` }] : []),
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
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        const token = chunk.message?.content || '';
        if (token) {
          fullResponse += token;
          broadcast({ type: 'llm_token', token, threadId, msgId });
        }
        if (chunk.done) broadcast({ type: 'llm_done', threadId, msgId });
      } catch {}
    }
  }

  // Save the exchange to history so future @llm calls have context
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
  return data.embeddings[0];
}

module.exports = { handleLlmMention, embed };
