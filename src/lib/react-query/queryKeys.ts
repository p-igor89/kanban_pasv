/**
 * Query keys factory for type-safe cache management
 * Follows the "Query Key Factory" pattern from React Query docs
 */

export const queryKeys = {
  // Boards
  boards: {
    all: ['boards'] as const,
    lists: () => [...queryKeys.boards.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.boards.lists(), filters] as const,
    details: () => [...queryKeys.boards.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.boards.details(), id] as const,
    members: (boardId: string) =>
      [...queryKeys.boards.detail(boardId), 'members'] as const,
  },

  // Statuses
  statuses: {
    all: ['statuses'] as const,
    byBoard: (boardId: string) =>
      [...queryKeys.statuses.all, 'board', boardId] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (boardId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.tasks.lists(), boardId, filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (taskId: string) => [...queryKeys.tasks.details(), taskId] as const,
    byStatus: (boardId: string, statusId: string) =>
      [...queryKeys.tasks.list(boardId), 'status', statusId] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    byTask: (taskId: string) =>
      [...queryKeys.comments.all, 'task', taskId] as const,
  },

  // Attachments
  attachments: {
    all: ['attachments'] as const,
    byTask: (taskId: string) =>
      [...queryKeys.attachments.all, 'task', taskId] as const,
  },

  // Activities
  activities: {
    all: ['activities'] as const,
    byBoard: (boardId: string) =>
      [...queryKeys.activities.all, 'board', boardId] as const,
    byTask: (taskId: string) =>
      [...queryKeys.activities.all, 'task', taskId] as const,
  },

  // Search
  search: {
    all: ['search'] as const,
    query: (q: string) => [...queryKeys.search.all, q] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    current: () => [...queryKeys.profile.all, 'current'] as const,
  },
} as const;
