import { useEffect, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { fetchAgents, deleteAgent } from '../../api/http';
import AgentForm from './AgentForm';

export default function AgentList() {
  const { agents, setAgents, openAgent, activeAgent } = useChatStore();
  const [hoveredId, setHoveredId] = useState(null);
  const [formAgent, setFormAgent] = useState(undefined); // undefined = closed, null = new, object = edit

  useEffect(() => {
    fetchAgents().then(setAgents).catch(() => {});
  }, [setAgents]);

  const handleDelete = async (e, agent) => {
    e.stopPropagation();
    await deleteAgent(agent.id);
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
  };

  const handleEdit = (e, agent) => {
    e.stopPropagation();
    setFormAgent(agent);
  };

  const handleSaved = (saved) => {
    setAgents((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists ? prev.map((a) => a.id === saved.id ? saved : a) : [...prev, saved];
    });
    setFormAgent(undefined);
  };

  return (
    <section>
      <h3 style={heading}>Agents</h3>
      <ul style={{ listStyle: 'none', marginBottom: 8 }}>
        {agents.map((agent) => (
          <li
            key={agent.id}
            style={{ ...item, background: activeAgent?.id === agent.id ? '#1a2a3a' : 'none' }}
            title={agent.description || ''}
            onMouseEnter={() => setHoveredId(agent.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => openAgent(agent)}
          >
            <span style={agentName}>{agent.name}</span>
            {hoveredId === agent.id && (
              <span style={actions}>
                <button onClick={(e) => handleEdit(e, agent)} style={actionBtn} title="Edit">✎</button>
                <button onClick={(e) => handleDelete(e, agent)} style={actionBtn} title="Delete">✕</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <button onClick={() => setFormAgent(null)} style={newBtn}>+ New Agent</button>

      {formAgent !== undefined && (
        <AgentForm
          agent={formAgent}
          onClose={() => setFormAgent(undefined)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}

const heading = { fontSize: 11, textTransform: 'uppercase', color: '#666', letterSpacing: 1, marginBottom: 8 };
const item = { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', color: '#ccc', cursor: 'pointer', borderRadius: 4 };
const agentName = { flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const actions = { display: 'flex', gap: 2 };
const actionBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, padding: '1px 3px', lineHeight: 1 };
const newBtn = { width: '100%', padding: '6px 0', borderRadius: 6, border: '1px dashed #444', background: 'none', color: '#888', cursor: 'pointer', fontSize: 12 };
