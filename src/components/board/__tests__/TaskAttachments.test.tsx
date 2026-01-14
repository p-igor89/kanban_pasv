import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn<Promise<any>, any[]>();
global.fetch = mockFetch;

// Mock toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: mockToast,
}));

// Import component after mocks
import TaskAttachments from '../TaskAttachments';

const mockAttachments = [
  {
    id: 'attachment-1',
    task_id: 'task-1',
    user_id: 'user-1',
    filename: 'test-file.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    storage_path: 'board-1/task-1/test-file.pdf',
    created_at: '2026-01-01T00:00:00Z',
    url: 'https://example.com/test-file.pdf',
  },
  {
    id: 'attachment-2',
    task_id: 'task-1',
    user_id: 'user-1',
    filename: 'image.png',
    file_size: 2048,
    mime_type: 'image/png',
    storage_path: 'board-1/task-1/image.png',
    created_at: '2026-01-01T00:00:00Z',
    url: 'https://example.com/image.png',
  },
];

describe('TaskAttachments', () => {
  const boardId = 'board-1';
  const taskId = 'task-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Fetching attachments', () => {
    it('should fetch and display attachments on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
        expect(screen.getByText('image.png')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/boards/${boardId}/tasks/${taskId}/attachments`);
    });

    it('should display "No attachments yet" when empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: [] }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('No attachments yet')).toBeInTheDocument();
      });
    });

    it('should show attachment count in header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Deleting attachments', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      // ConfirmDialog should appear
      await waitFor(() => {
        expect(screen.getByText('Delete File')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('should delete attachment when confirmed via dialog', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Setup delete response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Click delete button (icon button with title)
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the confirm button inside dialog (text button, not icon)
      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector('button.bg-red-600');
      expect(confirmButton).not.toBeNull();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/boards/${boardId}/tasks/${taskId}/attachments?attachmentId=attachment-1`,
          { method: 'DELETE' }
        );
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('File deleted');
      });
    });

    it('should close dialog when cancelled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Delete File')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Delete File')).not.toBeInTheDocument();
      });

      // Should not call delete API
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    it('should show error toast when delete fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Setup failed delete response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not authorized' }),
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the confirm button inside dialog
      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector('button.bg-red-600');
      expect(confirmButton).not.toBeNull();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to delete file');
      });
    });
  });

  describe('File size formatting', () => {
    it('should display file size correctly', async () => {
      const attachmentWith1KB = {
        ...mockAttachments[0],
        file_size: 1024, // 1 KB
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: [attachmentWith1KB] }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Check file size is displayed
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    });
  });
});
