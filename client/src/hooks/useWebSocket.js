import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useNotifications } from './useNotifications';

const WS_URL = import.meta.env.DEV ? 'ws://localhost:3000' : `ws://${window.location.host}`;
const MAX_BACKOFF = 16000;

export function nextBackoff(current, max) {
  return Math.min(current * 2, max);
}

export function useWebSocket() {
  const wsRef = useRef(null);
  const backoffRef = useRef(1000);
  const destroyedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const {
    username, addMessage, appendLlmToken, finalizeLlmMessage, setUsers, setDocs,
    addAgentMessage, updateAgentMessage, setAgentThinking, setAgentApprovalRequest,
  } = useChatStore();
  const { notify } = useNotifications();

  const connect = useCallback(() => {
    if (destroyedRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      backoffRef.current = 1000;
      if (username) ws.send(JSON.stringify({ type: 'join', username }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'message':
          addMessage(msg);
          notify(`${msg.username}: ${msg.text}`);
          break;
        case 'join':
          setUsers((prev) => [...new Set([...prev, msg.username])]);
          break;
        case 'leave':
          setUsers((prev) => prev.filter((u) => u !== msg.username));
          break;
        case 'llm_start':
          addMessage({ id: msg.msgId, type: 'llm', text: '', threadId: msg.threadId });
          break;
        case 'llm_token':
          appendLlmToken(msg.token, msg.threadId, msg.msgId);
          break;
        case 'llm_done':
          finalizeLlmMessage(msg.msgId, msg.sources || [], msg.threadId);
          notify('LLM response ready');
          break;
        case 'doc_removed':
          setDocs((prev) => prev.filter((d) => d !== msg.docName));
          break;
        case 'agent_token':
          addAgentMessage({ id: msg.msgId, type: 'agent', text: msg.token });
          break;
        case 'agent_approval_request':
          addAgentMessage({ id: `appr-${msg.msgId}`, type: 'approval', tool: msg.tool, args: msg.args, msgId: msg.msgId });
          setAgentApprovalRequest({ tool: msg.tool, args: msg.args, msgId: msg.msgId });
          break;
        case 'agent_tool_result':
          addAgentMessage({ id: `tool-${msg.msgId}`, type: 'tool_result', tool: msg.tool, data: msg.data });
          break;
        case 'agent_done':
          setAgentThinking(false);
          setAgentApprovalRequest(null);
          break;
        case 'agent_error':
          addAgentMessage({ id: `err-${Date.now()}`, type: 'error', text: msg.error });
          setAgentThinking(false);
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (!destroyedRef.current) {
        setTimeout(connect, backoffRef.current);
        backoffRef.current = nextBackoff(backoffRef.current, MAX_BACKOFF);
      }
    };
  }, [username, addMessage, appendLlmToken, finalizeLlmMessage, setUsers, setDocs, notify,
      addAgentMessage, updateAgentMessage, setAgentThinking, setAgentApprovalRequest]);

  useEffect(() => {
    destroyedRef.current = false;
    connect();
    return () => {
      destroyedRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { connected, send };
}
