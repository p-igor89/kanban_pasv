/**
 * Hook for prefetching board data on hover
 * Improves perceived performance by loading data before user clicks
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryKeys';
import type { BoardDetailResponse } from '@/hooks/api';

export function usePrefetchBoard() {
  const queryClient = useQueryClient();

  /**
   * Prefetch board data when user hovers over board card
   */
  const prefetchBoard = async (boardId: string) => {
    // Check if data is already cached
    const cachedData = queryClient.getQueryData(queryKeys.boards.detail(boardId));
    if (cachedData) {
      // Already in cache, no need to prefetch
      return;
    }

    // Prefetch board with statuses and tasks
    await queryClient.prefetchQuery({
      queryKey: queryKeys.boards.detail(boardId),
      queryFn: async (): Promise<BoardDetailResponse | null> => {
        const response = await fetch(`/api/boards/${boardId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch board');
        }

        const data = await response.json();
        return data;
      },
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
  };

  return { prefetchBoard };
}
