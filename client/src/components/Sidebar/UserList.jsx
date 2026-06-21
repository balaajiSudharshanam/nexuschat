import { useChatStore } from '../../store/chatStore';

export default function UserList() {
  const { users, username } = useChatStore();

  return (
    <section>
      <h3 style={heading}>Online ({users.length})</h3>
      <ul style={{ listStyle: 'none' }}>
        {users.map((u) => (
          <li key={u} style={item}>
            <span style={dot} />
            {u}{u === username ? ' (you)' : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}

const heading = { fontSize: 11, textTransform: 'uppercase', color: '#666', letterSpacing: 1, marginBottom: 8 };
const item = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: '#ccc' };
const dot = { width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 };
