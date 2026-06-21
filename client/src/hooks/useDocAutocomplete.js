import { useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';

export function useDocAutocomplete() {
  const { docs } = useChatStore();
  const [suggestions, setSuggestions] = useState([]);
  const [mode, setMode] = useState(null); // 'llm' | 'doc'

  const check = useCallback((text) => {
    // @llm /doc:<prefix> — filter doc names
    const docMatch = text.match(/@llm\s+\/doc:(\S*)$/i);
    if (docMatch) {
      const prefix = docMatch[1].toLowerCase();
      setSuggestions(docs.filter((d) => d.toLowerCase().startsWith(prefix)));
      setMode('doc');
      return;
    }

    // bare @llm (with optional space, no /doc: yet) — show all options
    const llmMatch = text.match(/@llm\s*$/i);
    if (llmMatch) {
      setSuggestions(docs);
      setMode('llm');
      return;
    }

    setSuggestions([]);
    setMode(null);
  }, [docs]);

  return { suggestions, check, mode };
}
