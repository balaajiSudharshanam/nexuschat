import { useState } from 'react';
import { useChatStore, ChatProvider } from './store/chatStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useMobile } from './hooks/useMobile';
import UsernameModal from './components/common/UsernameModal';
import OfflineBanner from './components/common/OfflineBanner';
import Sidebar from './components/Sidebar/Sidebar';
import ChatRoom from './components/Chat/ChatRoom';
import ThreadPanel from './components/Thread/ThreadPanel';

function Inner() {
  const { username, activeThread } = useChatStore();
  const { connected, send } = useWebSocket();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {!username && <UsernameModal />}
      {!connected && <OfflineBanner />}

      {/* Backdrop for mobile overlays */}
      {isMobile && (sidebarOpen || activeThread) && (
        <div
          onClick={() => { setSidebarOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}

      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChatRoom send={send} isMobile={isMobile} onMenuClick={() => setSidebarOpen(o => !o)} />
      {activeThread && <ThreadPanel send={send} isMobile={isMobile} />}
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <Inner />
    </ChatProvider>
  );
}
