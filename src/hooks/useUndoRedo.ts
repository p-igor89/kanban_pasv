'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Command interface for undo/redo operations
export interface Command<T = unknown> {
  id: string;
  type: string;
  timestamp: number;
  execute: () => Promise<T>;
  undo: () => Promise<T>;
  description: string;
}

interface UseUndoRedoOptions {
  maxHistory?: number;
  onUndo?: (command: Command) => void;
  onRedo?: (command: Command) => void;
  enabled?: boolean;
}

interface UndoRedoState {
  past: Command[];
  future: Command[];
  isUndoing: boolean;
  isRedoing: boolean;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50, onUndo, onRedo, enabled = true } = options;

  const [state, setState] = useState<UndoRedoState>({
    past: [],
    future: [],
    isUndoing: false,
    isRedoing: false,
  });

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Execute a command and add it to history
   */
  const execute = useCallback(
    async <T>(command: Command<T>): Promise<T> => {
      if (!enabled) {
        return command.execute();
      }

      const result = await command.execute();

      setState((prev) => ({
        ...prev,
        past: [...prev.past.slice(-(maxHistory - 1)), command],
        future: [], // Clear future on new action
      }));

      return result;
    },
    [enabled, maxHistory]
  );

  /**
   * Undo the last command
   */
  const undo = useCallback(async () => {
    const { past, isUndoing, isRedoing } = stateRef.current;

    if (past.length === 0 || isUndoing || isRedoing || !enabled) {
      return;
    }

    const command = past[past.length - 1];

    setState((prev) => ({ ...prev, isUndoing: true }));

    try {
      await command.undo();

      setState((prev) => ({
        past: prev.past.slice(0, -1),
        future: [command, ...prev.future],
        isUndoing: false,
        isRedoing: false,
      }));

      onUndo?.(command);
    } catch (error) {
      console.error('Undo failed:', error);
      setState((prev) => ({ ...prev, isUndoing: false }));
    }
  }, [enabled, onUndo]);

  /**
   * Redo the last undone command
   */
  const redo = useCallback(async () => {
    const { future, isUndoing, isRedoing } = stateRef.current;

    if (future.length === 0 || isUndoing || isRedoing || !enabled) {
      return;
    }

    const command = future[0];

    setState((prev) => ({ ...prev, isRedoing: true }));

    try {
      await command.execute();

      setState((prev) => ({
        past: [...prev.past, command],
        future: prev.future.slice(1),
        isUndoing: false,
        isRedoing: false,
      }));

      onRedo?.(command);
    } catch (error) {
      console.error('Redo failed:', error);
      setState((prev) => ({ ...prev, isRedoing: false }));
    }
  }, [enabled, onRedo]);

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    setState({
      past: [],
      future: [],
      isUndoing: false,
      isRedoing: false,
    });
  }, []);

  /**
   * Keyboard shortcuts handler
   */
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (undo) or Cmd+Z on Mac
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Check for Ctrl+Y (redo) or Ctrl+Shift+Z or Cmd+Shift+Z on Mac
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, undo, redo]);

  return {
    execute,
    undo,
    redo,
    clear,
    canUndo: state.past.length > 0 && !state.isUndoing && !state.isRedoing,
    canRedo: state.future.length > 0 && !state.isUndoing && !state.isRedoing,
    isUndoing: state.isUndoing,
    isRedoing: state.isRedoing,
    historyLength: state.past.length,
    futureLength: state.future.length,
  };
}

// Helper function to create commands
export function createCommand<T>(params: {
  type: string;
  description: string;
  execute: () => Promise<T>;
  undo: () => Promise<T>;
}): Command<T> {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...params,
  };
}

// Pre-built command creators for common operations
export const commandCreators = {
  moveTask: (params: {
    taskId: string;
    fromStatusId: string;
    toStatusId: string;
    fromOrder: number;
    toOrder: number;
    moveTask: (taskId: string, statusId: string, order: number) => Promise<void>;
  }) =>
    createCommand({
      type: 'MOVE_TASK',
      description: `Move task to new status`,
      execute: () => params.moveTask(params.taskId, params.toStatusId, params.toOrder),
      undo: () => params.moveTask(params.taskId, params.fromStatusId, params.fromOrder),
    }),

  updateTask: <T extends Record<string, unknown>>(params: {
    taskId: string;
    prevData: T;
    newData: T;
    updateTask: (taskId: string, data: T) => Promise<void>;
  }) =>
    createCommand({
      type: 'UPDATE_TASK',
      description: `Update task`,
      execute: () => params.updateTask(params.taskId, params.newData),
      undo: () => params.updateTask(params.taskId, params.prevData),
    }),

  deleteTask: (params: {
    task: {
      id: string;
      status_id: string;
      order: number;
      title: string;
      description?: string | null;
    };
    deleteTask: (taskId: string) => Promise<void>;
    createTask: (data: {
      title: string;
      status_id: string;
      description?: string | null;
    }) => Promise<void>;
  }) =>
    createCommand({
      type: 'DELETE_TASK',
      description: `Delete task "${params.task.title}"`,
      execute: () => params.deleteTask(params.task.id),
      undo: () =>
        params.createTask({
          title: params.task.title,
          status_id: params.task.status_id,
          description: params.task.description,
        }),
    }),

  createTask: (params: {
    taskId: string;
    taskData: { title: string; status_id: string; description?: string | null };
    createTask: (data: {
      title: string;
      status_id: string;
      description?: string | null;
    }) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
  }) =>
    createCommand({
      type: 'CREATE_TASK',
      description: `Create task "${params.taskData.title}"`,
      execute: () => params.createTask(params.taskData),
      undo: () => params.deleteTask(params.taskId),
    }),
};
