import { useChatStore } from '../../store/chatStore';

function downloadBlob(tool, b64) {
  const isExcel = tool === 'excel';
  const mime = isExcel
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
  const ext = isExcel ? '.xlsx' : '.pdf';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tool}${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AgentMessage({ msg, send }) {
  const { agentApprovalRequest, setAgentApprovalRequest, updateAgentMessage, setAgentThinking } = useChatStore();

  if (msg.type === 'user') {
    return (
      <div style={userRow}>
        <div style={userBubble}>{msg.text}</div>
      </div>
    );
  }

  if (msg.type === 'agent') {
    return (
      <div style={agentRow}>
        <span style={agentLabel}>Agent</span>
        <div style={agentBubble}>{msg.text}</div>
      </div>
    );
  }

  if (msg.type === 'approval') {
    const isPending = agentApprovalRequest?.msgId === msg.msgId;
    const resolved = msg.resolved;

    const handleApprove = () => {
      updateAgentMessage(msg.id, { resolved: 'approved' });
      setAgentApprovalRequest(null);
      setAgentThinking(true);
      send({ type: 'agent_approval_response', approved: true });
    };

    const handleDeny = () => {
      updateAgentMessage(msg.id, { resolved: 'denied' });
      setAgentApprovalRequest(null);
      setAgentThinking(true);
      send({ type: 'agent_approval_response', approved: false });
    };

    return (
      <div style={approvalCard}>
        <div style={approvalTitle}>Tool Request: <strong>{msg.tool}</strong></div>
        <pre style={approvalArgs}>{JSON.stringify(msg.args, null, 2)}</pre>
        {isPending && !resolved ? (
          <div style={approvalBtns}>
            <button onClick={handleApprove} style={approveBtn}>Approve</button>
            <button onClick={handleDeny} style={denyBtn}>Deny</button>
          </div>
        ) : (
          <div style={resolvedLabel(resolved)}>
            {resolved === 'approved' ? 'Approved' : 'Denied'}
          </div>
        )}
      </div>
    );
  }

  if (msg.type === 'tool_result') {
    return (
      <div style={toolResultRow}>
        <span style={toolResultLabel}>{msg.tool} completed —</span>
        <button onClick={() => downloadBlob(msg.tool, msg.data)} style={downloadBtn}>
          Download
        </button>
      </div>
    );
  }

  if (msg.type === 'error') {
    return <div style={errorRow}>{msg.text}</div>;
  }

  return null;
}

const userRow = { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 };
const userBubble = { maxWidth: '70%', background: '#4f8ef7', color: '#fff', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', fontSize: 14, lineHeight: 1.5 };
const agentRow = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 };
const agentLabel = { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 };
const agentBubble = { maxWidth: '80%', background: '#2a2a2a', color: '#e0e0e0', padding: '8px 12px', borderRadius: '2px 12px 12px 12px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' };
const approvalCard = { background: '#1e2a3a', border: '1px solid #2a4a6a', borderRadius: 8, padding: 12, marginBottom: 12, maxWidth: '80%' };
const approvalTitle = { fontSize: 13, color: '#8ab4f8', marginBottom: 8 };
const approvalArgs = { fontSize: 11, color: '#aaa', background: '#111', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 120, marginBottom: 10 };
const approvalBtns = { display: 'flex', gap: 8 };
const approveBtn = { padding: '5px 14px', borderRadius: 6, border: 'none', background: '#1a5a2a', color: '#4caf50', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const denyBtn = { padding: '5px 14px', borderRadius: 6, border: 'none', background: '#3a1a1a', color: '#f88', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const resolvedLabel = (r) => ({ fontSize: 12, color: r === 'approved' ? '#4caf50' : '#f88', fontStyle: 'italic' });
const toolResultRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: '#aaa' };
const toolResultLabel = { fontSize: 12 };
const downloadBtn = { padding: '4px 12px', borderRadius: 6, border: '1px solid #4f8ef7', background: 'none', color: '#4f8ef7', cursor: 'pointer', fontSize: 12 };
const errorRow = { color: '#f88', fontSize: 13, marginBottom: 10, padding: '6px 10px', background: '#2a1a1a', borderRadius: 6 };
