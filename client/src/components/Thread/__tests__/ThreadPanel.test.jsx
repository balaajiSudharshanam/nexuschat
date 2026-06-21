import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { ChatProvider, useChatStore } from '../../../store/chatStore';
import ThreadPanel from '../ThreadPanel';

/** Seeds the store with an activeThread and some thread messages, then renders ThreadPanel. */
function renderThreadPanel({ threadId = 'msg-1', threadMessages = [], send = vi.fn() } = {}) {
  function Seeder() {
    const { setActiveThread, addMessage } = useChatStore();
    useEffect(() => {
      threadMessages.forEach((msg) => addMessage(msg));
      setActiveThread(threadId);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  }

  render(
    <ChatProvider>
      <Seeder />
      <ThreadPanel send={send} />
    </ChatProvider>
  );

  return { send };
}

describe('ThreadPanel', () => {
  test('renders existing thread messages', () => {
    renderThreadPanel({
      threadId: 'msg-1',
      threadMessages: [
        { id: 'reply-1', type: 'message', username: 'Alice', text: 'First reply', threadId: 'msg-1' },
        { id: 'reply-2', type: 'message', username: 'Bob', text: 'Second reply', threadId: 'msg-1' },
      ],
    });

    expect(screen.getByText('First reply')).toBeVisible();
    expect(screen.getByText('Second reply')).toBeVisible();
  });

  test('sending in ThreadPanel includes threadId in the sent payload', async () => {
    const { send } = renderThreadPanel({ threadId: 'msg-99' });

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'thread reply text');
    await userEvent.keyboard('{Enter}');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: 'msg-99', text: 'thread reply text' })
    );
  });
});
