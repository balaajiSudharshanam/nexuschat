import { renderHook, act } from '@testing-library/react';
import { useEffect } from 'react';
import { ChatProvider, useChatStore } from '../../store/chatStore';
import { useDocAutocomplete } from '../useDocAutocomplete';

function InitDocs({ docs }) {
  const { setDocs } = useChatStore();
  useEffect(() => setDocs(docs), []);
  return null;
}

function Wrapper({ children, initialDocs = [] }) {
  return (
    <ChatProvider>
      <InitDocs docs={initialDocs} />
      {children}
    </ChatProvider>
  );
}

describe('useDocAutocomplete', () => {
  test('returns no suggestions when text has no @llm /doc: token', () => {
    const { result } = renderHook(() => useDocAutocomplete(), {
      wrapper: ({ children }) => (
        <Wrapper initialDocs={['report.pdf', 'notes.pdf']}>{children}</Wrapper>
      ),
    });

    act(() => {
      result.current.check('hello world');
    });

    expect(result.current.suggestions).toEqual([]);
  });

  test('returns matching docs when prefix partially matches', () => {
    const { result } = renderHook(() => useDocAutocomplete(), {
      wrapper: ({ children }) => (
        <Wrapper initialDocs={['report.pdf', 'notes.pdf']}>{children}</Wrapper>
      ),
    });

    act(() => {
      result.current.check('@llm /doc:rep');
    });

    expect(result.current.suggestions).toEqual(['report.pdf']);
  });

  test('clears suggestions when @llm /doc: token is removed', () => {
    const { result } = renderHook(() => useDocAutocomplete(), {
      wrapper: ({ children }) => (
        <Wrapper initialDocs={['report.pdf', 'notes.pdf']}>{children}</Wrapper>
      ),
    });

    act(() => {
      result.current.check('@llm /doc:rep');
    });
    expect(result.current.suggestions).toEqual(['report.pdf']);

    act(() => {
      result.current.check('just plain text');
    });
    expect(result.current.suggestions).toEqual([]);
  });

  test('returns all docs when prefix is empty', () => {
    const { result } = renderHook(() => useDocAutocomplete(), {
      wrapper: ({ children }) => (
        <Wrapper initialDocs={['report.pdf', 'notes.pdf']}>{children}</Wrapper>
      ),
    });

    act(() => {
      result.current.check('@llm /doc:');
    });

    expect(result.current.suggestions).toEqual(['report.pdf', 'notes.pdf']);
  });
});
