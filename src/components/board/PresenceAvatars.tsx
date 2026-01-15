'use client';

import { PresenceUser } from '@/hooks/usePresence';

interface PresenceAvatarsProps {
  users: PresenceUser[];
  maxVisible?: number;
}

export function PresenceAvatars({ users, maxVisible = 5 }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div key={user.id} className="relative" title={user.displayName || user.email}>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.email}
                className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-purple-600 dark:border-gray-800">
                <span className="text-xs font-medium text-white">
                  {(user.displayName || user.email)?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-800" />
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 dark:border-gray-800 dark:bg-gray-600">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">{users.length} online</span>
    </div>
  );
}
