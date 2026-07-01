import UserList from './UserList';
import DocList from './DocList';
import AgentList from '../Agents/AgentList';

export default function Sidebar({ isMobile, isOpen, onClose }) {
  const style = isMobile
    ? {
        ...aside,
        position: 'fixed', top: 0, left: 0, bottom: 0,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 100,
      }
    : aside;

  return (
    <aside style={style}>
      <div style={logoRow}>
        <span style={logo}>Nexus</span>
        {isMobile && (
          <button onClick={onClose} style={closeBtn}>✕</button>
        )}
      </div>
      <UserList />
      <DocList />
      <AgentList />
    </aside>
  );
}

const aside = { width: 220, background: '#111', display: 'flex', flexDirection: 'column', gap: 24, padding: '16px 12px', flexShrink: 0, overflowY: 'auto' };
const logoRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px' };
const logo = { fontSize: 18, fontWeight: 700, color: '#4f8ef7' };
const closeBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 };
