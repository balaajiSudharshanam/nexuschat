import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '../../../store/chatStore';
import UsernameModal from '../UsernameModal';

function renderModal() {
  return render(
    <ChatProvider>
      <UsernameModal />
    </ChatProvider>
  );
}

beforeEach(() => localStorage.clear());

describe('UsernameModal', () => {
  test('submitting saves username to localStorage', async () => {
    renderModal();
    await userEvent.type(screen.getByPlaceholderText('Your name'), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));

    expect(localStorage.getItem('nexus_username')).toBe('Alice');
  });

  test('submit button is disabled when input is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /join/i })).toBeDisabled();
  });
});
