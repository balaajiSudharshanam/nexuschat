import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../../store/chatStore';

const typingCSS = `
@keyframes nexus-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-5px); opacity: 1; }
}
.nx-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#4f8ef7; margin:0 3px; animation:nexus-bounce 1.2s ease-in-out infinite; }
.nx-dot:nth-child(2){ animation-delay:.2s; }
.nx-dot:nth-child(3){ animation-delay:.4s; }
`;

function TypingDots() {
  return (
    <>
      <style>{typingCSS}</style>
      <span style={{ display: 'inline-flex', alignItems: 'center', height: 20 }}>
        <span className="nx-dot" />
        <span className="nx-dot" />
        <span className="nx-dot" />
      </span>
    </>
  );
}

export default function Message({ msg }) {
  const { setActiveThread, threads } = useChatStore();
  const threadCount = threads[msg.id]?.length || 0;

  if (msg.type === 'llm') {
    return (
      <div style={llmBubble}>
        <span style={llmLabel}>@llm</span>
        <div style={llmBody}>
          {msg.text ? <ReactMarkdown>{msg.text}</ReactMarkdown> : <TypingDots />}
        </div>
        {msg.text && msg.id && (
          <ReplyButton msgId={msg.id} count={threadCount} onOpen={setActiveThread} />
        )}
      </div>
    );
  }

  return (
    <div style={row}>
      <div style={bubbleWrap}>
        <span style={name}>{msg.username}</span>
        <span style={text}>{msg.text}</span>
        <ReplyButton msgId={msg.id} count={threadCount} onOpen={setActiveThread} />
      </div>
    </div>
  );
}

function ReplyButton({ msgId, count, onOpen }) {
  return (
    <button onClick={() => onOpen(msgId)} style={replyBtn}>
      {count > 0 ? `${count} repl${count === 1 ? 'y' : 'ies'}` : 'Reply'}
    </button>
  );
}

const row = { display: 'flex', flexDirection: 'column', marginBottom: 2 };
const bubbleWrap = { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' };
const name = { fontWeight: 600, fontSize: 13, color: '#4f8ef7', flexShrink: 0 };
const text = { fontSize: 14, color: '#e0e0e0', wordBreak: 'break-word' };
const llmBubble = { background: '#1e2a3a', borderLeft: '3px solid #4f8ef7', padding: '10px 14px', borderRadius: 6, marginBottom: 4 };
const llmLabel = { fontSize: 11, color: '#4f8ef7', fontWeight: 700, display: 'block', marginBottom: 6 };
const llmBody = { fontSize: 14, color: '#e0e0e0', lineHeight: 1.6 };
const replyBtn = { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, padding: '2px 0', marginLeft: 4 };
