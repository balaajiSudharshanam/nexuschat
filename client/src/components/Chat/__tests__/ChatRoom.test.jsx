import { render, fireEvent, waitFor, createEvent } from '@testing-library/react';
import { ChatProvider } from '../../../store/chatStore';
import ChatRoom from '../ChatRoom';
import { uploadPdf, fetchDocs } from '../../../api/http';

vi.mock('../../../api/http', () => ({
  uploadPdf: vi.fn().mockResolvedValue({ docName: 'test.pdf', chunkCount: 3 }),
  fetchDocs: vi.fn().mockResolvedValue(['test.pdf']),
  deleteDoc: vi.fn(),
}));

vi.mock('../MessageList', () => ({ default: () => <div data-testid="msg-list" /> }));
vi.mock('../MessageInput', () => ({ default: ({ onSend }) => <button onClick={() => onSend('hi')}>Send</button> }));

function renderChatRoom(send = vi.fn()) {
  return render(
    <ChatProvider>
      <ChatRoom send={send} />
    </ChatProvider>
  );
}

describe('ChatRoom drag-and-drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('drag overlay shows on dragover', () => {
    const { container } = renderChatRoom();
    const mainEl = container.querySelector('main');

    fireEvent.dragOver(mainEl);

    expect(container.querySelector('[data-testid="drop-overlay"]')).toBeInTheDocument();
  });

  test('drag overlay hides on dragleave', () => {
    const { container } = renderChatRoom();
    const mainEl = container.querySelector('main');

    fireEvent.dragOver(mainEl);
    fireEvent.dragLeave(mainEl);

    expect(container.querySelector('[data-testid="drop-overlay"]')).not.toBeInTheDocument();
  });

  test('dropping a PDF uploads it', async () => {
    const { container } = renderChatRoom();
    const mainEl = container.querySelector('main');

    const pdfFile = new File(['content'], 'report.pdf', { type: 'application/pdf' });
    const dropEvent = createEvent.drop(mainEl);
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [pdfFile] },
    });
    fireEvent(mainEl, dropEvent);

    await waitFor(() => expect(uploadPdf).toHaveBeenCalledWith(pdfFile));
  });

  test('dropping a non-PDF shows error and does not upload', async () => {
    const { container } = renderChatRoom();
    const mainEl = container.querySelector('main');

    const pngFile = new File(['data'], 'photo.png', { type: 'image/png' });
    const dropEvent = createEvent.drop(mainEl);
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [pngFile] },
    });
    fireEvent(mainEl, dropEvent);

    expect(uploadPdf).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(container.querySelector('[data-testid="upload-error"]')).toBeInTheDocument()
    );
  });
});
