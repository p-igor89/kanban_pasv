/**
 * Task-related constants for KanbanPro
 *
 * This file consolidates all task-related constants used throughout the application.
 * Use these constants instead of hardcoding values to ensure consistency.
 */

// ============================================
// TASK STATUS
// ============================================

/**
 * Available task statuses
 */
export const TASK_STATUS = {
  BACKLOG: 'Backlog',
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
} as const;

export type TaskStatusKey = keyof typeof TASK_STATUS;
export type TaskStatusValue = (typeof TASK_STATUS)[TaskStatusKey];

// ============================================
// TASK PRIORITY
// ============================================

/**
 * Available task priority levels
 */
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type TaskPriorityKey = keyof typeof TASK_PRIORITY;
export type TaskPriorityValue = (typeof TASK_PRIORITY)[TaskPriorityKey];

// ============================================
// TASK LIMITS
// ============================================

/**
 * Validation limits for task fields
 */
export const TASK_LIMITS = {
  /** Maximum length for task title */
  TITLE_MAX_LENGTH: 200,
  /** Maximum length for task description */
  DESCRIPTION_MAX_LENGTH: 2000,
  /** Maximum number of tags per task */
  MAX_TAGS: 10,
  /** Maximum length for each tag */
  TAG_MAX_LENGTH: 50,
} as const;

export type TaskLimits = typeof TASK_LIMITS;

// ============================================
// COLUMN ORDER
// ============================================

/**
 * Default column display order for the Kanban board
 */
export const COLUMN_ORDER: readonly TaskStatusValue[] = [
  TASK_STATUS.BACKLOG,
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.DONE,
] as const;

// ============================================
// PRIORITY COLORS
// ============================================

/**
 * Hex colors for task priority indicator (used in BoardTaskCard border)
 */
export const PRIORITY_COLORS: Record<TaskPriorityValue, string> = {
  [TASK_PRIORITY.LOW]: '#10b981',
  [TASK_PRIORITY.MEDIUM]: '#6366f1',
  [TASK_PRIORITY.HIGH]: '#f97316',
  [TASK_PRIORITY.CRITICAL]: '#ef4444',
} as const;

/**
 * Tailwind CSS class names for priority badges (used in GlobalSearch)
 */
export const PRIORITY_BADGE_CLASSES: Record<TaskPriorityValue, string> = {
  [TASK_PRIORITY.LOW]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [TASK_PRIORITY.MEDIUM]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [TASK_PRIORITY.HIGH]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  [TASK_PRIORITY.CRITICAL]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const;

// ============================================
// TAG COLORS
// ============================================

/**
 * Tailwind CSS class names for task tags (rotating colors)
 */
export const TAG_COLORS: readonly string[] = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the color for a tag based on its index
 */
export function getTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length];
}

/**
 * Get the hex color for a priority level
 */
export function getPriorityColor(priority: TaskPriorityValue): string {
  return PRIORITY_COLORS[priority];
}

/**
 * Get the badge class for a priority level
 */
export function getPriorityBadgeClass(priority: TaskPriorityValue): string {
  return PRIORITY_BADGE_CLASSES[priority];
}
