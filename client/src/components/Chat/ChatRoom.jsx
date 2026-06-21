import { useCallback, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { uploadPdf, fetchDocs } from '../../api/http';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatRoom({ send, isMobile, onMenuClick }) {
  const { username, setDocs } = useChatStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleSend = useCallback((text) => {
    send({ type: 'message', username, text, ts: Date.now() });
  }, [username, send]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError('');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }
    await uploadPdf(file);
    const docs = await fetchDocs();
    setDocs(docs);
    send({ type: 'message', username, text: `uploaded ${file.name}`, ts: Date.now() });
  }, [username, send, setDocs]);

  return (
    <main
      style={mainStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header style={headerStyle}>
        {isMobile && (
          <button onClick={onMenuClick} style={menuBtn}>☰</button>
        )}
        <span># general</span>
      </header>
      <MessageList />
      <MessageInput onSend={handleSend} />
      {isDragging && (
        <div data-testid="drop-overlay" style={overlay}>Drop PDF to upload</div>
      )}
      {uploadError && (
        <div data-testid="upload-error" style={errorStyle}>{uploadError}</div>
      )}
    </main>
  );
}

const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 };
const headerStyle = { padding: '12px 16px', borderBottom: '1px solid #2a2a2a', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 };
const menuBtn = { background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 };
const overlay = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 20, fontWeight: 600, pointerEvents: 'none' };
const errorStyle = { padding: '8px 16px', background: '#3a1a1a', color: '#f88', fontSize: 13 };
