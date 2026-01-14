'use client';

import { memo } from 'react';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import BoardColumn from './BoardColumn';
import BoardTaskCard from './BoardTaskCard';
import type { BoardWithData, Task, Status } from '@/types/board';

interface BoardColumnsProps {
  board: BoardWithData;
  canEdit: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  activeTask: Task | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask: (statusId: string) => void;
  onEditStatus?: (status: Status) => void;
  onDeleteStatus?: (statusId: string) => void;
}

function BoardColumnsComponent({
  board,
  canEdit,
  sensors,
  activeTask,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTaskClick,
  onTaskDelete,
  onAddTask,
  onEditStatus,
  onDeleteStatus,
}: BoardColumnsProps) {
  return (
    <div className="flex-1 overflow-x-auto p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 pb-4">
          {board.statuses.map((status) => (
            <BoardColumn
              key={status.id}
              status={status}
              tasks={status.tasks}
              onTaskClick={onTaskClick}
              onTaskDelete={onTaskDelete}
              onAddTask={() => onAddTask(status.id)}
              onEditStatus={() => onEditStatus?.(status)}
              onDeleteStatus={() => onDeleteStatus?.(status.id)}
            />
          ))}

          {board.statuses.length === 0 && (
            <div className="flex h-96 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">No statuses yet</p>
                {canEdit && (
                  <p className="mt-2 text-sm text-gray-400">
                    Click &quot;Add Status&quot; to create your first column
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drag overlay for better UX */}
        <DragOverlay>{activeTask && <BoardTaskCard task={activeTask} isDragOverlay />}</DragOverlay>
      </DndContext>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render when board data, sensors, or callbacks actually change
export const BoardColumns = memo(BoardColumnsComponent);
