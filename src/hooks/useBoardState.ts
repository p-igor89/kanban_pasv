/**
 * Centralized state management for Board component using useReducer
 * Replaces multiple useState calls with a single reducer
 */

import { useReducer, useCallback } from 'react';
import type { BoardWithData, Status, Task } from '@/types/board';

// State shape
export interface BoardState {
  board: BoardWithData | null;
  loading: boolean;
  error: Error | null;

  // UI state
  selectedTask: Task | null;
  isTaskModalOpen: boolean;
  isDrawerOpen: boolean;
  isStatusModalOpen: boolean;
  isMembersModalOpen: boolean;

  // Edit state
  editingStatus: Status | null;
  defaultStatusId: string | null;

  // User permissions
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer';
}

// Action types
export type BoardAction =
  | { type: 'SET_BOARD'; payload: BoardWithData | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_SELECTED_TASK'; payload: Task | null }
  | { type: 'OPEN_TASK_MODAL'; payload?: string }
  | { type: 'CLOSE_TASK_MODAL' }
  | { type: 'OPEN_DRAWER'; payload: Task }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'OPEN_STATUS_MODAL'; payload?: Status }
  | { type: 'CLOSE_STATUS_MODAL' }
  | { type: 'OPEN_MEMBERS_MODAL' }
  | { type: 'CLOSE_MEMBERS_MODAL' }
  | { type: 'SET_USER_ROLE'; payload: 'owner' | 'admin' | 'member' | 'viewer' }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'MOVE_TASK'; payload: { taskId: string; newStatusId: string; newOrder: number } }
  | { type: 'REORDER_TASKS'; payload: { statusId: string; tasks: Task[] } };

// Initial state
const initialState: BoardState = {
  board: null,
  loading: true,
  error: null,
  selectedTask: null,
  isTaskModalOpen: false,
  isDrawerOpen: false,
  isStatusModalOpen: false,
  isMembersModalOpen: false,
  editingStatus: null,
  defaultStatusId: null,
  currentUserRole: 'viewer',
};

// Reducer
function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'SET_BOARD':
      return {
        ...state,
        board: action.payload,
        loading: action.payload === null ? state.loading : false,
        error: action.payload === null ? state.error : null,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_SELECTED_TASK':
      return { ...state, selectedTask: action.payload };

    case 'OPEN_TASK_MODAL':
      return {
        ...state,
        isTaskModalOpen: true,
        defaultStatusId: action.payload || null,
      };

    case 'CLOSE_TASK_MODAL':
      return { ...state, isTaskModalOpen: false, defaultStatusId: null };

    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true, selectedTask: action.payload };

    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false, selectedTask: null };

    case 'OPEN_STATUS_MODAL':
      return {
        ...state,
        isStatusModalOpen: true,
        editingStatus: action.payload || null,
      };

    case 'CLOSE_STATUS_MODAL':
      return { ...state, isStatusModalOpen: false, editingStatus: null };

    case 'OPEN_MEMBERS_MODAL':
      return { ...state, isMembersModalOpen: true };

    case 'CLOSE_MEMBERS_MODAL':
      return { ...state, isMembersModalOpen: false };

    case 'SET_USER_ROLE':
      return { ...state, currentUserRole: action.payload };

    case 'UPDATE_TASK': {
      if (!state.board) return state;

      const { taskId, updates } = action.payload;

      return {
        ...state,
        board: {
          ...state.board,
          statuses: state.board.statuses.map((status) => ({
            ...status,
            tasks: status.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            ),
          })),
        },
        selectedTask:
          state.selectedTask?.id === taskId
            ? { ...state.selectedTask, ...updates }
            : state.selectedTask,
      };
    }

    case 'DELETE_TASK': {
      if (!state.board) return state;

      const taskId = action.payload;

      return {
        ...state,
        board: {
          ...state.board,
          statuses: state.board.statuses.map((status) => ({
            ...status,
            tasks: status.tasks.filter((task) => task.id !== taskId),
          })),
        },
        selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask,
      };
    }

    case 'ADD_TASK': {
      if (!state.board) return state;

      const newTask = action.payload;

      return {
        ...state,
        board: {
          ...state.board,
          statuses: state.board.statuses.map((status) =>
            status.id === newTask.status_id
              ? { ...status, tasks: [...status.tasks, newTask] }
              : status
          ),
        },
      };
    }

    case 'MOVE_TASK': {
      if (!state.board) return state;

      const { taskId, newStatusId, newOrder } = action.payload;

      // Find the task
      let movedTask: Task | null = null;
      for (const status of state.board.statuses) {
        const task = status.tasks.find((t) => t.id === taskId);
        if (task) {
          movedTask = task;
          break;
        }
      }

      if (!movedTask) return state;

      return {
        ...state,
        board: {
          ...state.board,
          statuses: state.board.statuses.map((status) => {
            // Remove from old status
            if (status.tasks.some((t) => t.id === taskId)) {
              return {
                ...status,
                tasks: status.tasks.filter((t) => t.id !== taskId),
              };
            }

            // Add to new status
            if (status.id === newStatusId) {
              const updatedTask = {
                ...movedTask!,
                status_id: newStatusId,
                order: newOrder,
              };
              const newTasks = [...status.tasks];
              newTasks.splice(newOrder, 0, updatedTask);
              return { ...status, tasks: newTasks };
            }

            return status;
          }),
        },
      };
    }

    case 'REORDER_TASKS': {
      if (!state.board) return state;

      const { statusId, tasks } = action.payload;

      return {
        ...state,
        board: {
          ...state.board,
          statuses: state.board.statuses.map((status) =>
            status.id === statusId ? { ...status, tasks } : status
          ),
        },
      };
    }

    default:
      return state;
  }
}

