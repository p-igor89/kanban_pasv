'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { BoardWithData, Status, Task } from '@/types/board';
import BoardColumn from '@/components/board/BoardColumn';
import BoardTaskCard from '@/components/board/BoardTaskCard';
import CreateTaskModal from '@/components/board/CreateTaskModal';
import TaskDrawer from '@/components/board/TaskDrawer';
import StatusModal from '@/components/board/StatusModal';
import BoardMembersModal from '@/components/board/BoardMembersModal';
import { useRealtimeBoardState } from '@/hooks/useRealtimeBoard';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<BoardWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [defaultStatusId, setDefaultStatusId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>(
    'viewer'
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Subscribe to realtime updates
  useRealtimeBoardState(board, setBoard);

  const fetchBoard = useCallback(async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/boards');
          return;
        }
        throw new Error('Failed to fetch board');
      }
      const data = await response.json();
      setBoard(data.board);
      if (data.userRole) {
        setCurrentUserRole(data.userRole);
      }
    } catch (error) {
      console.error('Error fetching board:', error);
      toast.error('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [boardId, router]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

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

    // Check if dropping over a status column
    const isOverColumn = board.statuses.some((s) => s.id === overId);
    const overTask = allTasks.find((t) => t.id === overId);

    let newStatusId: string | null = null;

    if (isOverColumn) {
      newStatusId = overId;
    } else if (overTask) {
      newStatusId = overTask.status_id;
    }

    if (newStatusId && activeTask.status_id !== newStatusId) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.map((status) => {
            if (status.id === activeTask.status_id) {
              return {
                ...status,
                tasks: status.tasks.filter((t) => t.id !== activeId),
              };
            }
            if (status.id === newStatusId) {
              const updatedTask = { ...activeTask, status_id: newStatusId };
              return {
                ...status,
                tasks: [...status.tasks, updatedTask],
              };
            }
            return status;
          }),
        };
      });
    }
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

    const targetStatusId = isOverColumn ? overId : overTask?.status_id || activeTask.status_id;

    const targetStatus = board.statuses.find((s) => s.id === targetStatusId);
    if (!targetStatus) return;

    const oldIndex = targetStatus.tasks.findIndex((t) => t.id === activeId);
    const newIndex = isOverColumn
      ? targetStatus.tasks.length - 1
      : targetStatus.tasks.findIndex((t) => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reorderedTasks = arrayMove(targetStatus.tasks, oldIndex, newIndex);

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.map((status) =>
            status.id === targetStatusId
              ? { ...status, tasks: reorderedTasks.map((t, idx) => ({ ...t, order: idx })) }
              : status
          ),
        };
      });
    }

    // Save to server
    try {
      await fetch(`/api/boards/${boardId}/tasks/${activeId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_id: targetStatusId,
          order: Math.max(0, newIndex),
        }),
      });
    } catch {
      toast.error('Failed to move task');
      fetchBoard();
    }
  };

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

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.map((status) =>
            status.id === task.status_id ? { ...status, tasks: [...status.tasks, task] } : status
          ),
        };
      });

      toast.success('Task created');
      setIsTaskModalOpen(false);
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

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.map((status) => ({
            ...status,
            tasks: status.tasks.map((t) => (t.id === taskId ? task : t)),
          })),
        };
      });

      setSelectedTask(task);
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        statuses: prev.statuses.map((status) => ({
          ...status,
          tasks: status.tasks.filter((t) => t.id !== taskId),
        })),
      };
    });

    try {
      const response = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
      fetchBoard();
    }
  };

  const handleCreateStatus = async (data: { name: string; color: string }) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create status');

      const { status } = await response.json();

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: [...prev.statuses, { ...status, tasks: [] }],
        };
      });

      toast.success('Column created');
      setIsStatusModalOpen(false);
    } catch {
      toast.error('Failed to create column');
    }
  };

  const handleUpdateStatus = async (statusId: string, data: { name: string; color: string }) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/statuses/${statusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const { status } = await response.json();

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.map((s) => (s.id === statusId ? { ...s, ...status } : s)),
        };
      });

      toast.success('Column updated');
      setIsStatusModalOpen(false);
      setEditingStatus(null);
    } catch {
      toast.error('Failed to update column');
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    const status = board?.statuses.find((s) => s.id === statusId);
    if (status && status.tasks.length > 0) {
      toast.error('Cannot delete column with tasks');
      return;
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/statuses/${statusId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete status');

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          statuses: prev.statuses.filter((s) => s.id !== statusId),
        };
      });

      toast.success('Column deleted');
    } catch {
      toast.error('Failed to delete column');
    }
  };

  const openCreateTaskModal = (statusId?: string) => {
    setDefaultStatusId(statusId || board?.statuses[0]?.id || null);
    setIsTaskModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 mb-4">Board not found</p>
        <Link href="/boards" className="text-blue-600 hover:underline">
          Back to boards
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/boards"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                {board.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Users className="h-4 w-4" />
            <span className="hidden xs:inline">Members</span>
          </button>
          <button
            onClick={() => {
              setEditingStatus(null);
              setIsStatusModalOpen(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden xs:inline">Add Column</span>
          </button>
          <button
            onClick={() => openCreateTaskModal()}
            className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 ml-auto"
          >
            <Plus className="h-4 sm:h-5 w-4 sm:w-5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none scroll-smooth">
          {board.statuses.map((status) => (
            <BoardColumn
              key={status.id}
              status={status}
              tasks={status.tasks}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setIsDrawerOpen(true);
              }}
              onTaskDelete={handleDeleteTask}
              onAddTask={() => openCreateTaskModal(status.id)}
              onEditStatus={() => {
                setEditingStatus(status);
                setIsStatusModalOpen(true);
              }}
              onDeleteStatus={() => handleDeleteStatus(status.id)}
            />
          ))}

          {/* Add Column Button */}
          <button
            onClick={() => {
              setEditingStatus(null);
              setIsStatusModalOpen(true);
            }}
            className="flex-shrink-0 w-[280px] sm:w-72 h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors snap-center sm:snap-align-none"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Add Column</span>
          </button>
        </div>

        <DragOverlay>
          {activeTask ? <BoardTaskCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        statuses={board.statuses}
        defaultStatusId={defaultStatusId}
      />

      <TaskDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        statuses={board.statuses}
        boardId={boardId}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setEditingStatus(null);
        }}
        onSubmit={
          editingStatus ? (data) => handleUpdateStatus(editingStatus.id, data) : handleCreateStatus
        }
        status={editingStatus}
      />

      <BoardMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        boardId={boardId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
