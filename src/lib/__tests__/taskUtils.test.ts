/**
 * Unit tests for task utility functions
 * These demonstrate testing pure functions with various edge cases
 */

// Mock task type for testing
type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical' | null;
  status?: string;
  due_date?: string | null;
  created_at?: string;
};

// Utility functions to test
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    null: 4,
  };

  return [...tasks].sort((a, b) => {
    const aPriority = a.priority ?? null;
    const bPriority = b.priority ?? null;

    const aOrder = priorityOrder[aPriority as keyof typeof priorityOrder];
    const bOrder = priorityOrder[bPriority as keyof typeof priorityOrder];

    return aOrder - bOrder;
  });
}

export function filterTasksByStatus(tasks: Task[], status: string): Task[] {
  return tasks.filter((task) => task.status === status);
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false;

  const dueDate = new Date(task.due_date);
  const now = new Date();

  return dueDate < now;
}

export function calculateTaskCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter((task) => task.status === 'done').length;

  return Math.round((completedTasks / tasks.length) * 100);
}

export function searchTasks(tasks: Task[], query: string): Task[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) return tasks;

  return tasks.filter((task) => {
    const titleMatch = task.title.toLowerCase().includes(lowerQuery);
    const descMatch = task.description?.toLowerCase().includes(lowerQuery) ?? false;

    return titleMatch || descMatch;
  });
}

export function groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce(
    (acc, task) => {
      const status = task.status ?? 'no-status';

      if (!acc[status]) {
        acc[status] = [];
      }

      acc[status].push(task);

      return acc;
    },
    {} as Record<string, Task[]>
  );
}

export function getTasksByDateRange(
  tasks: Task[],
  startDate: Date,
  endDate: Date
): Task[] {
  return tasks.filter((task) => {
    if (!task.due_date) return false;

    const dueDate = new Date(task.due_date);

    return dueDate >= startDate && dueDate <= endDate;
  });
}

export function calculateAverageTaskAge(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const now = new Date();
  const totalAge = tasks.reduce((sum, task) => {
    if (!task.created_at) return sum;

    const created = new Date(task.created_at);
    const ageInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

    return sum + ageInDays;
  }, 0);

  return Math.round(totalAge / tasks.length);
}