/**
 * Custom hook for Board state management
 */
export function useBoardState() {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  // Action creators
  const actions = {
    setBoard: useCallback(
      (
        boardOrUpdater:
          | BoardWithData
          | null
          | ((prev: BoardWithData | null) => BoardWithData | null)
      ) => {
        if (typeof boardOrUpdater === 'function') {
          // Handle functional update
          const newBoard = boardOrUpdater(state.board);
          dispatch({ type: 'SET_BOARD', payload: newBoard });
        } else {
          // Handle direct value
          dispatch({ type: 'SET_BOARD', payload: boardOrUpdater });
        }
      },
      [state.board]
    ),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, []),

    setError: useCallback((error: Error | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),

    setUserRole: useCallback((role: 'owner' | 'admin' | 'member' | 'viewer') => {
      dispatch({ type: 'SET_USER_ROLE', payload: role });
    }, []),

    // Task modal
    openTaskModal: useCallback((statusId?: string) => {
      dispatch({ type: 'OPEN_TASK_MODAL', payload: statusId });
    }, []),

    closeTaskModal: useCallback(() => {
      dispatch({ type: 'CLOSE_TASK_MODAL' });
    }, []),

    // Drawer
    openDrawer: useCallback((task: Task) => {
      dispatch({ type: 'OPEN_DRAWER', payload: task });
    }, []),

    closeDrawer: useCallback(() => {
      dispatch({ type: 'CLOSE_DRAWER' });
    }, []),

    // Status modal
    openStatusModal: useCallback((status?: Status) => {
      dispatch({ type: 'OPEN_STATUS_MODAL', payload: status });
    }, []),

    closeStatusModal: useCallback(() => {
      dispatch({ type: 'CLOSE_STATUS_MODAL' });
    }, []),

    // Members modal
    openMembersModal: useCallback(() => {
      dispatch({ type: 'OPEN_MEMBERS_MODAL' });
    }, []),

    closeMembersModal: useCallback(() => {
      dispatch({ type: 'CLOSE_MEMBERS_MODAL' });
    }, []),

    // Task operations
    updateTask: useCallback((taskId: string, updates: Partial<Task>) => {
      dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } });
    }, []),

    deleteTask: useCallback((taskId: string) => {
      dispatch({ type: 'DELETE_TASK', payload: taskId });
    }, []),

    addTask: useCallback((task: Task) => {
      dispatch({ type: 'ADD_TASK', payload: task });
    }, []),

    moveTask: useCallback((taskId: string, newStatusId: string, newOrder: number) => {
      dispatch({
        type: 'MOVE_TASK',
        payload: { taskId, newStatusId, newOrder },
      });
    }, []),

    reorderTasks: useCallback((statusId: string, tasks: Task[]) => {
      dispatch({ type: 'REORDER_TASKS', payload: { statusId, tasks } });
    }, []),
  };

  return { state, actions };
}
