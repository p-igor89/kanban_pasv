'use client';

import { useCallback, useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// Types
import type { Task, Status, BoardMemberRole } from '@/types/board';

// React Query Hooks
import {
  useBoard,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
  useReorderTasksMutation,
  useCreateStatusMutation,
  useUpdateStatusMutation,
  useDeleteStatusMutation,
  useReorderStatusesMutation,
} from '@/hooks/api';

// Other Hooks
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useRealtimeBoardState } from '@/hooks/useRealtimeBoard';
import { usePermissions } from '@/hooks/usePermissions';
import { usePresence } from '@/hooks/usePresence';
import { useCursors } from '@/hooks/useCursors';
import { useAuth } from '@/contexts/AuthContext';

// Components
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardColumns } from '@/components/board/BoardColumns';
import ConfirmDialog from '@/components/ConfirmDialog';

// Lazy-loaded modals
const CreateTaskModal = lazy(() => import('@/components/board/CreateTaskModal'));
const TaskDrawer = lazy(() => import('@/components/board/TaskDrawer'));
const StatusModal = lazy(() => import('@/components/board/StatusModal'));
const BoardMembersModal = lazy(() => import('@/components/board/BoardMembersModal'));

// Lazy-loaded collaboration features
const CursorOverlay = lazy(async () => {
  const mod = await import('@/components/board/CursorOverlay');
  return { default: mod.CursorOverlay };
});

