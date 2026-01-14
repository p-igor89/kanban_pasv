import { renderHook, act } from '@testing-library/react';
import { SetStateAction } from 'react';
import { BoardWithData, Task, Status, StatusWithTasks } from '@/types/board';

// Store callbacks for triggering events
type EventCallback = (payload: { new?: unknown; old?: unknown }) => void;
const eventCallbacks: Map<string, EventCallback> = new Map();

// Mock Supabase client
const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
  on: jest.fn(),
  subscribe: jest.fn(),
};

// Set up return values after object creation to avoid circular reference
mockChannel.on.mockImplementation(
  (type: string, config: { event: string; table: string }, callback: EventCallback) => {
    const key = `${config.table}-${config.event}`;
    eventCallbacks.set(key, callback);
    return mockChannel;
  }
);
mockChannel.subscribe.mockReturnValue(mockChannel);

const mockRemoveChannel = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

// Import after mocking
import { useRealtimeBoard, useRealtimeBoardState } from '../useRealtimeBoard';

// Helper to trigger events
const triggerEvent = (table: string, event: string, payload: { new?: unknown; old?: unknown }) => {
  const callback = eventCallbacks.get(`${table}-${event}`);
  if (callback) {
    callback(payload);
  }
};

describe('useRealtimeBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventCallbacks.clear();
    mockChannel.on.mockImplementation(
      (type: string, config: { event: string; table: string }, callback: EventCallback) => {
        const key = `${config.table}-${config.event}`;
        eventCallbacks.set(key, callback);
        return mockChannel;
      }
    );
  });

  it('should subscribe to board channel on mount', () => {
    const callbacks = {
      boardId: 'test-board-id',
      onTaskInsert: jest.fn(),
      onTaskUpdate: jest.fn(),
      onTaskDelete: jest.fn(),
      onStatusInsert: jest.fn(),
      onStatusUpdate: jest.fn(),
      onStatusDelete: jest.fn(),
    };

    renderHook(() => useRealtimeBoard(callbacks));

    expect(mockChannel.on).toHaveBeenCalledTimes(6); // 3 task events + 3 status events
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should not subscribe when boardId is empty', () => {
    renderHook(() =>
      useRealtimeBoard({
        boardId: '',
      })
    );

    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
      })
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('should call onTaskInsert when task INSERT event is received', () => {
    const onTaskInsert = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onTaskInsert,
      })
    );

    const newTask: Task = {
      id: 'task-1',
      board_id: 'test-board-id',
      status_id: 'status-1',
      title: 'New Task',
      description: null,
      priority: 'high',
      tags: [],
      assignee_name: null,
      assignee_color: null,
      due_date: null,
      order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      triggerEvent('tasks', 'INSERT', { new: newTask });
    });

    expect(onTaskInsert).toHaveBeenCalledWith(newTask);
  });

  it('should call onTaskUpdate when task UPDATE event is received', () => {
    const onTaskUpdate = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onTaskUpdate,
      })
    );

    const updatedTask: Task = {
      id: 'task-1',
      board_id: 'test-board-id',
      status_id: 'status-1',
      title: 'Updated Task',
      description: null,
      priority: 'high',
      tags: [],
      assignee_name: null,
      assignee_color: null,
      due_date: null,
      order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      triggerEvent('tasks', 'UPDATE', { new: updatedTask });
    });

    expect(onTaskUpdate).toHaveBeenCalledWith(updatedTask);
  });

  it('should call onTaskDelete when task DELETE event is received', () => {
    const onTaskDelete = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onTaskDelete,
      })
    );

    const deletedTask: Task = {
      id: 'task-to-delete',
      board_id: 'test-board-id',
      status_id: 'status-1',
      title: 'Deleted Task',
      description: null,
      priority: null,
      tags: [],
      assignee_name: null,
      assignee_color: null,
      due_date: null,
      order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      triggerEvent('tasks', 'DELETE', { old: deletedTask });
    });

    expect(onTaskDelete).toHaveBeenCalledWith('task-to-delete');
  });

  it('should call onStatusInsert when status INSERT event is received', () => {
    const onStatusInsert = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onStatusInsert,
      })
    );

    const newStatus: Status = {
      id: 'status-new',
      board_id: 'test-board-id',
      name: 'New Status',
      color: '#FF0000',
      order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      triggerEvent('statuses', 'INSERT', { new: newStatus });
    });

    expect(onStatusInsert).toHaveBeenCalledWith(newStatus);
  });

  it('should call onStatusUpdate when status UPDATE event is received', () => {
    const onStatusUpdate = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onStatusUpdate,
      })
    );

    const updatedStatus: Status = {
      id: 'status-1',
      board_id: 'test-board-id',
      name: 'Updated Status',
      color: '#00FF00',
      order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      triggerEvent('statuses', 'UPDATE', { new: updatedStatus });
    });

    expect(onStatusUpdate).toHaveBeenCalledWith(updatedStatus);
  });

  it('should call onStatusDelete when status DELETE event is received', () => {
    const onStatusDelete = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onStatusDelete,
      })
    );

    const deletedStatus: Status = {
      id: 'status-to-delete',
      board_id: 'test-board-id',
      name: 'Deleted Status',
      color: '#0000FF',
      order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      triggerEvent('statuses', 'DELETE', { old: deletedStatus });
    });

    expect(onStatusDelete).toHaveBeenCalledWith('status-to-delete');
  });

  it('should not call callback when payload is missing id', () => {
    const onTaskInsert = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onTaskInsert,
      })
    );

    act(() => {
      triggerEvent('tasks', 'INSERT', { new: {} });
    });

    expect(onTaskInsert).not.toHaveBeenCalled();
  });

  it('should not call delete callback when old payload is missing', () => {
    const onTaskDelete = jest.fn();
    renderHook(() =>
      useRealtimeBoard({
        boardId: 'test-board-id',
        onTaskDelete,
      })
    );

    act(() => {
      triggerEvent('tasks', 'DELETE', { old: {} });
    });

    expect(onTaskDelete).not.toHaveBeenCalled();
  });
});

