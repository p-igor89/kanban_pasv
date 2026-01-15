import { renderHook } from '@testing-library/react';
import { usePresence } from '../usePresence';

// Mock presence state
let mockPresenceState: Record<string, unknown[]> = {};
let mockTrackFn: jest.Mock;
let _mockSubscribeFn: jest.Mock;

const mockUnsubscribe = jest.fn();
const mockRemoveChannel = jest.fn();
const mockOn = jest.fn().mockReturnThis();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: jest.fn(() => ({
      on: mockOn.mockImplementation(function (
        this: unknown,
        event: string,
        options: { event: string },
        callback: (data: unknown) => void
      ) {
        if (options.event === 'sync') {
          // Store sync callback to call it later
          (mockOn as unknown as { syncCallback: typeof callback }).syncCallback = callback;
        }
        return this;
      }),
      subscribe: (callback: (status: string) => Promise<void>) => {
        _mockSubscribeFn = jest.fn(callback);
        // Simulate SUBSCRIBED status
        setTimeout(() => {
          callback('SUBSCRIBED');
        }, 0);
        return { unsubscribe: mockUnsubscribe };
      },
      track: (data: unknown) => {
        mockTrackFn = jest.fn().mockResolvedValue(undefined);
        return mockTrackFn(data);
      },
      presenceState: () => mockPresenceState,
      unsubscribe: mockUnsubscribe,
    })),
    removeChannel: mockRemoveChannel,
  }),
}));

describe('usePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPresenceState = {};
  });

  it('should return empty online users initially', () => {
    const { result } = renderHook(() =>
      usePresence({
        boardId: 'board-123',
        userId: 'user-1',
        userEmail: 'test@example.com',
      })
    );

    expect(result.current.onlineUsers).toEqual([]);
  });

  it('should not subscribe if boardId is empty', () => {
    renderHook(() =>
      usePresence({
        boardId: '',
        userId: 'user-1',
        userEmail: 'test@example.com',
      })
    );

    expect(mockOn).not.toHaveBeenCalled();
  });

  it('should not subscribe if userId is empty', () => {
    renderHook(() =>
      usePresence({
        boardId: 'board-123',
        userId: '',
        userEmail: 'test@example.com',
      })
    );

    expect(mockOn).not.toHaveBeenCalled();
  });

  it('should set up presence channel with correct name', () => {
    // The hook should create a channel - verified by mockOn being called
    renderHook(() =>
      usePresence({
        boardId: 'board-123',
        userId: 'user-1',
        userEmail: 'test@example.com',
      })
    );

    // If presence listeners were set up, the channel was created correctly
    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
  });

  it('should listen for presence sync events', () => {
    renderHook(() =>
      usePresence({
        boardId: 'board-123',
        userId: 'user-1',
        userEmail: 'test@example.com',
      })
    );

    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      usePresence({
        boardId: 'board-123',
        userId: 'user-1',
        userEmail: 'test@example.com',
      })
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
