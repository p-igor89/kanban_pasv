'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  LayoutGrid,
  Loader2,
  Trash2,
  Calendar,
  Users,
  Crown,
  Shield,
  Eye,
  User,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Board {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  statuses_count: number;
  tasks_count: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  is_shared: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_public: boolean;
  statuses: Array<{ name: string; color: string; order: number }>;
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const roleColors = {
  owner: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  member: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/boards');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch boards');
      }

      setBoards(data.boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openCreateModal = () => {
    setShowModal(true);
    setSelectedTemplate(null);
    fetchTemplates();
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoardName.trim(),
          description: newBoardDescription.trim() || null,
          template_id: selectedTemplate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create board');
      }

      const templateStatusCount = selectedTemplate
        ? templates.find((t) => t.id === selectedTemplate)?.statuses.length || 4
        : 4;
      setBoards((prev) => [
        {
          ...data.board,
          statuses_count: templateStatusCount,
          tasks_count: 0,
          role: 'owner',
          is_shared: false,
        },
        ...prev,
      ]);
      setShowModal(false);
      setNewBoardName('');
      setNewBoardDescription('');
      setSelectedTemplate(null);
      toast.success('Board created!');
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (boardId: string, boardName: string) => {
    setDeleteTarget({ id: boardId, name: boardName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/boards/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete board');
      }

      setBoards((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success('Board deleted');
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Boards</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {boards.length} {boards.length === 1 ? 'board' : 'boards'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          New Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <LayoutGrid className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No boards yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first board to get started
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => {
            const RoleIcon = roleIcons[board.role];
            return (
              <div
                key={board.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <Link href={`/boards/${board.id}`} className="block p-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {board.name}
                    </h3>
                    {board.is_shared && (
                      <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Users className="h-3 w-3" />
                        Shared
                      </span>
                    )}
                  </div>
                  {board.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {board.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{board.statuses_count} columns</span>
                    <span>{board.tasks_count} tasks</span>
                  </div>
                </Link>

                <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="hidden xs:inline">{formatDate(board.created_at)}</span>
                      <span className="xs:hidden">
                        {new Date(board.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[board.role]}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      <span className="hidden sm:inline">{roleLabels[board.role]}</span>
                    </span>
                  </div>

                  {board.role === 'owner' && (
                    <button
                      onClick={() => handleDeleteClick(board.id, board.name)}
                      className="p-2 sm:p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors flex-shrink-0"
                      title="Delete board"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <form onSubmit={handleCreateBoard} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Create New Board
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Board Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="My Awesome Project"
                      maxLength={100}
                      required
                      autoFocus
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Description (optional)
                    </label>
                    <textarea
                      id="description"
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="What is this board for?"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Template Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Choose a Template
                    </label>
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Default template option */}
                        <button
                          type="button"
                          onClick={() => setSelectedTemplate(null)}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                            selectedTemplate === null
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <span className="text-xl">📋</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                Default
                              </span>
                              {selectedTemplate === null && (
                                <Check className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Backlog, Todo, In Progress, Done
                            </p>
                          </div>
                        </button>

                        {/* Template options */}
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplate(template.id)}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                              selectedTemplate === template.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <span className="text-xl">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                  {template.name}
                                </span>
                                {selectedTemplate === template.id && (
                                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {template.statuses.map((s) => s.name).join(', ')}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewBoardName('');
                    setNewBoardDescription('');
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBoardName.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All tasks, comments, and attachments will be permanently deleted.`}
        confirmText="Delete Board"
        icon="delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
