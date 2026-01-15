'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface UserCursor {
  id: string;
  email: string;
  displayName: string | null;
  color: string;
  cursor: CursorPosition | null;
  lastUpdate: number;
}

interface CursorState {
  [key: string]: UserCursor[];
}

interface UseCursorsOptions {
  boardId: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string | null;
  enabled?: boolean;
}

// Generate consistent color from user ID
function getUserColor(userId: string): string {
  const colors = [
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

export function useCursors({
  boardId,
  userId,
  userEmail,
  userDisplayName,
  enabled = true,
}: UseCursorsOptions) {
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<CursorPosition | null>(null);

  const updateCursorState = useCallback(
    (state: CursorState) => {
      const users: UserCursor[] = [];
      const seenIds = new Set<string>();

      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          // Don't include current user's cursor
          if (presence.id === userId) return;
          if (!seenIds.has(presence.id)) {
            seenIds.add(presence.id);
            users.push(presence);
          }
        });
      });

      setCursors(users);
    },
    [userId]
  );

  // Track cursor position
  const updateCursor = useCallback(
    (position: CursorPosition | null) => {
      if (!channelRef.current || !enabled) return;

      lastPositionRef.current = position;

      // Throttle updates to 50ms
      if (throttleRef.current) return;

      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;

        channelRef.current?.track({
          id: userId,
          email: userEmail,
          displayName: userDisplayName || null,
          color: getUserColor(userId),
          cursor: lastPositionRef.current,
          lastUpdate: Date.now(),
        });
      }, 50);
    },
    [userId, userEmail, userDisplayName, enabled]
  );

  useEffect(() => {
    if (!boardId || !userId || !enabled) return;

    const supabase = supabaseRef.current;

    const channel = supabase.channel(`cursors-board-${boardId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<UserCursor>();
        updateCursorState(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userId,
            email: userEmail,
            displayName: userDisplayName || null,
            color: getUserColor(userId),
            cursor: null,
            lastUpdate: Date.now(),
          });
        }
      });

    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [boardId, userId, userEmail, userDisplayName, enabled, updateCursorState]);

  return { cursors, updateCursor };
}
