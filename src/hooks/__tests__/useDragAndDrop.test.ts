import { renderHook, act } from '@testing-library/react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDragAndDrop } from '../useDragAndDrop';
import type { BoardWithData, Task } from '@/types/board';

describe('useDragAndDrop', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      board_id: 'board-1',
      status_id: 'status-1',
      title: 'Task 1',
      description: null,
      priority: 'medium',
      tags: [],
      assignee_name: null,
      assignee_color: null,
      due_date: null,
      order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      board_id: 'board-1',
      status_id: 'status-1',
      title: 'Task 2',
      description: null,
      priority: 'high',
      tags: [],
      assignee_name: null,
      assignee_color: null,
      due_date: null,
      order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockBoard: BoardWithData = {
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
        name: 'Todo',
        color: 'blue',
        order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: mockTasks,
      },
      {
        id: 'status-2',
        board_id: 'board-1',
        name: 'Done',
        color: 'green',
        order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tasks: [],
      },
    ],
  };

  it('should initialize with null activeTask', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    expect(result.current.activeTask).toBeNull();
  });

  it('should compute allTasks from board', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    expect(result.current.allTasks).toHaveLength(2);
    expect(result.current.allTasks[0].id).toBe('task-1');
    expect(result.current.allTasks[1].id).toBe('task-2');
  });

  it('should set activeTask on drag start', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    act(() => {
      result.current.handleDragStart({
        active: { id: 'task-1', data: {} },
      } as DragStartEvent);
    });

    expect(result.current.activeTask).toEqual(mockTasks[0]);
  });

  it('should clear activeTask on drag end', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    // Start drag
    act(() => {
      result.current.handleDragStart({
        active: { id: 'task-1', data: {} },
      } as DragStartEvent);
    });

    // End drag
    act(() => {
      result.current.handleDragEnd({
        active: { id: 'task-1', data: {} },
        over: { id: 'task-2', data: {} },
      } as DragEndEvent);
    });

    expect(result.current.activeTask).toBeNull();
  });

  it('should call onReorder when reordering tasks in same column', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    // Drag task-1 over task-2 (both in status-1)
    act(() => {
      result.current.handleDragEnd({
        active: { id: 'task-1', data: {} },
        over: { id: 'task-2', data: {} },
      } as DragEndEvent);
    });

    expect(mockOnReorder).toHaveBeenCalledWith(
      'status-1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'task-2' }),
        expect.objectContaining({ id: 'task-1' }),
      ])
    );
    expect(mockOnMove).not.toHaveBeenCalled();
  });

  it('should call onMove when moving task to different column', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    // Drag task-1 over status-2 (different column)
    act(() => {
      result.current.handleDragEnd({
        active: { id: 'task-1', data: {} },
        over: { id: 'status-2', data: {} },
      } as DragEndEvent);
    });

    expect(mockOnMove).toHaveBeenCalledWith('task-1', 'status-2', expect.any(Number));
    expect(mockOnReorder).not.toHaveBeenCalled();
  });

  it('should handle drag end with no over target', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'task-1', data: {} },
        over: null,
      } as DragEndEvent);
    });

    expect(mockOnReorder).not.toHaveBeenCalled();
    expect(mockOnMove).not.toHaveBeenCalled();
  });

  it('should handle drag end with null board', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: null,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'task-1', data: {} },
        over: { id: 'task-2', data: {} },
      } as DragEndEvent);
    });

    expect(mockOnReorder).not.toHaveBeenCalled();
    expect(mockOnMove).not.toHaveBeenCalled();
  });

  it('should configure sensors correctly', () => {
    const mockOnReorder = jest.fn();
    const mockOnMove = jest.fn();

    const { result } = renderHook(() =>
      useDragAndDrop({
        board: mockBoard,
        onReorder: mockOnReorder,
        onMove: mockOnMove,
      })
    );

    expect(result.current.sensors).toBeDefined();
    expect(Array.isArray(result.current.sensors)).toBe(true);
    expect(result.current.sensors.length).toBeGreaterThan(0);
  });
});
