import { useState, useRef } from 'react';
import { useDocAutocomplete } from '../../hooks/useDocAutocomplete';
import { useChatStore } from '../../store/chatStore';
import { uploadPdf, fetchDocs } from '../../api/http';

export default function MessageInput({ onSend, placeholder = 'Message… or @llm <question>' }) {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const { suggestions, check, mode } = useDocAutocomplete();
  const { username, setDocs } = useChatStore();
  const inputRef = useRef();
  const fileRef = useRef();

  const handleChange = (e) => {
    setText(e.target.value);
    check(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    check('');
  };

  const applyGeneral = () => {
    const replaced = text.replace(/@llm\s*$/i, '@llm ');
    setText(replaced);
    check(replaced);
    inputRef.current?.focus();
  };

  const applyDoc = (doc) => {
    const replaced = mode === 'llm'
      ? text.replace(/@llm\s*$/i, `@llm /doc:${doc} `)
      : text.replace(/@llm\s+\/doc:\S*$/i, `@llm /doc:${doc} `);
    setText(replaced);
    check(replaced);
    inputRef.current?.focus();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }
    setUploadError('');
    setIsUploading(true);
    try {
      await uploadPdf(file);
      const docs = await fetchDocs();
      setDocs(docs);
      onSend(`📎 uploaded ${file.name}`);
    } catch {
      setUploadError('Upload failed. Is the server running?');
    } finally {
      setIsUploading(false);
    }
  };

  const showDropdown = mode === 'llm' || (mode === 'doc' && suggestions.length > 0);

  return (
    <div style={wrap}>
      {showDropdown && (
        <ul style={dropdown}>
          {mode === 'llm' && (
            <li style={sectionHeader}>@llm</li>
          )}
          {mode === 'llm' && (
            <li style={item} onClick={applyGeneral}>
              <span style={icon}>💬</span>
              <span>General question</span>
            </li>
          )}
          {(mode === 'llm' || mode === 'doc') && suggestions.length > 0 && (
            <li style={sectionHeader}>Documents</li>
          )}
          {suggestions.map((doc) => (
            <li key={doc} style={item} onClick={() => applyDoc(doc)}>
              <span style={icon}>📄</span>
              <span style={docName}>{doc}</span>
            </li>
          ))}
          {mode === 'llm' && suggestions.length === 0 && (
            <li style={emptyHint}>No documents uploaded yet</li>
          )}
        </ul>
      )}
      {uploadError && <div style={errorStyle}>{uploadError}</div>}
      <div style={row}>
        <button
          onClick={() => fileRef.current.click()}
          style={attachBtn}
          disabled={isUploading}
          title="Attach PDF"
        >
          {isUploading ? '⏳' : '📎'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? 'Uploading…' : placeholder}
          rows={1}
          style={textarea}
          disabled={isUploading}
        />
        <button onClick={submit} style={btn} disabled={!text.trim() || isUploading}>Send</button>
      </div>
    </div>
  );
}

const wrap = { padding: '12px 16px', borderTop: '1px solid #2a2a2a', position: 'relative' };
const row = { display: 'flex', gap: 8, alignItems: 'flex-end' };
const textarea = { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#2a2a2a', color: '#e0e0e0', fontSize: 14, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 };
const btn = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-end' };
const attachBtn = { padding: '8px 10px', borderRadius: 8, border: 'none', background: '#2a2a2a', color: '#888', cursor: 'pointer', fontSize: 18, alignSelf: 'flex-end', lineHeight: 1 };
const dropdown = { position: 'absolute', bottom: '100%', left: 16, right: 16, background: '#1e1e1e', border: '1px solid #444', borderRadius: 8, listStyle: 'none', marginBottom: 4, zIndex: 10, overflow: 'hidden', boxShadow: '0 -4px 16px rgba(0,0,0,0.4)' };
const sectionHeader = { padding: '6px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#555', fontWeight: 700 };
const item = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#ccc', transition: 'background 0.1s' };
const icon = { fontSize: 15, flexShrink: 0 };
const docName = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const emptyHint = { padding: '8px 12px', fontSize: 12, color: '#444', fontStyle: 'italic' };
const errorStyle = { color: '#f88', fontSize: 12, marginBottom: 6 };
