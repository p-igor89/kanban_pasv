'use client';

import { useEffect, useCallback } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Task, Status, BoardWithData } from '@/types/board';

interface UseRealtimeBoardOptions {
  boardId: string;
  onTaskInsert?: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onStatusInsert?: (status: Status) => void;
  onStatusUpdate?: (status: Status) => void;
  onStatusDelete?: (statusId: string) => void;
}

export function useRealtimeBoard({
  boardId,
  onTaskInsert,
  onTaskUpdate,
  onTaskDelete,
  onStatusInsert,
  onStatusUpdate,
  onStatusDelete,
}: UseRealtimeBoardOptions) {
  useEffect(() => {
    if (!boardId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`board-${boardId}`)
      .on<Task>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          if (payload.new && 'id' in payload.new) {
            onTaskInsert?.(payload.new as Task);
          }
        }
      )
      .on<Task>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          if (payload.new && 'id' in payload.new) {
            onTaskUpdate?.(payload.new as Task);
          }
        }
      )
      .on<Task>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          if (payload.old && 'id' in payload.old) {
            onTaskDelete?.((payload.old as Task).id);
          }
        }
      )
      .on<Status>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'statuses',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Status>) => {
          if (payload.new && 'id' in payload.new) {
            onStatusInsert?.(payload.new as Status);
          }
        }
      )
      .on<Status>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'statuses',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Status>) => {
          if (payload.new && 'id' in payload.new) {
            onStatusUpdate?.(payload.new as Status);
          }
        }
      )
      .on<Status>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'statuses',
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Status>) => {
          if (payload.old && 'id' in payload.old) {
            onStatusDelete?.((payload.old as Status).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    boardId,
    onTaskInsert,
    onTaskUpdate,
    onTaskDelete,
    onStatusInsert,
    onStatusUpdate,
    onStatusDelete,
  ]);
}

// Hook that manages board state with realtime updates
export function useRealtimeBoardState(
  board: BoardWithData | null,
  setBoard: React.Dispatch<React.SetStateAction<BoardWithData | null>>
) {
  const boardId = board?.id;

  const handleTaskInsert = useCallback(
    (task: Task) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // Check if task already exists (optimistic update case)
        const exists = prev.statuses.some((s) => s.tasks.some((t) => t.id === task.id));
        if (exists) return prev;

        return {
          ...prev,
          statuses: prev.statuses.map((status) =>
            status.id === task.status_id
              ? { ...status, tasks: [...status.tasks, task].sort((a, b) => a.order - b.order) }
              : status
          ),
        };
      });
    },
    [setBoard]
  );

  const handleTaskUpdate = useCallback(
    (task: Task) => {
      setBoard((prev) => {
        if (!prev) return prev;

        // Find current status of the task
        let oldStatusId: string | null = null;
        prev.statuses.forEach((status) => {
          if (status.tasks.some((t) => t.id === task.id)) {
            oldStatusId = status.id;
          }
        });

        // If task moved to different status
        if (oldStatusId && oldStatusId !== task.status_id) {
          return {
            ...prev,
            statuses: prev.statuses.map((status) => {
              if (status.id === oldStatusId) {
                return {
                  ...status,
                  tasks: status.tasks.filter((t) => t.id !== task.id),
                };
              }
              if (status.id === task.status_id) {
                return {
                  ...status,
                  tasks: [...status.tasks, task].sort((a, b) => a.order - b.order),
                };
              }
              return status;
            }),
          };
        }

        // Same status, just update
        return {
          ...prev,
          statuses: prev.statuses.map((status) => ({
            ...status,
            tasks: status.tasks
              .map((t) => (t.id === task.id ? task : t))
              .sort((a, b) => a.order - b.order),
          })),
        };
      });
    },
    [setBoard]
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.map((status) => ({
            ...status,
            tasks: status.tasks.filter((t) => t.id !== taskId),
          })),
        };
      });
    },
    [setBoard]
  );

  const handleStatusInsert = useCallback(
    (status: Status) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // Check if status already exists
        if (prev.statuses.some((s) => s.id === status.id)) return prev;

        return {
          ...prev,
          statuses: [...prev.statuses, { ...status, tasks: [] }].sort((a, b) => a.order - b.order),
        };
      });
    },
    [setBoard]
  );

  const handleStatusUpdate = useCallback(
    (status: Status) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses
            .map((s) => (s.id === status.id ? { ...s, ...status } : s))
            .sort((a, b) => a.order - b.order),
        };
      });
    },
    [setBoard]
  );

  const handleStatusDelete = useCallback(
    (statusId: string) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.filter((s) => s.id !== statusId),
        };
      });
    },
    [setBoard]
  );

  useRealtimeBoard({
    boardId: boardId || '',
    onTaskInsert: handleTaskInsert,
    onTaskUpdate: handleTaskUpdate,
    onTaskDelete: handleTaskDelete,
    onStatusInsert: handleStatusInsert,
    onStatusUpdate: handleStatusUpdate,
    onStatusDelete: handleStatusDelete,
  });
}
