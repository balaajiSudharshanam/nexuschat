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
  const { username, addMessage, appendLlmToken, setUsers, setDocs } = useChatStore();
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
          notify('LLM response ready');
          break;
        case 'doc_removed':
          setDocs((prev) => prev.filter((d) => d !== msg.docName));
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
  }, [username, addMessage, appendLlmToken, setUsers, setDocs, notify]);

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
