'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface PresenceUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  onlineAt: string;
}

interface PresenceState {
  [key: string]: PresenceUser[];
}

interface UsePresenceOptions {
  boardId: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
}

export function usePresence({
  boardId,
  userId,
  userEmail,
  userDisplayName,
  userAvatarUrl,
}: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const updatePresenceState = useCallback((state: PresenceState) => {
    const users: PresenceUser[] = [];
    const seenIds = new Set<string>();

    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        if (!seenIds.has(presence.id)) {
          seenIds.add(presence.id);
          users.push(presence);
        }
      });
    });

    // Sort by online time
    users.sort((a, b) => new Date(a.onlineAt).getTime() - new Date(b.onlineAt).getTime());
    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    if (!boardId || !userId) return;

    const supabase = supabaseRef.current;

    const channel = supabase.channel(`presence-board-${boardId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        updatePresenceState(state);
      })
      .on('presence', { event: 'join' }, () => {
        // Presence sync will handle the state update
      })
      .on('presence', { event: 'leave' }, () => {
        // Presence sync will handle the state update
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userId,
            email: userEmail,
            displayName: userDisplayName || null,
            avatarUrl: userAvatarUrl || null,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [boardId, userId, userEmail, userDisplayName, userAvatarUrl, updatePresenceState]);

  return { onlineUsers };
}