export default function BoardPageWithReactQuery() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const { user } = useAuth();

  // React Query - fetch board data
  const { data: boardData, isLoading, error, refetch } = useBoard(boardId);

  // React Query Mutations
  const createTaskMutation = useCreateTaskMutation(boardId);
  const updateTaskMutation = useUpdateTaskMutation(boardId);
  const deleteTaskMutation = useDeleteTaskMutation(boardId);
  const moveTaskMutation = useMoveTaskMutation(boardId);
  const reorderTasksMutation = useReorderTasksMutation(boardId);
  const createStatusMutation = useCreateStatusMutation(boardId);
  const updateStatusMutation = useUpdateStatusMutation(boardId);
  const deleteStatusMutation = useDeleteStatusMutation(boardId);
  const reorderStatusesMutation = useReorderStatusesMutation(boardId);

  // Local UI state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);

  const board = boardData?.board || null;
  const userRole = (boardData?.userRole as BoardMemberRole) || 'viewer';

  // Permissions
  const permissions = usePermissions({ role: userRole });

  // Presence - track online users
  const { onlineUsers } = usePresence({
    boardId,
    userId: user?.id || '',
    userEmail: user?.email || '',
    userDisplayName: user?.user_metadata?.display_name || user?.user_metadata?.full_name,
    userAvatarUrl: user?.user_metadata?.avatar_url,
  });

  // Cursors - track live cursor positions
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const { cursors, updateCursor } = useCursors({
    boardId,
    userId: user?.id || '',
    userEmail: user?.email || '',
    userDisplayName: user?.user_metadata?.display_name || user?.user_metadata?.full_name,
    enabled: !!user?.id,
  });

  // Drag and drop logic
  const dragAndDrop = useDragAndDrop({
    board,
    onReorder: (statusId, tasks) => {
      reorderTasksMutation.mutate(tasks, {
        onError: () => {
          toast.error('Failed to save task order');
          refetch();
        },
      });
    },
    onMove: (taskId, newStatusId, newOrder) => {
      moveTaskMutation.mutate(
        { taskId, newStatusId, newOrder },
        {
          onError: () => {
            toast.error('Failed to move task');
            refetch();
          },
        }
      );
    },
    onReorderStatuses: (statuses) => {
      reorderStatusesMutation.mutate(statuses, {
        onError: () => {
          toast.error('Failed to save column order');
          refetch();
        },
      });
    },
  });

  // Subscribe to realtime updates
  useRealtimeBoardState(board, () => {
    refetch();
  });

  // Handle 404 error - redirect to boards list
  useEffect(() => {
    if (error && error.message === 'Board not found') {
      toast.error('Board not found');
      router.push('/boards');
    }
  }, [error, router]);

  /**
   * Task operations
   */
  const handleCreateTask = useCallback(
    async (data: {
      title: string;
      description?: string;
      status_id: string;
      priority?: string;
      due_date?: string;
    }) => {
      return new Promise<void>((resolve, reject) => {
        createTaskMutation.mutate(data, {
          onSuccess: () => {
            toast.success('Task created');
            setIsTaskModalOpen(false);
            setSelectedStatusId(null);
            resolve();
          },
          onError: (error) => {
            toast.error('Failed to create task');
            reject(error);
          },
        });
      });
    },
    [createTaskMutation]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      return new Promise<void>((resolve, reject) => {
        updateTaskMutation.mutate(
          { taskId, updates },
          {
            onSuccess: () => {
              toast.success('Task updated');
              resolve();
            },
            onError: (error) => {
              toast.error('Failed to update task');
              reject(error);
            },
          }
        );
      });
    },
    [updateTaskMutation]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteTaskMutation.mutate(taskId, {
        onSuccess: () => {
          toast.success('Task deleted');
          setActiveTaskId(null);
        },
        onError: () => {
          toast.error('Failed to delete task');
        },
      });
    },
    [deleteTaskMutation]
  );

  /**
   * Status operations
   */
  const handleCreateOrUpdateStatus = useCallback(
    async (data: { name: string; color: string }) => {
      return new Promise<void>((resolve, reject) => {
        if (editingStatus) {
          updateStatusMutation.mutate(
            { statusId: editingStatus.id, data },
            {
              onSuccess: () => {
                toast.success('Status updated');
                setIsStatusModalOpen(false);
                setEditingStatus(null);
                resolve();
              },
              onError: (error) => {
                toast.error('Failed to update status');
                reject(error);
              },
            }
          );
        } else {
          createStatusMutation.mutate(data, {
            onSuccess: () => {
              toast.success('Status created');
              setIsStatusModalOpen(false);
              resolve();
            },
            onError: (error) => {
              toast.error('Failed to create status');
              reject(error);
            },
          });
        }
      });
    },
    [editingStatus, updateStatusMutation, createStatusMutation]
  );

  const handleDeleteStatus = useCallback(() => {
    if (!deletingStatusId) return;

    deleteStatusMutation.mutate(deletingStatusId, {
      onSuccess: () => {
        toast.success('Status deleted');
        setDeletingStatusId(null);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete status');
        setDeletingStatusId(null);
      },
    });
  }, [deletingStatusId, deleteStatusMutation]);

  /**
   * Modal handlers
   */
  const handleOpenTaskModal = useCallback((statusId: string) => {
    setSelectedStatusId(statusId);
    setIsTaskModalOpen(true);
  }, []);

  const handleOpenTaskDrawer = useCallback((task: Task) => {
    setActiveTaskId(task.id);
  }, []);

  const handleOpenStatusModal = useCallback((status?: Status) => {
    if (status) {
      setEditingStatus(status);
    }
    setIsStatusModalOpen(true);
  }, []);

  /**
   * Permission-based UI checks
   */
  const canEdit = permissions.canEditTask || permissions.canCreateTask || permissions.canDeleteTask;

  /**
   * Get active task for drawer
   */
  const activeTask =
    board?.statuses.flatMap((s) => s.tasks).find((t) => t.id === activeTaskId) || null;

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  /**
   * Error state
   */
  if (error || !board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Failed to load board</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boardContainerRef} className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Live cursors overlay */}
      <Suspense fallback={null}>
        {cursors.length > 0 && (
          <CursorOverlay
            cursors={cursors}
            onCursorMove={updateCursor}
            containerRef={boardContainerRef}
          />
        )}
      </Suspense>

      {/* Header */}
      <BoardHeader
        board={board}
        canEdit={canEdit}
        onlineUsers={onlineUsers}
        onBack={() => router.push('/boards')}
        onOpenMembers={() => setIsMembersModalOpen(true)}
        onOpenStatusModal={() => handleOpenStatusModal()}
      />

      {/* Board Columns */}
      <BoardColumns
        board={board}
        canEdit={canEdit}
        sensors={dragAndDrop.sensors}
        activeTask={dragAndDrop.activeTask}
        activeColumn={dragAndDrop.activeColumn}
        onDragStart={dragAndDrop.handleDragStart}
        onDragOver={dragAndDrop.handleDragOver}
        onDragEnd={dragAndDrop.handleDragEnd}
        onTaskClick={handleOpenTaskDrawer}
        onTaskDelete={handleDeleteTask}
        onAddTask={handleOpenTaskModal}
        onEditStatus={handleOpenStatusModal}
        onDeleteStatus={setDeletingStatusId}
      />

      {/* Modals - Lazy loaded with Suspense */}
      <Suspense fallback={null}>
        {isTaskModalOpen && (
          <CreateTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => {
              setIsTaskModalOpen(false);
              setSelectedStatusId(null);
            }}
            onSubmit={handleCreateTask}
            statuses={board.statuses}
            defaultStatusId={selectedStatusId}
          />
        )}

        {activeTask && (
          <TaskDrawer
            isOpen={!!activeTask}
            task={activeTask}
            statuses={board.statuses}
            boardId={boardId}
            onClose={() => setActiveTaskId(null)}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}

        {isStatusModalOpen && (
          <StatusModal
            isOpen={isStatusModalOpen}
            onClose={() => {
              setIsStatusModalOpen(false);
              setEditingStatus(null);
            }}
            onSubmit={handleCreateOrUpdateStatus}
            status={editingStatus}
          />
        )}

        {isMembersModalOpen && (
          <BoardMembersModal
            isOpen={isMembersModalOpen}
            boardId={boardId}
            onClose={() => setIsMembersModalOpen(false)}
            currentUserRole={userRole}
          />
        )}
      </Suspense>

      {/* Delete Status Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingStatusId}
        title="Delete Status"
        message="Are you sure you want to delete this status? This action cannot be undone if the status has no tasks."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteStatus}
        onClose={() => setDeletingStatusId(null)}
        loading={deleteStatusMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
