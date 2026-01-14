import { renderHook, act } from '@testing-library/react';
import { useBoardState } from '../useBoardState';
import type { BoardWithData, Task } from '@/types/board';

describe('useBoardState', () => {
  const mockBoard: BoardWithData = {
    id: 'board-1',
    user_id: 'user-1',
    name: 'Test Board',
    description: 'Test Description',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    statuses: [
      {
        id: 'status-1',
        board_id: 'board-1',
        name: 'Todo',
        color: 'blue',
        order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: [],
      },
    ],
  };

  const mockTask: Task = {
    id: 'task-1',
    board_id: 'board-1',
    status_id: 'status-1',
    title: 'Test Task',
    description: null,
    priority: 'medium',
    tags: [],
    assignee_name: null,
    assignee_color: null,
    due_date: null,
    order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBoardState());

    expect(result.current.state.board).toBeNull();
    expect(result.current.state.loading).toBe(true);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.isTaskModalOpen).toBe(false);
    expect(result.current.state.isDrawerOpen).toBe(false);
    expect(result.current.state.currentUserRole).toBe('viewer');
  });

  it('should set board', () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      result.current.actions.setBoard(mockBoard);
    });

    expect(result.current.state.board).toEqual(mockBoard);
    expect(result.current.state.loading).toBe(false);
  });

  it('should open and close task modal', () => {
    const { result } = renderHook(() => useBoardState());

    // Open modal
    act(() => {
      result.current.actions.openTaskModal('status-1');
    });

    expect(result.current.state.isTaskModalOpen).toBe(true);
    expect(result.current.state.defaultStatusId).toBe('status-1');

    // Close modal
    act(() => {
      result.current.actions.closeTaskModal();
    });

    expect(result.current.state.isTaskModalOpen).toBe(false);
    expect(result.current.state.defaultStatusId).toBeNull();
  });

  it('should open and close drawer', () => {
    const { result } = renderHook(() => useBoardState());

    // Open drawer
    act(() => {
      result.current.actions.openDrawer(mockTask);
    });

    expect(result.current.state.isDrawerOpen).toBe(true);
    expect(result.current.state.selectedTask).toEqual(mockTask);

    // Close drawer
    act(() => {
      result.current.actions.closeDrawer();
    });

    expect(result.current.state.isDrawerOpen).toBe(false);
    expect(result.current.state.selectedTask).toBeNull();
  });

  it('should add task to board', () => {
    const { result } = renderHook(() => useBoardState());

    // Set board first
    act(() => {
      result.current.actions.setBoard(mockBoard);
    });

    // Add task
    act(() => {
      result.current.actions.addTask(mockTask);
    });

    expect(result.current.state.board?.statuses[0].tasks).toHaveLength(1);
    expect(result.current.state.board?.statuses[0].tasks[0]).toEqual(mockTask);
  });

  it('should update task in board', () => {
    const { result } = renderHook(() => useBoardState());

    // Set board with task
    const boardWithTask = {
      ...mockBoard,
      statuses: [
        {
          ...mockBoard.statuses[0],
          tasks: [mockTask],
        },
      ],
    };

    act(() => {
      result.current.actions.setBoard(boardWithTask);
    });

    // Update task
    const updates = { title: 'Updated Title', priority: 'high' as const };
    act(() => {
      result.current.actions.updateTask('task-1', updates);
    });

    const updatedTask = result.current.state.board?.statuses[0].tasks[0];
    expect(updatedTask?.title).toBe('Updated Title');
    expect(updatedTask?.priority).toBe('high');
  });

  it('should delete task from board', () => {
    const { result } = renderHook(() => useBoardState());

    // Set board with task
    const boardWithTask = {
      ...mockBoard,
      statuses: [
        {
          ...mockBoard.statuses[0],
          tasks: [mockTask],
        },
      ],
    };

    act(() => {
      result.current.actions.setBoard(boardWithTask);
    });

    // Delete task
    act(() => {
      result.current.actions.deleteTask('task-1');
    });

    expect(result.current.state.board?.statuses[0].tasks).toHaveLength(0);
  });

  it('should set user role', () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      result.current.actions.setUserRole('admin');
    });

    expect(result.current.state.currentUserRole).toBe('admin');
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      result.current.actions.setLoading(false);
    });

    expect(result.current.state.loading).toBe(false);
  });

  it('should set error state', () => {
    const { result } = renderHook(() => useBoardState());

    const error = new Error('Test error');
    act(() => {
      result.current.actions.setError(error);
    });

    expect(result.current.state.error).toEqual(error);
    expect(result.current.state.loading).toBe(false);
  });

  it('should update selected task when updating task', () => {
    const { result } = renderHook(() => useBoardState());

    // Set board with task and select it
    const boardWithTask = {
      ...mockBoard,
      statuses: [
        {
          ...mockBoard.statuses[0],
          tasks: [mockTask],
        },
      ],
    };

    act(() => {
      result.current.actions.setBoard(boardWithTask);
      result.current.actions.openDrawer(mockTask);
    });

    // Update task
    act(() => {
      result.current.actions.updateTask('task-1', { title: 'New Title' });
    });

    expect(result.current.state.selectedTask?.title).toBe('New Title');
  });

  it('should clear selected task when deleting it', () => {
    const { result } = renderHook(() => useBoardState());

    // Set board with task and select it
    const boardWithTask = {
      ...mockBoard,
      statuses: [
        {
          ...mockBoard.statuses[0],
          tasks: [mockTask],
        },
      ],
    };

    act(() => {
      result.current.actions.setBoard(boardWithTask);
      result.current.actions.openDrawer(mockTask);
    });

    // Delete task
    act(() => {
      result.current.actions.deleteTask('task-1');
    });

    expect(result.current.state.selectedTask).toBeNull();
  });
});
