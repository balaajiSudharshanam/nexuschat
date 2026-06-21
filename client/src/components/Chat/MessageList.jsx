import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import Message from './Message';

export default function MessageList() {
  const { messages } = useChatStore();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={list}>
      {messages.map((msg, i) => <Message key={msg.id || i} msg={msg} />)}
      <div ref={bottomRef} />
    </div>
  );
}

const list = { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 };
