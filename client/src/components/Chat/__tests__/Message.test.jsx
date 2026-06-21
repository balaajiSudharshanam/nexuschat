import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider, useChatStore } from '../../../store/chatStore';
import Message from '../Message';

function ActiveThreadInspector() {
  const { activeThread } = useChatStore();
  return <div data-testid="active-thread">{activeThread ?? 'none'}</div>;
}

function renderMessage(msg) {
  render(
    <ChatProvider>
      <Message msg={msg} />
      <ActiveThreadInspector />
    </ChatProvider>
  );
}

describe('Message', () => {
  test('shows a Reply button', () => {
    renderMessage({ id: 'msg-1', type: 'message', username: 'Alice', text: 'Hello' });
    expect(screen.getByRole('button', { name: /reply/i })).toBeVisible();
  });

  test('clicking Reply sets activeThread in the store to the message id', async () => {
    renderMessage({ id: 'msg-42', type: 'message', username: 'Bob', text: 'Hi' });
    expect(screen.getByTestId('active-thread').textContent).toBe('none');

    await userEvent.click(screen.getByRole('button', { name: /reply/i }));

    expect(screen.getByTestId('active-thread').textContent).toBe('msg-42');
  });
});
