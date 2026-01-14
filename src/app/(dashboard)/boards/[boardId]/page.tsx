'use client';

import { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// Types
import type { Task } from '@/types/board';

// Hooks
import { useBoardState } from '@/hooks/useBoardState';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useRealtimeBoardState } from '@/hooks/useRealtimeBoard';

// Components
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardColumns } from '@/components/board/BoardColumns';
import ConfirmDialog from '@/components/ConfirmDialog';

// Lazy-loaded modals for better initial load performance
const CreateTaskModal = lazy(() => import('@/components/board/CreateTaskModal'));
const TaskDrawer = lazy(() => import('@/components/board/TaskDrawer'));
const StatusModal = lazy(() => import('@/components/board/StatusModal'));
const BoardMembersModal = lazy(() => import('@/components/board/BoardMembersModal'));

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  // Centralized state management
  const { state, actions } = useBoardState();

  // Local state for status deletion
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop logic
  const dragAndDrop = useDragAndDrop({
    board: state.board,
    onReorder: (statusId, tasks) => {
      actions.reorderTasks(statusId, tasks);
      // Persist to server
      persistTaskReorder(tasks);
    },
    onMove: (taskId, newStatusId, newOrder) => {
      actions.moveTask(taskId, newStatusId, newOrder);
      // Persist to server
      persistTaskMove(taskId, newStatusId, newOrder);
    },
  });

  // Subscribe to realtime updates
  useRealtimeBoardState(state.board, actions.setBoard);

  /**
   * Fetch board data on mount
   */
  const fetchBoard = useCallback(async () => {
    try {
      actions.setLoading(true);
      const response = await fetch(`/api/boards/${boardId}`);

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/boards');
          return;
        }
        throw new Error('Failed to fetch board');
      }

      const data = await response.json();
      actions.setBoard(data.board);

      if (data.userRole) {
        actions.setUserRole(data.userRole);
      }
    } catch (error) {
      console.error('Error fetching board:', error);
      actions.setError(error as Error);
      toast.error('Failed to load board');
    }
  }, [boardId, router, actions]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  /**
   * Task operations
   */
  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    status_id: string;
    priority?: string;
    due_date?: string;
  }) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const { task } = await response.json();
      actions.addTask(task);
      actions.closeTaskModal();
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const { task } = await response.json();
      actions.updateTask(taskId, task);
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      actions.deleteTask(taskId);
      actions.closeDrawer();
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  /**
   * Persist task reorder to server
   */
  const persistTaskReorder = async (tasks: Task[]) => {
    try {
      await fetch(`/api/boards/${boardId}/tasks/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map((t) => ({ id: t.id, order: t.order })),
        }),
      });
    } catch {
      toast.error('Failed to save task order');
      fetchBoard(); // Refetch on error
    }
  };

  /**
   * Persist task move to server
   */
  const persistTaskMove = async (taskId: string, newStatusId: string, newOrder: number) => {
    try {
      await fetch(`/api/boards/${boardId}/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_id: newStatusId,
          order: newOrder,
        }),
      });
    } catch {
      toast.error('Failed to move task');
      fetchBoard(); // Refetch on error
    }
  };

  /**
   * Status operations
   */
  const handleCreateOrUpdateStatus = async (data: { name: string; color: string }) => {
    try {
      const url = state.editingStatus
        ? `/api/boards/${boardId}/statuses/${state.editingStatus.id}`
        : `/api/boards/${boardId}/statuses`;
      const method = state.editingStatus ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save status');

      await fetchBoard(); // Refetch board to get updated statuses
      actions.closeStatusModal();
      toast.success(`Status ${state.editingStatus ? 'updated' : 'created'}`);
    } catch {
      toast.error('Failed to save status');
    }
  };

  const handleDeleteStatus = async () => {
    if (!deletingStatusId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/boards/${boardId}/statuses/${deletingStatusId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          toast.error(data.error || 'Cannot delete status with tasks');
        } else {
          throw new Error('Failed to delete status');
        }
        return;
      }

      await fetchBoard(); // Refetch board to get updated statuses
      setDeletingStatusId(null);
      toast.success('Status deleted successfully');
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error('Failed to delete status');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Permissions
   */
  const canEdit = ['owner', 'admin', 'member'].includes(state.currentUserRole);

  /**
   * Loading state
   */
  if (state.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  /**
   * Error state
   */
  if (state.error || !state.board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Failed to load board</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <BoardHeader
        board={state.board}
        canEdit={canEdit}
        onBack={() => router.push('/boards')}
        onOpenMembers={actions.openMembersModal}
        onOpenStatusModal={actions.openStatusModal}
      />

      {/* Board Columns */}
      <BoardColumns
        board={state.board}
        canEdit={canEdit}
        sensors={dragAndDrop.sensors}
        activeTask={dragAndDrop.activeTask}
        onDragStart={dragAndDrop.handleDragStart}
        onDragOver={dragAndDrop.handleDragOver}
        onDragEnd={dragAndDrop.handleDragEnd}
        onTaskClick={actions.openDrawer}
        onTaskDelete={handleDeleteTask}
        onAddTask={actions.openTaskModal}
        onEditStatus={actions.openStatusModal}
        onDeleteStatus={setDeletingStatusId}
      />

      {/* Modals - Lazy loaded with Suspense for better performance */}
      <Suspense fallback={null}>
        <CreateTaskModal
          isOpen={state.isTaskModalOpen}
          statuses={state.board.statuses}
          defaultStatusId={state.defaultStatusId}
          onClose={actions.closeTaskModal}
          onSubmit={handleCreateTask}
        />
      </Suspense>

      <Suspense fallback={null}>
        <TaskDrawer
          task={state.selectedTask}
          isOpen={state.isDrawerOpen}
          boardId={boardId}
          statuses={state.board.statuses}
          onClose={actions.closeDrawer}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      </Suspense>

      <Suspense fallback={null}>
        <StatusModal
          isOpen={state.isStatusModalOpen}
          status={state.editingStatus}
          onClose={actions.closeStatusModal}
          onSubmit={handleCreateOrUpdateStatus}
        />
      </Suspense>

      <Suspense fallback={null}>
        <BoardMembersModal
          isOpen={state.isMembersModalOpen}
          boardId={boardId}
          currentUserRole={state.currentUserRole}
          onClose={actions.closeMembersModal}
        />
      </Suspense>

      {/* Delete Status Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingStatusId}
        onClose={() => setDeletingStatusId(null)}
        onConfirm={handleDeleteStatus}
        title="Delete Status"
        message="Are you sure you want to delete this status? This action cannot be undone. All tasks must be moved or deleted first."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        icon="delete"
        loading={isDeleting}
      />
    </div>
  );
}
