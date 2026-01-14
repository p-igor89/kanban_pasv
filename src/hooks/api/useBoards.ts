/**
 * React Query hooks for Boards API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryKeys';
import type { Board, BoardWithData, CreateBoardRequest } from '@/types/board';
import { createClient } from '@/lib/supabase/client';

/**
 * Extended Board type with computed fields from API
 */
export interface BoardWithMeta extends Board {
  statuses_count?: number;
  tasks_count?: number;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  is_shared?: boolean;
}

/**
 * Fetch all boards for the current user
 * Uses API endpoint to get computed fields (statuses_count, tasks_count, role, is_shared)
 */
export function useBoards() {
  return useQuery({
    queryKey: queryKeys.boards.lists(),
    queryFn: async (): Promise<BoardWithMeta[]> => {
      const response = await fetch('/api/boards');

      if (!response.ok) {
        throw new Error('Failed to fetch boards');
      }

      const { boards } = await response.json();
      return boards || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single board with all related data (statuses and tasks)
 */
export function useBoard(boardId: string | null) {
  return useQuery({
    queryKey: queryKeys.boards.detail(boardId || ''),
    queryFn: async (): Promise<BoardWithData | null> => {
      if (!boardId) return null;

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch board
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // Fetch statuses with tasks
      const { data: statuses, error: statusesError } = await supabase
        .from('statuses')
        .select(
          `
          *,
          tasks (*)
        `
        )
        .eq('board_id', boardId)
        .order('order', { ascending: true });

      if (statusesError) throw statusesError;

      return {
        ...board,
        statuses: statuses || [],
      };
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Create a new board
 * Uses API endpoint to support templates
 */
export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBoardRequest): Promise<BoardWithMeta> => {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create board');
      }

      const { board } = await response.json();
      return board;
    },
    onSuccess: () => {
      // Invalidate boards list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.lists() });
    },
  });
}

/**
 * Update a board
 */
export function useUpdateBoard(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CreateBoardRequest>): Promise<Board> => {
      const supabase = createClient();

      const { data: board, error } = await supabase
        .from('boards')
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boardId)
        .select()
        .single();

      if (error) throw error;
      return board;
    },
    onSuccess: (data) => {
      // Update cache for board detail
      queryClient.setQueryData(queryKeys.boards.detail(boardId), data);

      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.lists() });
    },
  });
}

/**
 * Delete a board
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boardId: string): Promise<void> => {
      const supabase = createClient();

      const { error } = await supabase.from('boards').delete().eq('id', boardId);

      if (error) throw error;
    },
    onSuccess: (_, boardId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.boards.detail(boardId) });

      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.lists() });
    },
  });
}
