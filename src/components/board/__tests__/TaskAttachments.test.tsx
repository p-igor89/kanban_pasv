import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock fetch
const mockFetch = jest.fn();
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

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

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
    it('should delete attachment when confirmed', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Setup confirm and delete response
      mockConfirm.mockReturnValueOnce(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Find and click delete button for first attachment
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith('Delete "test-file.pdf"?');
      });

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

    it('should not delete attachment when cancelled', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Setup confirm to return false (cancelled)
      mockConfirm.mockReturnValueOnce(false);

      // Find and click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalled();

      // Should not call delete API
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    it('should show error toast when delete fails', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      // Setup confirm and failed delete response
      mockConfirm.mockReturnValueOnce(true);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not authorized' }),
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to delete file');
      });
    });

    it('should remove attachment from list after successful delete', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attachments: mockAttachments }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
        expect(screen.getByText('image.png')).toBeInTheDocument();
      });

      // Setup confirm and delete response
      mockConfirm.mockReturnValueOnce(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Delete first attachment
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('test-file.pdf')).not.toBeInTheDocument();
      });

      // Second attachment should still be there
      expect(screen.getByText('image.png')).toBeInTheDocument();
      expect(screen.getByText('Attachments (1)')).toBeInTheDocument();
    });
  });

  describe('File size formatting', () => {
    it('should display file size correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            attachments: [
              {
                ...mockAttachments[0],
                file_size: 1024, // 1 KB
              },
            ],
          }),
      });

      render(<TaskAttachments boardId={boardId} taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      });
    });
  });
});
