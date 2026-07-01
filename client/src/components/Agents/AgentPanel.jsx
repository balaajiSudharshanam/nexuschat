import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import AgentMessage from './AgentMessage';

export default function AgentPanel({ send, isMobile, onMenuClick }) {
  const { activeAgent, closeAgent, agentMessages, addAgentMessage, agentThinking, setAgentThinking } = useChatStore();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!activeAgent) return;
    send({ type: 'agent_start', agentId: activeAgent.id });
    return () => {
      send({ type: 'agent_end' });
    };
  }, [activeAgent, send]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, agentThinking]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || agentThinking) return;
    addAgentMessage({ id: `user-${Date.now()}`, type: 'user', text: trimmed });
    setAgentThinking(true);
    send({ type: 'agent_message', text: trimmed });
    setText('');
  }, [text, agentThinking, addAgentMessage, setAgentThinking, send]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeAgent) return null;

  return (
    <main style={mainStyle}>
      <header style={headerStyle}>
        {isMobile && (
          <button onClick={onMenuClick} style={menuBtn}>☰</button>
        )}
        <span style={agentIcon}>◈</span>
        <span style={{ flex: 1 }}>{activeAgent.name}</span>
        {activeAgent.description && (
          <span style={descText}>{activeAgent.description}</span>
        )}
        <button onClick={closeAgent} style={closeBtn} title="Close agent session">✕</button>
      </header>

      <div style={msgList}>
        {agentMessages.length === 0 && !agentThinking && (
          <div style={emptyHint}>
            Send a message to start talking with <strong>{activeAgent.name}</strong>
          </div>
        )}
        {agentMessages.map((msg) => (
          <AgentMessage key={msg.id} msg={msg} send={send} />
        ))}
        {agentThinking && (
          <div style={thinkingRow}>
            <span style={thinkingDot} />
            <span style={thinkingDot} />
            <span style={thinkingDot} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={inputWrap}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={agentThinking ? 'Waiting for response…' : `Message ${activeAgent.name}…`}
          rows={1}
          style={textarea}
          disabled={agentThinking}
        />
        <button onClick={handleSend} style={sendBtn} disabled={!text.trim() || agentThinking}>
          Send
        </button>
      </div>
    </main>
  );
}

const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 };
const headerStyle = { padding: '12px 16px', borderBottom: '1px solid #2a2a2a', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 };
const menuBtn = { background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 };
const agentIcon = { color: '#4f8ef7', fontSize: 16 };
const descText = { fontSize: 12, color: '#555', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 };
const closeBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1, marginLeft: 'auto' };
const msgList = { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' };
const emptyHint = { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 40 };
const thinkingRow = { display: 'flex', gap: 5, alignItems: 'center', marginBottom: 12, paddingLeft: 4 };
const thinkingDot = { width: 6, height: 6, borderRadius: '50%', background: '#4f8ef7', animation: 'pulse 1.2s ease-in-out infinite', display: 'inline-block' };
const inputWrap = { padding: '12px 16px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: 8, alignItems: 'flex-end' };
const textarea = { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#2a2a2a', color: '#e0e0e0', fontSize: 14, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 };
const sendBtn = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-end' };
