import { render, screen, act } from '@testing-library/react';
import { ChatProvider, useChatStore } from '../chatStore';

function Inspector() {
  const { username } = useChatStore();
  return <div data-testid="username">{username}</div>;
}

beforeEach(() => localStorage.clear());

describe('chatStore', () => {
  test('username is empty string when localStorage has no entry', () => {
    render(<ChatProvider><Inspector /></ChatProvider>);
    expect(screen.getByTestId('username').textContent).toBe('');
  });

  test('username is pre-filled from localStorage on mount', () => {
    localStorage.setItem('nexus_username', 'Bob');
    render(<ChatProvider><Inspector /></ChatProvider>);
    expect(screen.getByTestId('username').textContent).toBe('Bob');
  });
});
