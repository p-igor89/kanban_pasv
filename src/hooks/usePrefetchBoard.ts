/**
 * Hook for prefetching board data on hover
 * Improves perceived performance by loading data before user clicks
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryKeys';
import { createClient } from '@/lib/supabase/client';
import type { BoardWithData } from '@/types/board';

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
      queryFn: async (): Promise<BoardWithData | null> => {
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
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
  };

  return { prefetchBoard };
}
