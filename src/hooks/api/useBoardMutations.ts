/**
 * React Query mutations for Board operations with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryKeys';
import type { Task, Status } from '@/types/board';
import type { BoardDetailResponse } from './useBoards';
import { fetchWithCsrf } from '@/lib/security/fetch-with-csrf';

/**
 * Update board data in cache optimistically
 */
function updateBoardCache(
  queryClient: ReturnType<typeof useQueryClient>,
  boardId: string,
  updater: (old: BoardDetailResponse | undefined) => BoardDetailResponse | undefined
) {
  queryClient.setQueryData<BoardDetailResponse>(queryKeys.boards.detail(boardId), (old) => {
    if (!old) return old;
    return updater(old);
  });
}

/**
 * Create task with optimistic update
 */
export function useCreateTaskMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      status_id: string;
      priority?: string;
      due_date?: string;
    }): Promise<Task> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const { task } = await response.json();
      return task;
    },
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<BoardDetailResponse>(
        queryKeys.boards.detail(boardId)
      );

      // Optimistically update
      updateBoardCache(queryClient, boardId, (old) => {
        if (!old) return old;

        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          board_id: boardId,
          status_id: newTask.status_id,
          title: newTask.title,
          description: newTask.description || null,
          priority: (newTask.priority as Task['priority']) || null,
          tags: [],
          assignee_name: null,
          assignee_color: null,
          due_date: newTask.due_date || null,
          order: 999,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return {
          ...old,
          board: {
            ...old.board,
            statuses: old.board.statuses.map((status) =>
              status.id === newTask.status_id
                ? {
                    ...status,
                    tasks: [...status.tasks, optimisticTask],
                  }
                : status
            ),
          },
        };
      });

      return { previousData };
    },
    onError: (err, newTask, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousData);
      }
    },
    onSuccess: () => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Update task with optimistic update
 */
export function useUpdateTaskMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Task>;
    }): Promise<Task> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const { task } = await response.json();
      return task;
    },
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });

      const previousData = queryClient.getQueryData<BoardDetailResponse>(
        queryKeys.boards.detail(boardId)
      );

      // Optimistically update
      updateBoardCache(queryClient, boardId, (old) => {
        if (!old) return old;

        return {
          ...old,
          board: {
            ...old.board,
            statuses: old.board.statuses.map((status) => ({
              ...status,
              tasks: status.tasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            })),
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Delete task with optimistic update
 */
export function useDeleteTaskMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });

      const previousData = queryClient.getQueryData<BoardDetailResponse>(
        queryKeys.boards.detail(boardId)
      );

      // Optimistically remove
      updateBoardCache(queryClient, boardId, (old) => {
        if (!old) return old;

        return {
          ...old,
          board: {
            ...old.board,
            statuses: old.board.statuses.map((status) => ({
              ...status,
              tasks: status.tasks.filter((task) => task.id !== taskId),
            })),
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Move task with optimistic update
 */
export function useMoveTaskMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatusId,
      newOrder,
    }: {
      taskId: string;
      newStatusId: string;
      newOrder: number;
    }): Promise<void> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_id: newStatusId,
          order: newOrder,
        }),
      });

      if (!response.ok) throw new Error('Failed to move task');
    },
    onMutate: async ({ taskId, newStatusId, newOrder }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });

      const previousData = queryClient.getQueryData<BoardDetailResponse>(
        queryKeys.boards.detail(boardId)
      );

      // Optimistically move task
      updateBoardCache(queryClient, boardId, (old) => {
        if (!old) return old;

        let taskToMove: Task | undefined;
        const newStatuses = old.board.statuses.map((status) => {
          const task = status.tasks.find((t) => t.id === taskId);
          if (task) {
            taskToMove = { ...task, status_id: newStatusId, order: newOrder };
            return {
              ...status,
              tasks: status.tasks.filter((t) => t.id !== taskId),
            };
          }
          return status;
        });

        if (!taskToMove) return old;

        return {
          ...old,
          board: {
            ...old.board,
            statuses: newStatuses.map((status) =>
              status.id === newStatusId
                ? {
                    ...status,
                    tasks: [...status.tasks, taskToMove!].sort((a, b) => a.order - b.order),
                  }
                : status
            ),
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Reorder tasks with optimistic update
 */
export function useReorderTasksMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: Task[]): Promise<void> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/tasks/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map((t) => ({ id: t.id, order: t.order })),
        }),
      });

      if (!response.ok) throw new Error('Failed to reorder tasks');
    },
    onMutate: async (reorderedTasks) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });

      const previousData = queryClient.getQueryData<BoardDetailResponse>(
        queryKeys.boards.detail(boardId)
      );

      // Optimistically reorder
      updateBoardCache(queryClient, boardId, (old) => {
        if (!old) return old;

        const statusId = reorderedTasks[0]?.status_id;
        if (!statusId) return old;

        return {
          ...old,
          board: {
            ...old.board,
            statuses: old.board.statuses.map((status) =>
              status.id === statusId
                ? {
                    ...status,
                    tasks: reorderedTasks,
                  }
                : status
            ),
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Create status with optimistic update
 */
export function useCreateStatusMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color: string }): Promise<Status> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create status');

      const { status } = await response.json();
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Update status
 */
export function useUpdateStatusMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      statusId,
      data,
    }: {
      statusId: string;
      data: { name?: string; color?: string };
    }): Promise<Status> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/statuses/${statusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const { status } = await response.json();
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Delete status
 */
export function useDeleteStatusMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statusId: string): Promise<void> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/statuses/${statusId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error(data.error || 'Cannot delete status with tasks');
        }
        throw new Error('Failed to delete status');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

/**
 * Reorder statuses (columns) with optimistic update
 */
export function useReorderStatusesMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statuses: Array<{ id: string; order: number }>): Promise<void> => {
      const response = await fetchWithCsrf(`/api/boards/${boardId}/statuses/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses }),
      });

      if (!response.ok) throw new Error('Failed to reorder statuses');
    },
    onMutate: async (reorderedStatuses) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });

      const previousData = queryClient.getQueryData<BoardDetailResponse>(
        queryKeys.boards.detail(boardId)
      );

      // Optimistically reorder statuses
      updateBoardCache(queryClient, boardId, (old) => {
        if (!old) return old;

        // Create a map of new orders
        const orderMap = new Map(reorderedStatuses.map((s) => [s.id, s.order]));

        // Update and sort statuses
        const updatedStatuses = old.board.statuses
          .map((status) => ({
            ...status,
            order: orderMap.get(status.id) ?? status.order,
          }))
          .sort((a, b) => a.order - b.order);

        return {
          ...old,
          board: {
            ...old.board,
            statuses: updatedStatuses,
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}
