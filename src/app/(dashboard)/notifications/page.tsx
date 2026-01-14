'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2, ArrowLeft, Mail, UserPlus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithCsrf } from '@/lib/security/fetch-with-csrf';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  board_id: string | null;
  task_id: string | null;
  read_at: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Bell> = {
  board_invite: UserPlus,
  task_assigned: FileText,
  task_due: Bell,
  comment_mention: Mail,
  board_role_changed: UserPlus,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?limit=50');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    setMarking(true);
    try {
      const response = await fetchWithCsrf('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as read');
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      toast.success('All marked as read');
    } catch (error) {
      console.error('Error marking notifications:', error);
      toast.error('Failed to mark as read');
    } finally {
      setMarking(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetchWithCsrf('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [id] }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as read');
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error('Error marking notification:', error);
    }
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

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/boards"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{unreadCount} unread</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={marking}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            {marking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            No notifications yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You&apos;ll see notifications here when there&apos;s activity
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const isUnread = !notification.read_at;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                  isUnread
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUnread ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isUnread ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`font-medium ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {notification.title}
                    </p>
                    {isUnread && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
