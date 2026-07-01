import { useState, useCallback, createContext, useContext, useRef } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [username, setUsername] = useState(() => localStorage.getItem('nexus_username') || '');
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState({}); // threadId -> message[]
  const [activeThread, setActiveThread] = useState(null);
  const [users, setUsers] = useState([]);
  const [docs, setDocs] = useState([]);
  const streamingRef = useRef({}); // messageId -> accumulated tokens

  // Agent state
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentThinking, setAgentThinking] = useState(false);
  const [agentApprovalRequest, setAgentApprovalRequest] = useState(null);

  const saveUsername = useCallback((name) => {
    localStorage.setItem('nexus_username', name);
    setUsername(name);
  }, []);

  const addMessage = useCallback((msg) => {
    if (msg.threadId) {
      setThreads((prev) => ({
        ...prev,
        [msg.threadId]: [...(prev[msg.threadId] || []), msg],
      }));
    } else {
      setMessages((prev) => [...prev, msg]);
    }
  }, []);

  const finalizeLlmMessage = useCallback((msgId, sources, threadId) => {
    const update = (m) => m.id === msgId ? { ...m, sources } : m;
    if (threadId) {
      setThreads((prev) => ({
        ...prev,
        [threadId]: (prev[threadId] || []).map(update),
      }));
    } else {
      setMessages((prev) => prev.map(update));
    }
  }, []);

  const appendLlmToken = useCallback((token, threadId, msgId) => {
    const key = msgId;
    streamingRef.current[key] = (streamingRef.current[key] || '') + token;
    const text = streamingRef.current[key];

    if (threadId) {
      setThreads((prev) => {
        const thread = prev[threadId] || [];
        const existing = thread.find((m) => m.id === msgId);
        if (existing) {
          return { ...prev, [threadId]: thread.map((m) => m.id === msgId ? { ...m, text } : m) };
        }
        return { ...prev, [threadId]: [...thread, { id: msgId, type: 'llm', text, threadId }] };
      });
    } else {
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === msgId);
        if (existing) return prev.map((m) => m.id === msgId ? { ...m, text } : m);
        return [...prev, { id: msgId, type: 'llm', text }];
      });
    }
  }, []);

  // Agent actions
  const openAgent = useCallback((agent) => {
    setActiveAgent(agent);
    setActiveThread(null);
    setAgentMessages([]);
    setAgentThinking(false);
    setAgentApprovalRequest(null);
  }, []);

  const closeAgent = useCallback(() => {
    setActiveAgent(null);
    setAgentMessages([]);
    setAgentThinking(false);
    setAgentApprovalRequest(null);
  }, []);

  const addAgentMessage = useCallback((msg) => {
    setAgentMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const updateAgentMessage = useCallback((id, patch) => {
    setAgentMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
  }, []);

  return (
    <ChatContext.Provider value={{
      username, saveUsername,
      messages, addMessage,
      threads, activeThread, setActiveThread,
      users, setUsers,
      docs, setDocs,
      appendLlmToken,
      finalizeLlmMessage,
      agents, setAgents,
      activeAgent, openAgent, closeAgent,
      agentMessages, addAgentMessage, updateAgentMessage,
      agentThinking, setAgentThinking,
      agentApprovalRequest, setAgentApprovalRequest,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  return useContext(ChatContext);
}
