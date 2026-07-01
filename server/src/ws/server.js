const { WebSocketServer } = require('ws');
const { routeMessage } = require('./router');
const { handleLlmMention } = require('../llm/ollama');
const { runAgentTurn } = require('../agents/engine');
const { getAgent } = require('../agents/store');
const { queryRag } = require('../rag/query');

const clients = new Map();  // ws -> { username }
const sessions = new Map(); // ws -> { agentId, history, resolveApproval }

function broadcast(payload, excludeWs = null) {
  const data = JSON.stringify(payload);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function handleDisconnect(ws, clientsMap = clients, sessionsMap = sessions, broadcastFn = broadcast) {
  const { username } = clientsMap.get(ws) || {};
  clientsMap.delete(ws);
  sessionsMap.delete(ws);
  if (username) broadcastFn({ type: 'leave', username });
}

async function handleAgentMessage(msg, ws) {
  switch (msg.type) {
    case 'agent_start': {
      const agent = getAgent(msg.agentId);
      if (!agent) { send(ws, { type: 'agent_error', error: 'Agent not found' }); return; }
      sessions.set(ws, { agentId: msg.agentId, history: [], resolveApproval: null });
      send(ws, { type: 'agent_ready', agentId: msg.agentId });
      break;
    }

    case 'agent_message': {
      const session = sessions.get(ws);
      if (!session) { send(ws, { type: 'agent_error', error: 'No active agent session' }); return; }
      const agent = getAgent(session.agentId);
      if (!agent) { send(ws, { type: 'agent_error', error: 'Agent not found' }); return; }

      const waitForApproval = (_tool, _args) => new Promise((resolve) => {
        session.resolveApproval = resolve;
      });

      try {
        await runAgentTurn(
          { query: msg.text, agent, history: session.history },
          (payload) => send(ws, payload),
          waitForApproval,
          queryRag,
        );
      } catch (err) {
        console.error('[agent] runAgentTurn error:', err.message);
        send(ws, { type: 'agent_error', error: err.message });
      }
      break;
    }

    case 'agent_approval_response': {
      const session = sessions.get(ws);
      if (session?.resolveApproval) {
        session.resolveApproval(!!msg.approved);
        session.resolveApproval = null;
      }
      break;
    }

    case 'agent_end': {
      sessions.delete(ws);
      break;
    }
  }
}

function initWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    clients.set(ws, { username: null });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type?.startsWith('agent_')) {
        try { await handleAgentMessage(msg, ws); } catch (err) {
          console.error('[agent] handler error:', err.message);
        }
        return;
      }

      try {
        await routeMessage(msg, ws, clients, broadcast, handleLlmMention);
      } catch (err) {
        console.error('[ws] routeMessage error:', err.message);
        broadcast({ type: 'message', username: 'Nexus', text: `Error: ${err.message}`, ts: Date.now() });
      }
    });

    ws.on('close', () => handleDisconnect(ws));
  });
}

module.exports = { initWsServer, broadcast, handleDisconnect };
