import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollbackData: T) => void;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Hook for handling optimistic UI updates with automatic rollback on failure
 * Reduces perceived latency by updating UI immediately while API calls are in progress
 */
export function useOptimisticUpdate<T>() {
  const [isUpdating, setIsUpdating] = useState(false);
  const rollbackDataRef = useRef<T | null>(null);

  const executeUpdate = useCallback(
    async (
      currentData: T,
      optimisticData: T,
      updateFn: () => Promise<T>,
      options?: OptimisticUpdateOptions<T>
    ) => {
      const { onSuccess, onError, retryCount = 0, retryDelay = 1000 } = options || {};

      // Store current data for potential rollback
      rollbackDataRef.current = currentData;
      setIsUpdating(true);

      // Apply optimistic update immediately
      // The parent component should handle this state update
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts <= retryCount) {
        try {
          // Execute the actual update
          const result = await updateFn();

          // Clear rollback data on success
          rollbackDataRef.current = null;
          setIsUpdating(false);

          if (onSuccess) {
            onSuccess(result);
          }

          return { success: true, data: result };
        } catch (error) {
          lastError = error as Error;
          attempts++;

          if (attempts <= retryCount) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          }
        }
      }

      // All attempts failed, trigger rollback
      setIsUpdating(false);

      if (onError && rollbackDataRef.current && lastError) {
        onError(lastError, rollbackDataRef.current);
      }

      // Return rollback data for parent to restore
      return {
        success: false,
        data: rollbackDataRef.current,
        error: lastError
      };
    },
    []
  );

  const rollback = useCallback(() => {
    if (rollbackDataRef.current) {
      return rollbackDataRef.current;
    }
    return null;
  }, []);

  return {
    executeUpdate,
    rollback,
    isUpdating,
    hasRollbackData: rollbackDataRef.current !== null
  };
}

/**
 * Higher-order hook for specific optimistic update scenarios
 */
export function useOptimisticTaskUpdate() {
  const { executeUpdate, isUpdating } = useOptimisticUpdate();

  const updateTask = useCallback(
    async (
      boardId: string,
      taskId: string,
      currentTask: any,
      updates: Partial<any>,
      setTasks: (updater: (tasks: any[]) => any[]) => void
    ) => {
      // Apply optimistic update to UI
      setTasks((tasks) =>
        tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );

      // Execute actual update
      const result = await executeUpdate(
        currentTask,
        { ...currentTask, ...updates },
        async () => {
          const response = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            throw new Error('Failed to update task');
          }

          return response.json();
        },
        {
          onError: (error, rollbackData) => {
            // Rollback UI on failure
            setTasks((tasks) =>
              tasks.map((task) =>
                task.id === taskId ? rollbackData : task
              )
            );
            toast.error('Failed to update task. Changes reverted.');
          },
          retryCount: 2,
          retryDelay: 500
        }
      );

      return result;
    },
    [executeUpdate]
  );

  return { updateTask, isUpdating };
}