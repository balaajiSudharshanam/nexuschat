import { useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { fetchTools, createAgent, updateAgent } from '../../api/http';

export default function AgentForm({ agent, onClose, onSaved }) {
  const { docs } = useChatStore();
  const [tools, setTools] = useState([]);
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [instructions, setInstructions] = useState(agent?.instructions || '');
  const [pinnedDocs, setPinnedDocs] = useState(agent?.pinnedDocs || []);
  const [enabledTools, setEnabledTools] = useState(agent?.enabledTools || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTools().then(setTools).catch(() => {});
  }, []);

  const toggleDoc = (doc) => {
    setPinnedDocs((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  };

  const toggleTool = (id) => {
    setEnabledTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedInstructions = instructions.trim();
    if (!trimmedName || !trimmedInstructions) {
      setError('Name and instructions are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { name: trimmedName, description: description.trim(), instructions: trimmedInstructions, pinnedDocs, enabledTools };
      const saved = agent ? await updateAgent(agent.id, body) : await createAgent(body);
      onSaved(saved);
    } catch {
      setError('Failed to save. Is the server running?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={cardHeader}>
          <h3 style={title}>{agent ? 'Edit Agent' : 'New Agent'}</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={label}>Name *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Research Assistant"
            style={input}
          />

          <label style={label}>Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            style={input}
          />

          <label style={label}>Instructions *</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="You are a helpful assistant that..."
            rows={5}
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
          />

          {docs.length > 0 && (
            <>
              <label style={label}>Pinned Documents</label>
              <div style={checkList}>
                {docs.map((doc) => (
                  <label key={doc} style={checkItem}>
                    <input
                      type="checkbox"
                      checked={pinnedDocs.includes(doc)}
                      onChange={() => toggleDoc(doc)}
                      style={{ marginRight: 6 }}
                    />
                    <span style={checkLabel}>{doc}</span>
                  </label>
                ))}
              </div>
              {docs.length === 0 && <p style={emptyHint}>No documents uploaded yet.</p>}
            </>
          )}

          {tools.length > 0 && (
            <>
              <label style={label}>Enabled Tools</label>
              <div style={checkList}>
                {tools.map((tool) => (
                  <label key={tool.id} style={checkItem}>
                    <input
                      type="checkbox"
                      checked={enabledTools.includes(tool.id)}
                      onChange={() => toggleTool(tool.id)}
                      style={{ marginRight: 6 }}
                    />
                    <span style={checkLabel}>{tool.id}</span>
                    {tool.description && (
                      <span style={toolDesc}> — {tool.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}

          {error && <div style={errorText}>{error}</div>}

          <div style={footer}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button type="submit" style={submitBtn} disabled={saving}>
              {saving ? 'Saving…' : agent ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const card = { background: '#1e1e1e', border: '1px solid #333', borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const title = { margin: 0, fontSize: 17, fontWeight: 700, color: '#e0e0e0' };
const closeBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 };
const label = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#666', marginBottom: 4, marginTop: 14 };
const input = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #333', background: '#111', color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' };
const checkList = { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', padding: '4px 0' };
const checkItem = { display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: 13 };
const checkLabel = { color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const toolDesc = { color: '#666', fontSize: 11 };
const emptyHint = { color: '#555', fontSize: 12, fontStyle: 'italic', margin: '4px 0 0' };
const errorText = { color: '#f88', fontSize: 13, marginTop: 12 };
const footer = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 };
const cancelBtn = { padding: '8px 16px', borderRadius: 6, border: '1px solid #333', background: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 };
const submitBtn = { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
