'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Trash2 } from 'lucide-react';
import { Task, TaskPriority } from '@/types/board';

interface BoardTaskCardProps {
  task: Task;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  isDragOverlay?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#6366f1',
  low: '#10b981',
};

const tagColors = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDueDateStatus(dateString: string): 'overdue' | 'soon' | 'normal' {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'soon';
  return 'normal';
}

function BoardTaskCard({ task, onDelete, onClick, isDragOverlay }: BoardTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isDragOverlay,
  });

  const priority = task.priority || 'medium';
  const borderColor = priorityColors[priority];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeft: `4px solid ${borderColor}`,
  };

  const dueDateStatus = task.due_date ? getDueDateStatus(task.due_date) : null;
  const visibleTags = task.tags?.slice(0, 2) || [];
  const extraTagsCount = (task.tags?.length || 0) - 2;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(task.id);
  };

  const handleClick = () => {
    if (!isDragging && onClick) onClick(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isDragging && onClick) onClick(task);
    }
    if (e.key === 'Delete' && onDelete) {
      e.preventDefault();
      onDelete(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="draggable task"
      aria-label={`Task: ${task.title}${task.priority ? `, Priority: ${task.priority}` : ''}${task.due_date ? `, Due: ${formatDueDate(task.due_date)}` : ''}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm relative group
        cursor-grab active:cursor-grabbing
        transition-all duration-200 ease-out
        hover:shadow-md hover:scale-[1.02]
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isDragging ? 'shadow-lg ring-2 ring-blue-400 scale-105' : ''}
        ${isDragOverlay ? 'shadow-xl rotate-3' : ''}
      `}
    >
      {/* Delete button */}
      {onDelete && !isDragOverlay && (
        <button
          onClick={handleDelete}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Delete task: ${task.title}`}
          className="absolute top-1 right-1 p-1 rounded-md bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
        </button>
      )}

      <h3 className="font-medium text-sm text-gray-900 dark:text-white pr-6">{task.title}</h3>

      {task.description && (
        <p className="text-xs mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleTags.map((tag, index) => (
            <span
              key={tag}
              className={`text-xs px-1.5 py-0.5 rounded ${tagColors[index % tagColors.length]}`}
            >
              {tag}
            </span>
          ))}
          {extraTagsCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              +{extraTagsCount}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      {(task.due_date || task.assignee_name) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {task.due_date && (
            <div
              className={`flex items-center gap-1 text-xs ${
                dueDateStatus === 'overdue'
                  ? 'text-red-500'
                  : dueDateStatus === 'soon'
                    ? 'text-yellow-600 dark:text-yellow-500'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-label={`Due date: ${formatDueDate(task.due_date)}`}
            >
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span>{formatDueDate(task.due_date)}</span>
            </div>
          )}

          {task.assignee_name && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: task.assignee_color || '#6b7280' }}
              title={task.assignee_name}
              role="img"
              aria-label={`Assigned to ${task.assignee_name}`}
            >
              {getInitials(task.assignee_name)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(BoardTaskCard);
