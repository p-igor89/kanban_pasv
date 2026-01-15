'use client';

import { useEffect, useCallback, useRef } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// Database comment type (without profile join)
interface DbComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Comment with minimal profile info for realtime updates
export interface RealtimeComment extends DbComment {
  profile?: {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface UseRealtimeCommentsOptions {
  taskId: string;
  onCommentInsert?: (comment: RealtimeComment) => void;
  onCommentUpdate?: (comment: RealtimeComment) => void;
  onCommentDelete?: (commentId: string) => void;
}

export function useRealtimeComments({
  taskId,
  onCommentInsert,
  onCommentUpdate,
  onCommentDelete,
}: UseRealtimeCommentsOptions) {
  const supabaseRef = useRef(createClient());

  // Fetch profile for a comment
  const fetchCommentWithProfile = useCallback(
    async (comment: DbComment): Promise<RealtimeComment> => {
      const { data: profile } = await supabaseRef.current
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .eq('id', comment.user_id)
        .single();

      return { ...comment, profile: profile || undefined };
    },
    []
  );

  useEffect(() => {
    if (!taskId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on<DbComment>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload: RealtimePostgresChangesPayload<DbComment>) => {
          if (payload.new && 'id' in payload.new) {
            const commentWithProfile = await fetchCommentWithProfile(payload.new as DbComment);
            onCommentInsert?.(commentWithProfile);
          }
        }
      )
      .on<DbComment>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload: RealtimePostgresChangesPayload<DbComment>) => {
          if (payload.new && 'id' in payload.new) {
            const commentWithProfile = await fetchCommentWithProfile(payload.new as DbComment);
            onCommentUpdate?.(commentWithProfile);
          }
        }
      )
      .on<DbComment>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbComment>) => {
          if (payload.old && 'id' in payload.old) {
            onCommentDelete?.((payload.old as DbComment).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, onCommentInsert, onCommentUpdate, onCommentDelete, fetchCommentWithProfile]);
}
