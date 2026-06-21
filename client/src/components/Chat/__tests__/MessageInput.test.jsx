import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '../../../store/chatStore';
import MessageInput from '../MessageInput';

function renderInput(onSend = vi.fn()) {
  render(
    <ChatProvider>
      <MessageInput onSend={onSend} />
    </ChatProvider>
  );
  return { onSend, textarea: screen.getByRole('textbox') };
}

describe('MessageInput', () => {
  test('Enter sends the message and clears the input', async () => {
    const { onSend, textarea } = renderInput();

    await userEvent.type(textarea, 'hello world');
    await userEvent.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledWith('hello world');
    expect(textarea).toHaveValue('');
  });

  test('Shift+Enter inserts a newline and does not send', async () => {
    const { onSend, textarea } = renderInput();

    await userEvent.type(textarea, 'line one');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await userEvent.type(textarea, 'line two');

    expect(onSend).not.toHaveBeenCalled();
    expect(textarea.value).toContain('\n');
  });

  test('whitespace-only input does not call onSend', async () => {
    const { onSend, textarea } = renderInput();

    await userEvent.type(textarea, '   ');
    await userEvent.keyboard('{Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  test('Send button calls onSend with the typed text', async () => {
    const { onSend, textarea } = renderInput();

    await userEvent.type(textarea, 'hello via button');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('hello via button');
  });
});
