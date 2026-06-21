const { addMessage, getHistory } = require('./history');

const MENTION_RE = /^@llm(?:\s+\/doc:(\S+))?\s+([\s\S]+)$/i;

async function routeMessage(msg, ws, clients, broadcast, llmHandler) {
  switch (msg.type) {
    case 'join': {
      const { username } = msg;
      clients.set(ws, { username });
      broadcast({ type: 'join', username });
      break;
    }

    case 'message': {
      const { username, text, threadId } = msg;
      const match = text.match(MENTION_RE);

      if (match) {
        const docName = match[1] || null;
        const query = match[2];
        const msgId = `llm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        broadcast({ type: 'llm_start', username, query, docName, threadId, msgId });
        await llmHandler({ query, docName, threadId, history: getHistory(), msgId }, broadcast);
      } else {
        broadcast({ type: 'message', username, text, threadId, ts: Date.now() });
        addMessage('user', `${username}: ${text}`);
      }
      break;
    }

    default:
      break;
  }
}

module.exports = { routeMessage, MENTION_RE };
