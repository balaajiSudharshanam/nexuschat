export default function OfflineBanner() {
  const takeOver = () => {
    alert('Run `npm start` in the nexus/server directory on this machine to become the leader.');
  };

  return (
    <div style={banner}>
      <span>Host is offline — reconnecting…</span>
      <button onClick={takeOver} style={btn}>Take over as leader</button>
    </div>
  );
}

const banner = { position: 'fixed', top: 0, left: 0, right: 0, background: '#b45309', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 99, fontSize: 14 };
const btn = { padding: '4px 12px', borderRadius: 6, border: '1px solid #fff', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 13 };
