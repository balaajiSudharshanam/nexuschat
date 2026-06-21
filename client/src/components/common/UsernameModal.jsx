import { useState } from 'react';
import { useChatStore } from '../../store/chatStore';

export default function UsernameModal() {
  const { saveUsername } = useChatStore();
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const name = value.trim();
    if (name) saveUsername(name);
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <h2>Welcome to Nexus</h2>
        <p style={{ marginBottom: 16, color: '#999' }}>Pick a display name to join</p>
        <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your name"
            style={input}
          />
          <button type="submit" style={btn} disabled={!value.trim()}>Join</button>
        </form>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const card = { background: '#2a2a2a', padding: 32, borderRadius: 12, minWidth: 320 };
const input = { flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #444', background: '#1a1a1a', color: '#e0e0e0', fontSize: 14 };
const btn = { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 14 };
