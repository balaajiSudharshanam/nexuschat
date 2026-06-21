import { useChatStore } from '../../store/chatStore';
import MessageInput from '../Chat/MessageInput';
import Message from '../Chat/Message';

export default function ThreadPanel({ send, isMobile }) {
  const { activeThread, setActiveThread, threads, username } = useChatStore();
  const threadMessages = threads[activeThread] || [];

  const handleSend = (text) => {
    send({ type: 'message', username, text, threadId: activeThread, ts: Date.now() });
  };

  const style = isMobile
    ? { ...panel, position: 'fixed', inset: 0, zIndex: 95, width: '100%', borderLeft: 'none' }
    : panel;

  return (
    <aside style={style}>
      <header style={header}>
        <span>Thread</span>
        <button onClick={() => setActiveThread(null)} style={closeBtn}>✕</button>
      </header>
      <div style={messages}>
        {threadMessages.map((msg, i) => <Message key={msg.id || i} msg={msg} />)}
      </div>
      <MessageInput onSend={handleSend} placeholder="Reply in thread… or @llm" />
    </aside>
  );
}

const panel = { width: 320, background: '#1a1a1a', borderLeft: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', flexShrink: 0 };
const header = { padding: '12px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 };
const closeBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 };
const messages = { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 };
