'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Settings, Loader2, Users } from 'lucide-react';
import { Status, Task, TaskPriority } from '@/types/board';
import BoardColumn from '@/components/board/BoardColumn';
import BoardTaskCard from '@/components/board/BoardTaskCard';
import CreateTaskModal from '@/components/board/CreateTaskModal';
import TaskDrawer from '@/components/board/TaskDrawer';
import StatusModal from '@/components/board/StatusModal';
import BoardMembersModal from '@/components/board/BoardMembersModal';
import { useRealtimeBoardState } from '@/hooks/useRealtimeBoard';

// React Query hooks
import {
  useBoard,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
} from '@/hooks/api';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  // React Query hooks
  const {
    data: board,
    isLoading: loading,
    error,
  } = useBoard(boardId);

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask(''); // Will be set dynamically
  const deleteTaskMutation = useDeleteTask();
  const reorderTasksMutation = useReorderTasks();

  // Local UI state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [defaultStatusId, setDefaultStatusId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    'owner' | 'admin' | 'member' | 'viewer'
  >('viewer');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Subscribe to realtime updates (optional - React Query refetch might be enough)
  // useRealtimeBoardState(board, setBoard);

  // Handle errors
  if (error) {
    toast.error('Failed to load board');
    router.push('/boards');
    return null;
  }

  // All tasks flat array for drag & drop
  const allTasks = useMemo(() => {
    if (!board) return [];
    return board.statuses.flatMap((status) => status.tasks);
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = allTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Optimistic UI update handled by React Query in handleDragEnd
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = allTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const isOverColumn = board.statuses.some((s) => s.id === overId);
    const overTask = allTasks.find((t) => t.id === overId);

    const targetStatusId = isOverColumn
      ? overId
      : overTask?.status_id || activeTask.status_id;

    const targetStatus = board.statuses.find((s) => s.id === targetStatusId);
    if (!targetStatus) return;

    const oldIndex = targetStatus.tasks.findIndex((t) => t.id === activeId);
    const newIndex = isOverColumn
      ? targetStatus.tasks.length - 1
      : targetStatus.tasks.findIndex((t) => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedTasks = arrayMove(targetStatus.tasks, oldIndex, newIndex);

      // Build updates array for batch mutation
      const updates = reorderedTasks.map((task, idx) => ({
        id: task.id,
        order: idx,
        status_id: targetStatusId,
      }));

      // Use React Query mutation with optimistic update
      reorderTasksMutation.mutate(updates, {
        onError: () => {
          toast.error('Failed to move task');
        },
      });
    }
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    status_id: string;
    priority?: string;
    due_date?: string;
  }) => {
    createTaskMutation.mutate(
      {
        board_id: boardId,
        status_id: data.status_id,
        title: data.title,
        description: data.description || null,
        priority: (data.priority as TaskPriority) || null,
        due_date: data.due_date || null,
      },
      {
        onSuccess: () => {
          toast.success('Task created');
          setIsTaskModalOpen(false);
        },
        onError: () => {
          toast.error('Failed to create task');
        },
      }
    );
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Create a mutation instance for this specific task
    const mutation = useUpdateTask(taskId);

    mutation.mutate(updates, {
      onSuccess: () => {
        toast.success('Task updated');
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, ...updates });
        }
      },
      onError: () => {
        toast.error('Failed to update task');
      },
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    deleteTaskMutation.mutate(taskId, {
      onSuccess: () => {
        toast.success('Task deleted');
        setIsDrawerOpen(false);
        setSelectedTask(null);
      },
      onError: () => {
        toast.error('Failed to delete task');
      },
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleAddTask = (statusId: string) => {
    setDefaultStatusId(statusId);
    setIsTaskModalOpen(true);
  };

  const canEdit = ['owner', 'admin', 'member'].includes(currentUserRole);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Board not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/boards')}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {board.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Users className="h-4 w-4" />
            Members
          </button>

          {canEdit && (
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Status
            </button>
          )}
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4">
            {board.statuses.map((status) => (
              <BoardColumn
                key={status.id}
                status={status}
                tasks={status.tasks}
                onTaskClick={handleTaskClick}
                onAddTask={() => handleAddTask(status.id)}
                canEdit={canEdit}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <BoardTaskCard task={activeTask} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {isTaskModalOpen && (
        <CreateTaskModal
          boardId={boardId}
          statuses={board.statuses}
          defaultStatusId={defaultStatusId}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {isDrawerOpen && selectedTask && (
        <TaskDrawer
          task={selectedTask}
          boardId={boardId}
          onClose={() => setIsDrawerOpen(false)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          canEdit={canEdit}
        />
      )}

      {isStatusModalOpen && (
        <StatusModal
          boardId={boardId}
          status={editingStatus}
          onClose={() => {
            setIsStatusModalOpen(false);
            setEditingStatus(null);
          }}
        />
      )}

      {isMembersModalOpen && (
        <BoardMembersModal
          boardId={boardId}
          onClose={() => setIsMembersModalOpen(false)}
        />
      )}
    </div>
  );
}
