import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeComments } from '../useRealtimeComments';

// Mock Supabase client
const mockSubscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
const mockRemoveChannel = jest.fn();
const mockOn = jest.fn().mockReturnThis();
const mockChannel = jest.fn(() => ({
  on: mockOn,
  subscribe: mockSubscribe,
}));

const mockProfileSelect = jest.fn();
const mockProfileEq = jest.fn(() => ({
  single: jest.fn().mockResolvedValue({
    data: {
      id: 'user-1',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: null,
    },
  }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    from: jest.fn(() => ({
      select: mockProfileSelect.mockReturnValue({
        eq: mockProfileEq,
      }),
    })),
  }),
}));

describe('useRealtimeComments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should subscribe to comments channel on mount', () => {
    renderHook(() =>
      useRealtimeComments({
        taskId: 'task-123',
      })
    );

    expect(mockChannel).toHaveBeenCalledWith('comments-task-123');
    expect(mockOn).toHaveBeenCalledTimes(3); // INSERT, UPDATE, DELETE
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should not subscribe if taskId is empty', () => {
    renderHook(() =>
      useRealtimeComments({
        taskId: '',
      })
    );

    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('should call onCommentInsert callback when INSERT event is received', async () => {
    const onCommentInsert = jest.fn();

    renderHook(() =>
      useRealtimeComments({
        taskId: 'task-123',
        onCommentInsert,
      })
    );

    // Get the INSERT handler from mockOn calls
    const insertHandler = mockOn.mock.calls.find((call) => call[1]?.event === 'INSERT')?.[2];

    expect(insertHandler).toBeDefined();

    // Simulate INSERT event
    const newComment = {
      id: 'comment-1',
      task_id: 'task-123',
      user_id: 'user-1',
      content: 'Test comment',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    await act(async () => {
      await insertHandler({ new: newComment });
    });

    await waitFor(() => {
      expect(onCommentInsert).toHaveBeenCalled();
    });
  });

  it('should call onCommentDelete callback when DELETE event is received', () => {
    const onCommentDelete = jest.fn();

    renderHook(() =>
      useRealtimeComments({
        taskId: 'task-123',
        onCommentDelete,
      })
    );

    // Get the DELETE handler from mockOn calls
    const deleteHandler = mockOn.mock.calls.find((call) => call[1]?.event === 'DELETE')?.[2];

    expect(deleteHandler).toBeDefined();

    // Simulate DELETE event
    act(() => {
      deleteHandler({ old: { id: 'comment-1' } });
    });

    expect(onCommentDelete).toHaveBeenCalledWith('comment-1');
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeComments({
        taskId: 'task-123',
      })
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('should resubscribe when taskId changes', () => {
    const { rerender } = renderHook(
      ({ taskId }) =>
        useRealtimeComments({
          taskId,
        }),
      { initialProps: { taskId: 'task-123' } }
    );

    expect(mockChannel).toHaveBeenCalledWith('comments-task-123');

    rerender({ taskId: 'task-456' });

    expect(mockRemoveChannel).toHaveBeenCalled();
    expect(mockChannel).toHaveBeenCalledWith('comments-task-456');
  });
});
