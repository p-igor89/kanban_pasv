'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Activity, Plus, Edit, Trash, Move, UserPlus, UserMinus } from 'lucide-react';

interface ActivityItem {
  id: string;
  board_id: string;
  task_id: string | null;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string;
  };
}

interface BoardActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

const actionIcons: Record<string, typeof Activity> = {
  board_created: Plus,
  task_created: Plus,
  task_updated: Edit,
  task_deleted: Trash,
  task_moved: Move,
  status_created: Plus,
  status_updated: Edit,
  status_deleted: Trash,
  member_invited: UserPlus,
  member_removed: UserMinus,
  member_role_changed: Edit,
  comment_added: Edit,
};

const actionLabels: Record<string, string> = {
  board_created: 'created this board',
  task_created: 'created a task',
  task_updated: 'updated a task',
  task_deleted: 'deleted a task',
  task_moved: 'moved a task',
  status_created: 'created a column',
  status_updated: 'updated a column',
  status_deleted: 'deleted a column',
  member_invited: 'invited a member',
  member_removed: 'removed a member',
  member_role_changed: 'changed a member role',
  comment_added: 'added a comment',
};

export default function BoardActivityModal({ isOpen, onClose, boardId }: BoardActivityModalProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchActivities(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, boardId]);

  const fetchActivities = async (pageNum: number, reset = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${boardId}/activities?page=${pageNum}&limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activities');
      }

      if (reset) {
        setActivities(data.activities || []);
      } else {
        setActivities((prev) => [...prev, ...(data.activities || [])]);
      }
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity History
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && activities.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No activity yet</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = actionIcons[activity.action] || Activity;
                const label = actionLabels[activity.action] || activity.action;
                const userName =
                  activity.profile?.display_name || activity.profile?.email || 'Someone';

                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{userName}</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{label}</span>
                      </p>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {activity.details.task_title
                            ? `"${String(activity.details.task_title)}"`
                            : null}
                          {activity.details.old_status && activity.details.new_status ? (
                            <span>
                              {String(activity.details.old_status)} →{' '}
                              {String(activity.details.new_status)}
                            </span>
                          ) : null}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