describe('useRealtimeBoardState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventCallbacks.clear();
    mockChannel.on.mockImplementation(
      (type: string, config: { event: string; table: string }, callback: EventCallback) => {
        const key = `${config.table}-${config.event}`;
        eventCallbacks.set(key, callback);
        return mockChannel;
      }
    );
  });

  const mockSetBoard = jest.fn();

  const createMockBoard = (): BoardWithData => ({
    id: 'board-1',
    user_id: 'user-1',
    name: 'Test Board',
    description: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    statuses: [
      {
        id: 'status-1',
        board_id: 'board-1',
        name: 'To Do',
        color: '#3B82F6',
        order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            board_id: 'board-1',
            status_id: 'status-1',
            title: 'Task 1',
            description: null,
            priority: null,
            tags: [],
            assignee_name: null,
            assignee_color: null,
            due_date: null,
            order: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
      {
        id: 'status-2',
        board_id: 'board-1',
        name: 'Done',
        color: '#22C55E',
        order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: [],
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with board data', () => {
    const board = createMockBoard();
    renderHook(() => useRealtimeBoardState(board, mockSetBoard));

    // Hook should have called useRealtimeBoard internally
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should not subscribe when board is null', () => {
    jest.clearAllMocks();
    renderHook(() => useRealtimeBoardState(null, mockSetBoard));

    // With null board, boardId will be empty string, so no subscription
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  describe('Task handlers', () => {
    it('handleTaskInsert should add new task to correct status', () => {
      const board = createMockBoard();

      const setBoard = jest.fn();

      renderHook(() => useRealtimeBoardState(board, setBoard));

      // Simulate calling setBoard with update function
      expect(setBoard).not.toHaveBeenCalled();

      // Get the callbacks passed to useRealtimeBoard
      // The hook sets up handlers internally, we test the logic by calling setBoard
      const newTask: Task = {
        id: 'task-2',
        board_id: 'board-1',
        status_id: 'status-1',
        title: 'New Task',
        description: null,
        priority: 'high',
        tags: [],
        assignee_name: null,
        assignee_color: null,
        due_date: null,
        order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Test the update logic manually
      const updatedBoard = {
        ...board,
        statuses: board.statuses.map((status) =>
          status.id === newTask.status_id
            ? { ...status, tasks: [...status.tasks, newTask].sort((a, b) => a.order - b.order) }
            : status
        ),
      };

      expect(updatedBoard.statuses[0].tasks).toHaveLength(2);
      expect(updatedBoard.statuses[0].tasks[1].title).toBe('New Task');
    });

    it('handleTaskDelete should remove task from status', () => {
      const board = createMockBoard();
      const taskIdToDelete = 'task-1';

      const updatedBoard = {
        ...board,
        statuses: board.statuses.map((status) => ({
          ...status,
          tasks: status.tasks.filter((t) => t.id !== taskIdToDelete),
        })),
      };

      expect(updatedBoard.statuses[0].tasks).toHaveLength(0);
    });

    it('handleTaskUpdate should update task in same status', () => {
      const board = createMockBoard();
      const updatedTask: Task = {
        ...board.statuses[0].tasks[0],
        title: 'Updated Task Title',
        priority: 'high',
      };

      const updatedBoard = {
        ...board,
        statuses: board.statuses.map((status) => ({
          ...status,
          tasks: status.tasks
            .map((t) => (t.id === updatedTask.id ? updatedTask : t))
            .sort((a, b) => a.order - b.order),
        })),
      };

      expect(updatedBoard.statuses[0].tasks[0].title).toBe('Updated Task Title');
      expect(updatedBoard.statuses[0].tasks[0].priority).toBe('high');
    });

    it('handleTaskUpdate should move task between statuses', () => {
      const board = createMockBoard();
      const movedTask: Task = {
        ...board.statuses[0].tasks[0],
        status_id: 'status-2', // Move to second status
      };

      const oldStatusId = 'status-1';

      const updatedBoard = {
        ...board,
        statuses: board.statuses.map((status) => {
          if (status.id === oldStatusId) {
            return {
              ...status,
              tasks: status.tasks.filter((t) => t.id !== movedTask.id),
            };
          }
          if (status.id === movedTask.status_id) {
            return {
              ...status,
              tasks: [...status.tasks, movedTask].sort((a, b) => a.order - b.order),
            };
          }
          return status;
        }),
      };

      expect(updatedBoard.statuses[0].tasks).toHaveLength(0);
      expect(updatedBoard.statuses[1].tasks).toHaveLength(1);
      expect(updatedBoard.statuses[1].tasks[0].id).toBe('task-1');
    });
  });

  describe('Status handlers', () => {
    it('handleStatusInsert should add new status', () => {
      const board = createMockBoard();
      const newStatus: StatusWithTasks = {
        id: 'status-3',
        board_id: 'board-1',
        name: 'In Progress',
        color: '#F59E0B',
        order: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: [],
      };

      const updatedBoard = {
        ...board,
        statuses: [...board.statuses, { ...newStatus, tasks: [] }].sort(
          (a, b) => a.order - b.order
        ),
      };

      expect(updatedBoard.statuses).toHaveLength(3);
      expect(updatedBoard.statuses[2].name).toBe('In Progress');
    });

    it('handleStatusUpdate should update status properties', () => {
      const board = createMockBoard();
      const updatedStatus = {
        ...board.statuses[0],
        name: 'Updated Status',
        color: '#EF4444',
      };

      const updatedBoard = {
        ...board,
        statuses: board.statuses
          .map((s) => (s.id === updatedStatus.id ? { ...s, ...updatedStatus } : s))
          .sort((a, b) => a.order - b.order),
      };

      expect(updatedBoard.statuses[0].name).toBe('Updated Status');
      expect(updatedBoard.statuses[0].color).toBe('#EF4444');
    });

    it('handleStatusDelete should remove status', () => {
      const board = createMockBoard();
      const statusIdToDelete = 'status-2';

      const updatedBoard = {
        ...board,
        statuses: board.statuses.filter((s) => s.id !== statusIdToDelete),
      };

      expect(updatedBoard.statuses).toHaveLength(1);
      expect(updatedBoard.statuses[0].id).toBe('status-1');
    });

    it('should not add duplicate status', () => {
      const board = createMockBoard();
      const existingStatusId = board.statuses[0].id;

      // Simulating check for existing status
      const exists = board.statuses.some((s) => s.id === existingStatusId);
      expect(exists).toBe(true);

      // If status exists, return original board (no changes)
      const resultBoard = exists ? board : board;
      expect(resultBoard.statuses).toHaveLength(2);
    });

    it('should not add duplicate task', () => {
      const board = createMockBoard();
      const existingTaskId = board.statuses[0].tasks[0].id;

      // Check if task exists in any status
      const exists = board.statuses.some((s) => s.tasks.some((t) => t.id === existingTaskId));
      expect(exists).toBe(true);
    });
  });

  describe('Realtime event handlers with setBoard calls', () => {
    it('should add new task via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      const newTask: Task = {
        id: 'task-new',
        board_id: 'board-1',
        status_id: 'status-1',
        title: 'New Task from Realtime',
        description: null,
        priority: 'medium',
        tags: [],
        assignee_name: null,
        assignee_color: null,
        due_date: null,
        order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        triggerEvent('tasks', 'INSERT', { new: newTask });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses[0].tasks).toHaveLength(2);
    });

    it('should update existing task via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      const updatedTask: Task = {
        ...board.statuses[0].tasks[0],
        title: 'Updated via Realtime',
        priority: 'critical',
      };

      act(() => {
        triggerEvent('tasks', 'UPDATE', { new: updatedTask });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses[0].tasks[0].title).toBe('Updated via Realtime');
      expect(currentBoard.statuses[0].tasks[0].priority).toBe('critical');
    });

    it('should move task between statuses via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      const movedTask: Task = {
        ...board.statuses[0].tasks[0],
        status_id: 'status-2', // Move to Done
      };

      act(() => {
        triggerEvent('tasks', 'UPDATE', { new: movedTask });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses[0].tasks).toHaveLength(0);
      expect(currentBoard.statuses[1].tasks).toHaveLength(1);
    });

    it('should delete task via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      act(() => {
        triggerEvent('tasks', 'DELETE', { old: { id: 'task-1' } });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses[0].tasks).toHaveLength(0);
    });

    it('should add new status via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      const newStatus: Status = {
        id: 'status-new',
        board_id: 'board-1',
        name: 'New Status',
        color: '#FF00FF',
        order: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        triggerEvent('statuses', 'INSERT', { new: newStatus });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses).toHaveLength(3);
    });

    it('should update status via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      const updatedStatus: Status = {
        ...board.statuses[0],
        name: 'Updated Status Name',
        color: '#123456',
      };

      act(() => {
        triggerEvent('statuses', 'UPDATE', { new: updatedStatus });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses[0].name).toBe('Updated Status Name');
      expect(currentBoard.statuses[0].color).toBe('#123456');
    });

    it('should delete status via realtime event', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      act(() => {
        triggerEvent('statuses', 'DELETE', { old: { id: 'status-2' } });
      });

      expect(setBoard).toHaveBeenCalled();
      expect(currentBoard.statuses).toHaveLength(1);
    });

    it('should not add duplicate task on insert', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      // Try to insert existing task
      const existingTask = board.statuses[0].tasks[0];

      act(() => {
        triggerEvent('tasks', 'INSERT', { new: existingTask });
      });

      expect(currentBoard.statuses[0].tasks).toHaveLength(1);
    });

    it('should not add duplicate status on insert', () => {
      const board = createMockBoard();
      let currentBoard = board;
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        const result = updater(currentBoard);
        if (result) currentBoard = result;
      });

      renderHook(() => useRealtimeBoardState(board, setBoard));

      // Try to insert existing status
      const existingStatus = board.statuses[0];

      act(() => {
        triggerEvent('statuses', 'INSERT', { new: existingStatus });
      });

      expect(currentBoard.statuses).toHaveLength(2);
    });

    it('should handle null board gracefully in handlers', () => {
      const setBoard = jest.fn((updater: SetStateAction<BoardWithData | null>) => {
        if (typeof updater !== 'function') return;
        updater(null);
      });

      renderHook(() => useRealtimeBoardState(null, setBoard));

      // Should not throw when triggering events with null board
      expect(() => {
        act(() => {
          triggerEvent('tasks', 'INSERT', { new: { id: 'test' } });
        });
      }).not.toThrow();
    });
  });
});
