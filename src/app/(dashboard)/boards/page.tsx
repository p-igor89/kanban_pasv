'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';

// React Query
import { useBoards, useCreateBoard, useDeleteBoard } from '@/hooks/api';
import { usePrefetchBoard } from '@/hooks/usePrefetchBoard';

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
  // React Query hooks
  const { data: boards = [], isLoading: loading } = useBoards();
  const createBoardMutation = useCreateBoard();
  const deleteBoardMutation = useDeleteBoard();
  const { prefetchBoard } = usePrefetchBoard();

  // Local UI state
  const [showModal, setShowModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    if (templates.length === 0) {
      fetchTemplates();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewBoardName('');
    setNewBoardDescription('');
    setSelectedTemplate(null);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBoardName.trim()) {
      toast.error('Board name is required');
      return;
    }

    createBoardMutation.mutate(
      {
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || undefined,
        template_id: selectedTemplate || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Board created successfully');
          handleCloseModal();
        },
        onError: () => {
          toast.error('Failed to create board');
        },
      }
    );
  };

  const handleDeleteBoard = async () => {
    if (!deleteTarget) return;

    deleteBoardMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Board deleted');
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error('Failed to delete board');
      },
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Boards</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Board
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <LayoutGrid className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">No boards yet</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first board
          </p>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => {
            const RoleIcon = board.role ? roleIcons[board.role] : User;
            const roleLabel = board.role ? roleLabels[board.role] : 'Member';
            const roleColor = board.role ? roleColors[board.role] : roleColors.member;

            return (
              <div
                key={board.id}
                className="group relative flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                onMouseEnter={() => prefetchBoard(board.id)}
              >
                <Link href={`/boards/${board.id}`} className="flex-1">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                        {board.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    {(board.statuses_count !== undefined || board.tasks_count !== undefined) && (
                      <div className="flex items-center gap-4">
                        {board.statuses_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <LayoutGrid className="h-4 w-4" />
                            <span>{board.statuses_count} columns</span>
                          </div>
                        )}
                        {board.tasks_count !== undefined && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{board.tasks_count} tasks</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${roleColor}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {roleLabel}
                        </span>
                        {board.is_shared && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Users className="h-3 w-3" />
                            Shared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Delete button (owner only) */}
                {board.role === 'owner' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteTarget({ id: board.id, name: board.name });
                    }}
                    className="absolute right-4 top-4 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-gray-700"
                    aria-label="Delete board"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Create New Board
            </h2>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              {/* Board Name */}
              <div>
                <label
                  htmlFor="board-name"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Board Name *
                </label>
                <input
                  id="board-name"
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="My awesome board"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                  autoFocus
                />
              </div>

              {/* Board Description */}
              <div>
                <label
                  htmlFor="board-description"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description (optional)
                </label>
                <textarea
                  id="board-description"
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder="What is this board about?"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Templates */}
              {templates.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Choose a template (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selectedTemplate === null
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="text-sm font-medium">Blank Board</div>
                      <div className="text-xs text-gray-500">Start from scratch</div>
                    </button>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-sm font-medium">{template.name}</div>
                        <div className="text-xs text-gray-500">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingTemplates && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  disabled={createBoardMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBoardMutation.isPending || !newBoardName.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createBoardMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Board
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteBoard}
        onClose={() => setDeleteTarget(null)}
        loading={deleteBoardMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
