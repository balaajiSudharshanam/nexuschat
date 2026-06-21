const { WebSocketServer } = require('ws');
const { routeMessage } = require('./router');
const { handleLlmMention } = require('../llm/ollama');

const clients = new Map(); // ws -> { username }

function broadcast(payload, excludeWs = null) {
  const data = JSON.stringify(payload);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

function handleDisconnect(ws, clients, broadcast) {
  const { username } = clients.get(ws) || {};
  clients.delete(ws);
  if (username) broadcast({ type: 'leave', username });
}

function initWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    clients.set(ws, { username: null });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      try {
        await routeMessage(msg, ws, clients, broadcast, handleLlmMention);
      } catch (err) {
        console.error('[ws] routeMessage error:', err.message);
        broadcast({ type: 'message', username: 'Nexus', text: `Error: ${err.message}`, ts: Date.now() });
      }
    });

    ws.on('close', () => handleDisconnect(ws, clients, broadcast));
  });
}

module.exports = { initWsServer, broadcast, handleDisconnect };
