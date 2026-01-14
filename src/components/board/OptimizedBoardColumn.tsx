'use client';

import { memo, useCallback, useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Status, Task } from '@/types/board';
import BoardTaskCard from './BoardTaskCard';

interface OptimizedBoardColumnProps {
  status: Status;
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  onAddTask: (statusId: string) => void;
  onEditStatus?: (status: Status) => void;
  onDeleteStatus?: (statusId: string) => void;
  canEdit: boolean;
  isDragging?: boolean;
}

/**
 * Optimized column component with React.memo and proper memoization
 * Prevents unnecessary re-renders when other columns update
 */
const OptimizedBoardColumn = memo<OptimizedBoardColumnProps>(
  ({
    status,
    tasks,
    onTaskSelect,
    onAddTask,
    onEditStatus,
    onDeleteStatus,
    canEdit,
    isDragging = false,
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `column-${status.id}`,
      data: { type: 'column', statusId: status.id },
    });

    // Memoize task IDs to prevent unnecessary recalculation
    const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

    // Memoize color classes to avoid repeated string operations
    const colorClasses = useMemo(() => {
      const colors = {
        gray: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      };
      return colors[status.color as keyof typeof colors] || colors.gray;
    }, [status.color]);

    const headerColorClasses = useMemo(() => {
      const colors = {
        gray: 'text-gray-700 dark:text-gray-300',
        blue: 'text-blue-700 dark:text-blue-300',
        yellow: 'text-yellow-700 dark:text-yellow-300',
        green: 'text-green-700 dark:text-green-300',
      };
      return colors[status.color as keyof typeof colors] || colors.gray;
    }, [status.color]);

    // Only create handlers if they're actually used
    const handleAddTask = useCallback(() => {
      if (canEdit) {
        onAddTask(status.id);
      }
    }, [canEdit, onAddTask, status.id]);

    const handleEditStatus = useCallback(() => {
      if (canEdit && onEditStatus) {
        onEditStatus(status);
      }
    }, [canEdit, onEditStatus, status]);

    const handleDeleteStatus = useCallback(() => {
      if (canEdit && onDeleteStatus) {
        onDeleteStatus(status.id);
      }
    }, [canEdit, onDeleteStatus, status.id]);

    // Memoize dropdown menu to prevent re-creation
    const dropdownMenu = useMemo(() => {
      if (!canEdit) return null;

      return (
        <div className="relative group">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Column options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
            <button
              onClick={handleEditStatus}
              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit2 className="w-4 h-4" />
              Edit Status
            </button>
            <button
              onClick={handleDeleteStatus}
              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Delete Status
            </button>
          </div>
        </div>
      );
    }, [canEdit, handleEditStatus, handleDeleteStatus]);

    return (
      <div
        ref={setNodeRef}
        className={`
          flex flex-col h-full min-w-[320px] max-w-[360px] rounded-lg border-2 transition-all
          ${colorClasses}
          ${isOver ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-1">
            <h3 className={`font-semibold ${headerColorClasses}`}>{status.name}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddTask}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={`Add task to ${status.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              {dropdownMenu}
            </div>
          )}
        </div>

        {/* Tasks Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-sm">No tasks yet</p>
                {canEdit && (
                  <button
                    onClick={handleAddTask}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Add a task
                  </button>
                )}
              </div>
            ) : (
              tasks.map((task) => (
                <BoardTaskCard key={task.id} task={task} onClick={() => onTaskSelect(task)} />
              ))
            )}
          </SortableContext>
        </div>

        {/* Column Footer - Task count summary */}
        {tasks.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
              {tasks.some((t) => t.priority === 'critical') && (
                <span className="text-red-500">
                  {tasks.filter((t) => t.priority === 'critical').length} critical
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
  // Custom comparison function for memo
  (prevProps, nextProps) => {
    // Re-render only if these specific props change
    return (
      prevProps.status.id === nextProps.status.id &&
      prevProps.status.name === nextProps.status.name &&
      prevProps.status.color === nextProps.status.color &&
      prevProps.tasks.length === nextProps.tasks.length &&
      prevProps.canEdit === nextProps.canEdit &&
      prevProps.isDragging === nextProps.isDragging &&
      // Deep compare tasks only if length is same
      prevProps.tasks.every((task, index) => {
        const nextTask = nextProps.tasks[index];
        return (
          task.id === nextTask.id &&
          task.title === nextTask.title &&
          task.priority === nextTask.priority &&
          task.assignee_name === nextTask.assignee_name
        );
      })
    );
  }
);

OptimizedBoardColumn.displayName = 'OptimizedBoardColumn';

export default OptimizedBoardColumn;
