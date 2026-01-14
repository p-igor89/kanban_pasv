'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// Types
import type { Task, TaskPriority } from '@/types/board';

// Hooks
import { useBoardState } from '@/hooks/useBoardState';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useRealtimeBoardState } from '@/hooks/useRealtimeBoard';

// Components
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardColumns } from '@/components/board/BoardColumns';
import CreateTaskModal from '@/components/board/CreateTaskModal';
import TaskDrawer from '@/components/board/TaskDrawer';
import StatusModal from '@/components/board/StatusModal';
import BoardMembersModal from '@/components/board/BoardMembersModal';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  // Centralized state management
  const { state, actions } = useBoardState();

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
  const persistTaskMove = async (
    taskId: string,
    newStatusId: string,
    newOrder: number
  ) => {
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
   * Permissions
   */
  const canEdit = ['owner', 'admin', 'member'].includes(
    state.currentUserRole
  );

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
        onAddTask={actions.openTaskModal}
        onEditStatus={actions.openStatusModal}
        onDeleteStatus={(statusId) => {
          // Handle status deletion
          console.log('Delete status:', statusId);
        }}
      />

      {/* Modals */}
      {state.isTaskModalOpen && (
        <CreateTaskModal
          boardId={boardId}
          statuses={state.board.statuses}
          defaultStatusId={state.defaultStatusId}
          onClose={actions.closeTaskModal}
          onSubmit={handleCreateTask}
        />
      )}

      {state.isDrawerOpen && state.selectedTask && (
        <TaskDrawer
          task={state.selectedTask}
          boardId={boardId}
          onClose={actions.closeDrawer}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          canEdit={canEdit}
        />
      )}

      {state.isStatusModalOpen && (
        <StatusModal
          boardId={boardId}
          status={state.editingStatus}
          onClose={actions.closeStatusModal}
        />
      )}

      {state.isMembersModalOpen && (
        <BoardMembersModal
          boardId={boardId}
          onClose={actions.closeMembersModal}
        />
      )}
    </div>
  );
}
