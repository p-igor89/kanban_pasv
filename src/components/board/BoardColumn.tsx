'use client';

import { memo, useState, useId } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { Status, Task } from '@/types/board';
import BoardTaskCard from './BoardTaskCard';

interface BoardColumnProps {
  status: Status;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask: () => void;
  onEditStatus: () => void;
  onDeleteStatus: () => void;
}

function BoardColumn({
  status,
  tasks,
  onTaskClick,
  onTaskDelete,
  onAddTask,
  onEditStatus,
  onDeleteStatus,
}: BoardColumnProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const headingId = useId();
  const menuId = useId();

  const taskIds = tasks.map((task) => task.id);

  return (
    <section
      role="region"
      aria-labelledby={headingId}
      className={`
        flex flex-col w-[280px] sm:w-72 min-w-[280px] sm:min-w-72 rounded-xl overflow-hidden
        bg-gray-100 dark:bg-gray-800/50
        transition-all duration-200
        snap-center sm:snap-align-none
        ${isOver ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.01]' : ''}
      `}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: status.color }}
      >
        <div className="flex items-center gap-2">
          <h2 id={headingId} className="font-semibold text-white">
            {status.name}
          </h2>
          <span
            className="bg-white/25 text-white text-xs font-medium px-2 py-0.5 rounded-full"
            aria-label={`${tasks.length} tasks`}
          >
            {tasks.length}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-haspopup="menu"
            aria-expanded={showMenu}
            aria-controls={showMenu ? menuId : undefined}
            aria-label={`Column options for ${status.name}`}
          >
            <MoreHorizontal className="h-4 w-4 text-white" aria-hidden="true" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
                aria-hidden="true"
              />
              <div
                id={menuId}
                role="menu"
                aria-label={`${status.name} column options`}
                className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    onEditStatus();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteStatus();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        role="list"
        aria-label={`Tasks in ${status.name}`}
        className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <BoardTaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                onDelete={onTaskDelete}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Add Task Button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>
    </section>
  );
}

export default memo(BoardColumn);
