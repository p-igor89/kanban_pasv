/**
 * Drag and drop logic for Board component
 * Handles all DnD operations with @dnd-kit
 */

import { useState, useCallback, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { BoardWithData, Task } from '@/types/board';

interface UseDragAndDropOptions {
  board: BoardWithData | null;
  onReorder: (statusId: string, tasks: Task[]) => void;
  onMove: (taskId: string, newStatusId: string, newOrder: number) => void;
}

export function useDragAndDrop({
  board,
  onReorder,
  onMove,
}: UseDragAndDropOptions) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // 8px movement before drag starts
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 }, // 200ms delay for mobile
    })
  );

  // Flat array of all tasks for quick lookups
  const allTasks = useMemo(() => {
    if (!board) return [];
    return board.statuses.flatMap((status) => status.tasks);
  }, [board]);

  /**
   * Handle drag start - store the dragged task
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = allTasks.find((t) => t.id === event.active.id);
      if (task) {
        setActiveTask(task);
      }
    },
    [allTasks]
  );

  /**
   * Handle drag over - provide visual feedback (optional)
   * Most UI updates happen in handleDragEnd for performance
   */
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !board) return;

      // Can add visual feedback here if needed
      // For now, we keep it simple and handle everything in onDragEnd
    },
    [board]
  );

  /**
   * Handle drag end - commit the changes
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || !board) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTask = allTasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      // Determine if dropping over a column or a task
      const isOverColumn = board.statuses.some((s) => s.id === overId);
      const overTask = allTasks.find((t) => t.id === overId);

      const targetStatusId = isOverColumn
        ? overId
        : overTask?.status_id || activeTask.status_id;

      const targetStatus = board.statuses.find((s) => s.id === targetStatusId);
      if (!targetStatus) return;

      // Handle reordering within the same column
      if (activeTask.status_id === targetStatusId) {
        const oldIndex = targetStatus.tasks.findIndex((t) => t.id === activeId);
        const newIndex = isOverColumn
          ? targetStatus.tasks.length - 1
          : targetStatus.tasks.findIndex((t) => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(
            targetStatus.tasks,
            oldIndex,
            newIndex
          );

          // Update order property
          const tasksWithNewOrder = reorderedTasks.map((task, idx) => ({
            ...task,
            order: idx,
          }));

          onReorder(targetStatusId, tasksWithNewOrder);
        }
      } else {
        // Handle moving to a different column
        const newIndex = isOverColumn
          ? targetStatus.tasks.length
          : targetStatus.tasks.findIndex((t) => t.id === overId);

        onMove(activeId, targetStatusId, Math.max(0, newIndex));
      }
    },
    [board, allTasks, onReorder, onMove]
  );

  return {
    sensors,
    activeTask,
    allTasks,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