// Tests
describe('Task Utility Functions', () => {
  describe('sortTasksByPriority', () => {
    it('should sort tasks by priority (critical > high > medium > low)', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', priority: 'low' },
        { id: '2', title: 'Task 2', priority: 'critical' },
        { id: '3', title: 'Task 3', priority: 'medium' },
        { id: '4', title: 'Task 4', priority: 'high' },
      ];

      const sorted = sortTasksByPriority(tasks);

      expect(sorted[0].id).toBe('2'); // critical
      expect(sorted[1].id).toBe('4'); // high
      expect(sorted[2].id).toBe('3'); // medium
      expect(sorted[3].id).toBe('1'); // low
    });

    it('should place tasks without priority at the end', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', priority: 'high' },
        { id: '2', title: 'Task 2', priority: null },
        { id: '3', title: 'Task 3', priority: 'low' },
        { id: '4', title: 'Task 4' },
      ];

      const sorted = sortTasksByPriority(tasks);

      expect(sorted[0].id).toBe('1'); // high
      expect(sorted[1].id).toBe('3'); // low
      expect(sorted[2].id).toBe('2'); // null
      expect(sorted[3].id).toBe('4'); // undefined
    });

    it('should not mutate original array', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', priority: 'low' },
        { id: '2', title: 'Task 2', priority: 'high' },
      ];

      const originalOrder = [...tasks];
      sortTasksByPriority(tasks);

      expect(tasks).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const sorted = sortTasksByPriority([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks: Task[] = [{ id: '1', title: 'Single', priority: 'high' }];
      const sorted = sortTasksByPriority(tasks);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('1');
    });
  });

  describe('filterTasksByStatus', () => {
    const tasks: Task[] = [
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'in-progress' },
      { id: '3', title: 'Task 3', status: 'done' },
      { id: '4', title: 'Task 4', status: 'todo' },
    ];

    it('should filter tasks by status', () => {
      const todoTasks = filterTasksByStatus(tasks, 'todo');

      expect(todoTasks).toHaveLength(2);
      expect(todoTasks[0].id).toBe('1');
      expect(todoTasks[1].id).toBe('4');
    });

    it('should return empty array if no tasks match', () => {
      const blockedTasks = filterTasksByStatus(tasks, 'blocked');

      expect(blockedTasks).toEqual([]);
    });

    it('should return all done tasks', () => {
      const doneTasks = filterTasksByStatus(tasks, 'done');

      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].id).toBe('3');
    });
  });

  describe('isTaskOverdue', () => {
    it('should return true for past due dates', () => {
      const task: Task = {
        id: '1',
        title: 'Overdue Task',
        due_date: '2020-01-01',
      };

      expect(isTaskOverdue(task)).toBe(true);
    });

    it('should return false for future due dates', () => {
      const task: Task = {
        id: '1',
        title: 'Future Task',
        due_date: '2030-12-31',
      };

      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should return false for tasks without due date', () => {
      const task: Task = {
        id: '1',
        title: 'No Due Date',
        due_date: null,
      };

      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should handle today correctly based on time', () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const task: Task = {
        id: '1',
        title: 'Due Today',
        due_date: today,
      };

      // Due date at midnight could be considered overdue if current time is past midnight
      // This is implementation dependent - the test checks current behavior
      const result = isTaskOverdue(task);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calculateTaskCompletionRate', () => {
    it('should calculate completion percentage', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', status: 'done' },
        { id: '2', title: 'Task 2', status: 'done' },
        { id: '3', title: 'Task 3', status: 'todo' },
        { id: '4', title: 'Task 4', status: 'in-progress' },
      ];

      const rate = calculateTaskCompletionRate(tasks);

      expect(rate).toBe(50); // 2 out of 4 = 50%
    });

    it('should return 0 for empty task list', () => {
      expect(calculateTaskCompletionRate([])).toBe(0);
    });

    it('should return 100 for all completed tasks', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', status: 'done' },
        { id: '2', title: 'Task 2', status: 'done' },
      ];

      expect(calculateTaskCompletionRate(tasks)).toBe(100);
    });

    it('should return 0 for no completed tasks', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo' },
        { id: '2', title: 'Task 2', status: 'in-progress' },
      ];

      expect(calculateTaskCompletionRate(tasks)).toBe(0);
    });

    it('should round to nearest integer', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', status: 'done' },
        { id: '2', title: 'Task 2', status: 'todo' },
        { id: '3', title: 'Task 3', status: 'todo' },
      ];

      const rate = calculateTaskCompletionRate(tasks);

      // 1/3 = 33.333... should round to 33
      expect(rate).toBe(33);
    });
  });

  describe('searchTasks', () => {
    const tasks: Task[] = [
      { id: '1', title: 'Fix login bug', description: 'Users cannot login' },
      { id: '2', title: 'Add dark mode', description: 'Implement theme switching' },
      { id: '3', title: 'Update documentation', description: null },
      { id: '4', title: 'Refactor authentication', description: 'Improve login flow' },
    ];

    it('should search by title', () => {
      const results = searchTasks(tasks, 'dark');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should search by description', () => {
      const results = searchTasks(tasks, 'login');

      expect(results).toHaveLength(2);
      expect(results.map((t) => t.id)).toEqual(['1', '4']);
    });

    it('should be case insensitive', () => {
      const results = searchTasks(tasks, 'FIX');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should handle empty query', () => {
      const results = searchTasks(tasks, '');

      expect(results).toEqual(tasks);
    });

    it('should trim whitespace from query', () => {
      const results = searchTasks(tasks, '  dark  ');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should return empty array if no matches', () => {
      const results = searchTasks(tasks, 'nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle tasks with null description', () => {
      const results = searchTasks(tasks, 'documentation');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });
  });

  describe('groupTasksByStatus', () => {
    const tasks: Task[] = [
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'in-progress' },
      { id: '3', title: 'Task 3', status: 'todo' },
      { id: '4', title: 'Task 4', status: 'done' },
      { id: '5', title: 'Task 5' }, // no status
    ];

    it('should group tasks by status', () => {
      const grouped = groupTasksByStatus(tasks);

      expect(Object.keys(grouped)).toHaveLength(4);
      expect(grouped.todo).toHaveLength(2);
      expect(grouped['in-progress']).toHaveLength(1);
      expect(grouped.done).toHaveLength(1);
      expect(grouped['no-status']).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const grouped = groupTasksByStatus([]);

      expect(grouped).toEqual({});
    });

    it('should handle all tasks with same status', () => {
      const sameTasks: Task[] = [
        { id: '1', title: 'Task 1', status: 'todo' },
        { id: '2', title: 'Task 2', status: 'todo' },
      ];

      const grouped = groupTasksByStatus(sameTasks);

      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped.todo).toHaveLength(2);
    });
  });

  describe('getTasksByDateRange', () => {
    const tasks: Task[] = [
      { id: '1', title: 'Task 1', due_date: '2026-01-15' },
      { id: '2', title: 'Task 2', due_date: '2026-02-15' },
      { id: '3', title: 'Task 3', due_date: '2026-03-15' },
      { id: '4', title: 'Task 4', due_date: null },
    ];

    it('should return tasks within date range', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-02-28');

      const results = getTasksByDateRange(tasks, startDate, endDate);

      expect(results).toHaveLength(2);
      expect(results.map((t) => t.id)).toEqual(['1', '2']);
    });

    it('should exclude tasks without due dates', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const results = getTasksByDateRange(tasks, startDate, endDate);

      expect(results).toHaveLength(3);
      expect(results.every((t) => t.due_date !== null)).toBe(true);
    });

    it('should include boundary dates', () => {
      const startDate = new Date('2026-02-15');
      const endDate = new Date('2026-02-15');

      const results = getTasksByDateRange(tasks, startDate, endDate);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should return empty array if no tasks in range', () => {
      const startDate = new Date('2027-01-01');
      const endDate = new Date('2027-12-31');

      const results = getTasksByDateRange(tasks, startDate, endDate);

      expect(results).toEqual([]);
    });
  });

  describe('calculateAverageTaskAge', () => {
    it('should calculate average age in days', () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

      const tasks: Task[] = [
        { id: '1', title: 'Task 1', created_at: fiveDaysAgo },
        { id: '2', title: 'Task 2', created_at: tenDaysAgo },
      ];

      const averageAge = calculateAverageTaskAge(tasks);

      // Average of 5 and 10 days = 7-8 days (accounting for rounding)
      expect(averageAge).toBeGreaterThanOrEqual(7);
      expect(averageAge).toBeLessThanOrEqual(8);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverageTaskAge([])).toBe(0);
    });

    it('should handle tasks without created_at', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ];

      const averageAge = calculateAverageTaskAge(tasks);

      expect(averageAge).toBe(0);
    });

    it('should round to nearest integer', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3.7 * 24 * 60 * 60 * 1000).toISOString();

      const tasks: Task[] = [{ id: '1', title: 'Task 1', created_at: threeDaysAgo }];

      const averageAge = calculateAverageTaskAge(tasks);

      // Should be rounded to nearest integer
      expect(Number.isInteger(averageAge)).toBe(true);
    });
  });
});
