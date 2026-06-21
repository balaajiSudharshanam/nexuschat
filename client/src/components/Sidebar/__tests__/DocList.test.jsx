import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { ChatProvider, useChatStore } from '../../../store/chatStore';
import DocList from '../DocList';

vi.mock('../../../api/http', () => ({
  fetchDocs: vi.fn().mockResolvedValue(['report.pdf', 'notes.pdf']),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  uploadPdf: vi.fn(),
}));

import { fetchDocs, deleteDoc } from '../../../api/http';

// Helper component that seeds docs into the store on mount
function InitDocs({ docs }) {
  const { setDocs } = useChatStore();
  useEffect(() => {
    setDocs(docs);
  }, [docs, setDocs]);
  return null;
}

function renderDocList() {
  return render(
    <ChatProvider>
      <InitDocs docs={['report.pdf', 'notes.pdf']} />
      <DocList />
    </ChatProvider>
  );
}

describe('DocList', () => {
  beforeEach(() => {
    deleteDoc.mockClear();
    fetchDocs.mockClear();
    fetchDocs.mockResolvedValue(['report.pdf', 'notes.pdf']);
  });

  test('renders doc names with delete buttons', async () => {
    renderDocList();

    // Wait for InitDocs to seed and DocList's useEffect to settle
    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });
    expect(screen.getByText('notes.pdf')).toBeInTheDocument();

    // There should be a ✕ button for each doc
    const deleteButtons = screen.getAllByRole('button', { name: '✕' });
    expect(deleteButtons).toHaveLength(2);
  });

  test('clicking ✕ calls deleteDoc and removes the doc from the list', async () => {
    const user = userEvent.setup();
    renderDocList();

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '✕' });
    // First button corresponds to the first doc ('report.pdf')
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledWith('report.pdf');
    });

    await waitFor(() => {
      expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
    });
  });

  test('deleting a nonexistent doc (deleteDoc resolves) does not crash', async () => {
    deleteDoc.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDocList();

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '✕' });
    await expect(user.click(deleteButtons[0])).resolves.not.toThrow();

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
