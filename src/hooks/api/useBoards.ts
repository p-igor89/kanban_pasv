/**
 * React Query hooks for Boards API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryKeys';
import type { Board, BoardWithData, CreateBoardRequest } from '@/types/board';
import { fetchWithCsrf } from '@/lib/security/fetch-with-csrf';

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
 * Board detail response from API
 */
export interface BoardDetailResponse {
  board: BoardWithData;
  userRole?: string;
}

/**
 * Fetch a single board with all related data (statuses and tasks)
 * Uses API endpoint to get board with user role
 */
export function useBoard(boardId: string | null) {
  return useQuery({
    queryKey: queryKeys.boards.detail(boardId || ''),
    queryFn: async (): Promise<BoardDetailResponse | null> => {
      if (!boardId) return null;

      const response = await fetch(`/api/boards/${boardId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Board not found');
        }
        throw new Error('Failed to fetch board');
      }

      const data = await response.json();
      return data;
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
      const response = await fetchWithCsrf('/api/boards', {
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
      const response = await fetchWithCsrf(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update board');
      }

      const { board } = await response.json();
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
      const response = await fetchWithCsrf(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete board');
      }
    },
    onSuccess: (_, boardId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.boards.detail(boardId) });

      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.lists() });
    },
  });
}
