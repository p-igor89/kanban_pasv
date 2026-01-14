/**
 * React Query hooks for Tasks API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryKeys';
import type { Task, TaskPriority } from '@/types/board';
import { createClient } from '@/lib/supabase/client';

interface CreateTaskData {
  board_id: string;
  status_id: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  tags?: string[];
  assignee_name?: string | null;
  assignee_color?: string | null;
  due_date?: string | null;
}

interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status_id?: string;
  priority?: TaskPriority | null;
  tags?: string[];
  assignee_name?: string | null;
  assignee_color?: string | null;
  due_date?: string | null;
  order?: number;
}

/**
 * Fetch tasks for a board
 */
export function useTasks(boardId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.list(boardId || ''),
    queryFn: async (): Promise<Task[]> => {
      if (!boardId) return [];

      const supabase = createClient();

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId || ''),
    queryFn: async (): Promise<Task | null> => {
      if (!taskId) return null;

      const supabase = createClient();

      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskData): Promise<Task> => {
      const supabase = createClient();

      // Get max order for the status
      const { data: maxOrderData } = await supabase
        .from('tasks')
        .select('order')
        .eq('status_id', data.status_id)
        .order('order', { ascending: false })
        .limit(1)
        .single();

      const order = (maxOrderData?.order || 0) + 1;

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...data,
          order,
        })
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: (data) => {
      // Invalidate tasks list for the board
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(data.board_id),
      });

      // Invalidate board detail to refresh statuses with tasks
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.detail(data.board_id),
      });
    },
  });
}

/**
 * Update a task
 */
export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTaskData): Promise<Task> => {
      const supabase = createClient();

      const { data: task, error } = await supabase
        .from('tasks')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId));

      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          ...newData,
        });
      }

      return { previousTask };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
      }
    },
    onSuccess: (data) => {
      // Update task detail cache
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), data);

      // Invalidate tasks list for the board
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(data.board_id),
      });

      // Invalidate board detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.detail(data.board_id),
      });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<{ boardId: string }> => {
      const supabase = createClient();

      // Get board_id before deleting
      const { data: task } = await supabase
        .from('tasks')
        .select('board_id')
        .eq('id', taskId)
        .single();

      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      return { boardId: task?.board_id || '' };
    },
    onSuccess: ({ boardId }, taskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      // Invalidate tasks list
      if (boardId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.list(boardId),
        });

        // Invalidate board detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.boards.detail(boardId),
        });
      }
    },
  });
}

/**
 * Reorder tasks (batch update)
 */
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; order: number; status_id: string }>) => {
      const supabase = createClient();

      // Batch update tasks
      const promises = updates.map(({ id, order, status_id }) =>
        supabase
          .from('tasks')
          .update({ order, status_id, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      const results = await Promise.all(promises);

      const error = results.find((r) => r.error)?.error;
      if (error) throw error;

      return updates;
    },
    onSuccess: (updates) => {
      updates.forEach((update) => {
        // Invalidate individual task cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(update.id),
        });
      });

      // Invalidate all task lists (simplified approach)
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
      });

      // Invalidate all board details (to refresh column grouping)
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.all,
      });
    },
  });
}
