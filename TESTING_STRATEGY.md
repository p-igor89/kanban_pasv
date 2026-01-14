# Comprehensive Testing Strategy for KanbanPro

This document outlines a complete testing strategy for modernizing the Next.js Kanban board application with a focus on accessibility, E2E, unit, integration, and performance testing.

## Table of Contents

1. [Testing Pyramid Overview](#testing-pyramid-overview)
2. [Accessibility Testing](#accessibility-testing)
3. [E2E Testing for Critical User Flows](#e2e-testing-for-critical-user-flows)
4. [Unit Testing](#unit-testing)
5. [Integration Testing for API Routes](#integration-testing-for-api-routes)
6. [Performance Testing](#performance-testing)
7. [Test Coverage Goals](#test-coverage-goals)
8. [CI/CD Integration](#cicd-integration)

## Testing Pyramid Overview

```
                    /\
                   /  \
                  / E2E \              5% - Critical user journeys
                 /______\
                /        \
               / API Tests \           15% - Route handlers, integrations
              /____________\
             /              \
            /  Unit Tests    \        80% - Components, hooks, utils
           /__________________\
```

## Accessibility Testing

### Tools
- **jest-axe**: Automated accessibility testing in Jest
- **@axe-core/playwright**: Accessibility testing in E2E tests
- **WCAG 2.1 Level AA** compliance target

### Implementation Strategy

#### 1. Component-Level Accessibility Tests

Test all interactive components for:
- Keyboard navigation
- ARIA labels and roles
- Color contrast ratios
- Focus management
- Screen reader compatibility

**Example: Board Column Accessibility Test**
```typescript
// src/components/board/__tests__/BoardColumn.accessibility.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import BoardColumn from '../BoardColumn';

expect.extend(toHaveNoViolations);

describe('BoardColumn Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <BoardColumn
        status={mockStatus}
        tasks={mockTasks}
        onAddTask={jest.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', () => {
    const { getByRole } = render(<BoardColumn {...props} />);
    const addButton = getByRole('button', { name: /add task/i });

    addButton.focus();
    expect(addButton).toHaveFocus();
  });

  it('should have proper ARIA labels', () => {
    const { getByRole } = render(<BoardColumn {...props} />);

    expect(getByRole('region')).toHaveAttribute('aria-label');
    expect(getByRole('list')).toHaveAttribute('aria-label', 'Tasks');
  });

  it('should announce drag operations to screen readers', () => {
    const { getByRole } = render(<BoardColumn {...props} />);
    const draggableItem = getByRole('button', { name: /task-1/i });

    expect(draggableItem).toHaveAttribute('aria-grabbed', 'false');
  });
});
```

#### 2. Form Accessibility Tests

**Example: Task Creation Modal**
```typescript
// src/components/modals/__tests__/CreateTaskModal.accessibility.test.tsx
describe('CreateTaskModal Accessibility', () => {
  it('should trap focus within modal', async () => {
    const { getByRole, getByLabelText } = render(<CreateTaskModal isOpen />);

    const modal = getByRole('dialog');
    const firstInput = getByLabelText(/title/i);
    const closeButton = getByRole('button', { name: /close/i });

    firstInput.focus();
    userEvent.tab();
    // Focus should cycle within modal
    expect(document.activeElement).toBeInTheDocument();
  });

  it('should announce form errors to screen readers', async () => {
    const { getByRole, getByLabelText } = render(<CreateTaskModal isOpen />);

    const submitButton = getByRole('button', { name: /create/i });
    const titleInput = getByLabelText(/title/i);

    await userEvent.click(submitButton);

    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAccessibleDescription(/required/i);
  });

  it('should have proper heading hierarchy', () => {
    const { getByRole } = render(<CreateTaskModal isOpen />);

    const heading = getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/create task/i);
  });
});
```

#### 3. Drag-and-Drop Accessibility

**Example: Keyboard-Accessible Drag-and-Drop**
```typescript
// src/components/board/__tests__/TaskCard.accessibility.test.tsx
describe('TaskCard Drag-and-Drop Accessibility', () => {
  it('should support keyboard-based reordering', async () => {
    const { getByRole } = render(<Board />);

    const task = getByRole('button', { name: /task title/i });
    task.focus();

    // Space to grab
    await userEvent.keyboard(' ');
    expect(task).toHaveAttribute('aria-grabbed', 'true');

    // Arrow keys to move
    await userEvent.keyboard('{ArrowDown}');

    // Space to drop
    await userEvent.keyboard(' ');
    expect(task).toHaveAttribute('aria-grabbed', 'false');
  });

  it('should announce drag state changes', () => {
    const { getByRole } = render(<TaskCard {...props} />);

    const task = getByRole('button');
    expect(task).toHaveAttribute('aria-describedby');

    const liveRegion = document.querySelector('[role="status"]');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
```

### E2E Accessibility Tests

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('board page should have no accessibility violations', async ({ page }) => {
    await page.goto('/boards/test-board');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard-only navigation', async ({ page }) => {
    await page.goto('/boards/test-board');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Should be able to activate focused element
    await page.keyboard.press('Enter');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/boards/test-board');

    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

## E2E Testing for Critical User Flows

### Critical Flows to Test

1. **Authentication Flow**
   - Login with email/password
   - OAuth (Google/GitHub)
   - Logout
   - Registration

2. **Board Management**
   - Create board
   - View board list
   - Edit board details
   - Delete board

3. **Task Management**
   - Create task
   - Edit task
   - Delete task
   - Drag-and-drop between columns
   - Filter and search tasks

4. **Real-time Collaboration**
   - Multiple users viewing same board
   - Real-time updates

### Implementation Examples

#### 1. Complete Task CRUD Flow

```typescript
// e2e/task-crud.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to test board
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/boards');

    // Create or select test board
    await page.goto('/boards/test-board-id');
  });

  test('should create a task with all fields', async ({ page }) => {
    // Open create task modal
    await page.getByRole('button', { name: /add task/i }).first().click();

    // Fill in task details
    await page.getByLabel(/title/i).fill('Test Task Title');
    await page.getByLabel(/description/i).fill('Task description here');

    // Select priority
    await page.getByLabel(/priority/i).selectOption('high');

    // Add tags
    await page.getByLabel(/tags/i).fill('frontend, testing');

    // Set due date
    await page.getByLabel(/due date/i).fill('2026-12-31');

    // Assign to user
    await page.getByLabel(/assignee/i).fill('John Doe');

    // Submit
    await page.getByRole('button', { name: /create task/i }).click();

    // Verify task appears in board
    await expect(page.getByText('Test Task Title')).toBeVisible();
    await expect(page.getByText(/high/i)).toBeVisible();
  });

  test('should edit task details', async ({ page }) => {
    // Click on existing task
    await page.getByText('Test Task Title').click();

    // Edit in drawer
    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByLabel(/title/i).clear();
    await page.getByLabel(/title/i).fill('Updated Task Title');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify update
    await expect(page.getByText('Updated Task Title')).toBeVisible();
    await expect(page.getByText('Test Task Title')).not.toBeVisible();
  });

  test('should delete task with confirmation', async ({ page }) => {
    await page.getByText('Updated Task Title').click();
    await page.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify task is removed
    await expect(page.getByText('Updated Task Title')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /add task/i }).first().click();

    // Try to submit without title
    await page.getByRole('button', { name: /create task/i }).click();

    // Should show validation error
    await expect(page.getByText(/title is required/i)).toBeVisible();

    // Should not close modal
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
```

#### 2. Drag-and-Drop Flow

```typescript
// e2e/drag-and-drop.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Drag-and-Drop Operations', () => {
  test('should move task between columns', async ({ page }) => {
    await page.goto('/boards/test-board-id');

    const task = page.getByTestId('task-1');
    const sourceColumn = page.getByTestId('column-todo');
    const targetColumn = page.getByTestId('column-in-progress');

    // Verify initial position
    await expect(sourceColumn.locator(`[data-testid="task-1"]`)).toBeVisible();

    // Perform drag and drop
    await task.dragTo(targetColumn);

    // Verify task moved
    await expect(targetColumn.locator(`[data-testid="task-1"]`)).toBeVisible();
    await expect(sourceColumn.locator(`[data-testid="task-1"]`)).not.toBeVisible();

    // Verify status updated
    await task.click();
    await expect(page.getByText(/in progress/i)).toBeVisible();
  });

  test('should reorder tasks within same column', async ({ page }) => {
    await page.goto('/boards/test-board-id');

    const task1 = page.getByTestId('task-1');
    const task2 = page.getByTestId('task-2');
    const column = page.getByTestId('column-todo');

    // Get initial order
    const initialTasks = await column.locator('[data-testid^="task-"]').allTextContents();

    // Drag task-2 above task-1
    await task2.dragTo(task1);

    // Verify order changed
    const newTasks = await column.locator('[data-testid^="task-"]').allTextContents();
    expect(newTasks[0]).toBe(initialTasks[1]);
    expect(newTasks[1]).toBe(initialTasks[0]);
  });

  test('should handle drag cancellation', async ({ page }) => {
    await page.goto('/boards/test-board-id');

    const task = page.getByTestId('task-1');
    const sourceColumn = page.getByTestId('column-todo');

    // Start drag
    await task.hover();
    await page.mouse.down();

    // Move mouse away
    await page.mouse.move(0, 0);

    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.mouse.up();

    // Verify task stayed in original position
    await expect(sourceColumn.locator(`[data-testid="task-1"]`)).toBeVisible();
  });
});
```

#### 3. Real-time Collaboration Flow

```typescript
// e2e/realtime-collaboration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Real-time Collaboration', () => {
  test('should update board when another user makes changes', async ({ browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both users
    await Promise.all([
      loginUser(page1, 'user1@example.com', 'password'),
      loginUser(page2, 'user2@example.com', 'password'),
    ]);

    // Navigate to same board
    await Promise.all([
      page1.goto('/boards/shared-board-id'),
      page2.goto('/boards/shared-board-id'),
    ]);

    // User 1 creates a task
    await page1.getByRole('button', { name: /add task/i }).first().click();
    await page1.getByLabel(/title/i).fill('Realtime Test Task');
    await page1.getByRole('button', { name: /create/i }).click();

    // User 2 should see the new task
    await expect(page2.getByText('Realtime Test Task')).toBeVisible({ timeout: 5000 });

    // User 2 updates the task
    await page2.getByText('Realtime Test Task').click();
    await page2.getByRole('button', { name: /edit/i }).click();
    await page2.getByLabel(/title/i).clear();
    await page2.getByLabel(/title/i).fill('Updated by User 2');
    await page2.getByRole('button', { name: /save/i }).click();

    // User 1 should see the update
    await expect(page1.getByText('Updated by User 2')).toBeVisible({ timeout: 5000 });

    await context1.close();
    await context2.close();
  });
});

async function loginUser(page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/boards');
}
```

## Unit Testing

### Component Testing Strategy

#### 1. Presentational Components

Focus on:
- Rendering with different props
- User interactions
- Conditional rendering
- Edge cases

**Example: TaskCard Component**

```typescript
// src/components/board/__tests__/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from '../TaskCard';

describe('TaskCard Component', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Description',
    priority: 'high' as const,
    tags: ['frontend', 'urgent'],
    assignee_name: 'John Doe',
    assignee_color: '#ff0000',
    due_date: '2026-12-31',
    order: 0,
  };

  it('should render task with all details', () => {
    render(<TaskCard task={mockTask} onClick={jest.fn()} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText(/description/i)).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    await userEvent.click(screen.getByRole('article'));

    expect(handleClick).toHaveBeenCalledWith(mockTask.id);
  });

  it('should display overdue indicator for past due dates', () => {
    const overdueTask = {
      ...mockTask,
      due_date: '2020-01-01',
    };

    render(<TaskCard task={overdueTask} onClick={jest.fn()} />);

    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalTask = {
      id: 'task-2',
      title: 'Minimal Task',
      order: 0,
    };

    render(<TaskCard task={minimalTask} onClick={jest.fn()} />);

    expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    expect(screen.queryByText(/priority/i)).not.toBeInTheDocument();
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'A'.repeat(500);
    const taskWithLongDesc = {
      ...mockTask,
      description: longDescription,
    };

    const { container } = render(<TaskCard task={taskWithLongDesc} onClick={jest.fn()} />);

    const descElement = container.querySelector('.task-description');
    expect(descElement).toHaveClass('line-clamp-2');
  });
});
```

#### 2. Custom Hooks Testing

**Example: useDebounce Hook**

```typescript
// src/hooks/__tests__/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));

    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: 'first' },
      }
    );

    rerender({ value: 'second' });
    act(() => jest.advanceTimersByTime(250));

    rerender({ value: 'third' });
    act(() => jest.advanceTimersByTime(250));

    // Should still be initial value
    expect(result.current).toBe('first');

    // After full delay from last change
    act(() => jest.advanceTimersByTime(250));

    expect(result.current).toBe('third');
  });
});
```

#### 3. Utility Functions Testing

**Example: Task Utilities**

```typescript
// src/lib/__tests__/taskUtils.test.ts
import {
  sortTasksByPriority,
  filterTasksByStatus,
  isTaskOverdue,
  calculateTaskCompletionRate,
} from '../taskUtils';

describe('Task Utilities', () => {
  describe('sortTasksByPriority', () => {
    it('should sort tasks by priority (critical > high > medium > low)', () => {
      const tasks = [
        { id: '1', priority: 'low' },
        { id: '2', priority: 'critical' },
        { id: '3', priority: 'medium' },
        { id: '4', priority: 'high' },
      ];

      const sorted = sortTasksByPriority(tasks);

      expect(sorted[0].id).toBe('2'); // critical
      expect(sorted[1].id).toBe('4'); // high
      expect(sorted[2].id).toBe('3'); // medium
      expect(sorted[3].id).toBe('1'); // low
    });

    it('should handle tasks without priority', () => {
      const tasks = [
        { id: '1', priority: 'high' },
        { id: '2', priority: null },
        { id: '3', priority: 'low' },
      ];

      const sorted = sortTasksByPriority(tasks);

      expect(sorted[sorted.length - 1].id).toBe('2'); // null priority goes last
    });
  });

  describe('isTaskOverdue', () => {
    it('should return true for past due dates', () => {
      const task = { due_date: '2020-01-01' };

      expect(isTaskOverdue(task)).toBe(true);
    });

    it('should return false for future due dates', () => {
      const task = { due_date: '2030-12-31' };

      expect(isTaskOverdue(task)).toBe(false);
    });

    it('should return false for tasks without due date', () => {
      const task = { due_date: null };

      expect(isTaskOverdue(task)).toBe(false);
    });
  });

  describe('calculateTaskCompletionRate', () => {
    it('should calculate completion percentage', () => {
      const tasks = [
        { status: 'done' },
        { status: 'done' },
        { status: 'todo' },
        { status: 'in-progress' },
      ];

      const rate = calculateTaskCompletionRate(tasks);

      expect(rate).toBe(50); // 2 out of 4 = 50%
    });

    it('should return 0 for empty task list', () => {
      expect(calculateTaskCompletionRate([])).toBe(0);
    });

    it('should return 100 for all completed tasks', () => {
      const tasks = [
        { status: 'done' },
        { status: 'done' },
      ];

      expect(calculateTaskCompletionRate(tasks)).toBe(100);
    });
  });
});
```

### State Management Testing

**Example: Board State Management**

```typescript
// src/hooks/__tests__/useBoardState.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBoardState } from '../useBoardState';

// Mock API calls
jest.mock('@/lib/api/tasks', () => ({
  fetchTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

import * as api from '@/lib/api/tasks';

describe('useBoardState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks on mount', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'done' },
    ];

    (api.fetchTasks as jest.Mock).mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useBoardState('board-1'));

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
    });

    expect(api.fetchTasks).toHaveBeenCalledWith('board-1');
  });

  it('should add task optimistically', async () => {
    const newTask = { id: '3', title: 'New Task', status: 'todo' };
    (api.createTask as jest.Mock).mockResolvedValue(newTask);

    const { result } = renderHook(() => useBoardState('board-1'));

    act(() => {
      result.current.addTask({ title: 'New Task', status: 'todo' });
    });

    // Should add immediately (optimistic)
    expect(result.current.tasks).toContainEqual(
      expect.objectContaining({ title: 'New Task' })
    );

    // Should call API
    await waitFor(() => {
      expect(api.createTask).toHaveBeenCalled();
    });
  });

  it('should rollback on API error', async () => {
    const error = new Error('API Error');
    (api.createTask as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useBoardState('board-1'));

    const initialTaskCount = result.current.tasks.length;

    act(() => {
      result.current.addTask({ title: 'Failed Task', status: 'todo' });
    });

    // Should rollback after error
    await waitFor(() => {
      expect(result.current.tasks.length).toBe(initialTaskCount);
    });

    expect(result.current.error).toBe(error.message);
  });

  it('should handle task deletion', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ];

    (api.fetchTasks as jest.Mock).mockResolvedValue(mockTasks);
    (api.deleteTask as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useBoardState('board-1'));

    await waitFor(() => {
      expect(result.current.tasks.length).toBe(2);
    });

    act(() => {
      result.current.deleteTask('1');
    });

    // Should remove immediately
    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].id).toBe('2');

    await waitFor(() => {
      expect(api.deleteTask).toHaveBeenCalledWith('1');
    });
  });
});
```

## Integration Testing for API Routes

### Testing Strategy for Next.js API Routes

#### Setup Test Utilities

```typescript
// src/lib/test-utils/api-test-helpers.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';

export function createMockNextRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
  } = options;

  return new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function extractResponseData(response: NextResponse) {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}
```

#### API Route Tests

**Example: Tasks API Tests**

```typescript
// src/app/api/boards/[boardId]/tasks/__tests__/route.test.ts
import { GET, POST } from '../route';
import { createMockNextRequest, extractResponseData } from '@/lib/test-utils/api-test-helpers';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Tasks API Routes', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/boards/[boardId]/tasks', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/boards/board-1/tasks',
      });

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      const { status, data } = await extractResponseData(response);

      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return tasks for authenticated user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockTasks = [
        { id: 'task-1', title: 'Task 1', status: 'todo' },
        { id: 'task-2', title: 'Task 2', status: 'in-progress' },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock board ownership check
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      // Mock tasks fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTasks,
        error: null,
      });

      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/boards/board-1/tasks',
      });

      const response = await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      const { status, data } = await extractResponseData(response);

      expect(status).toBe(200);
      expect(data.tasks).toEqual(mockTasks);
    });

    it('should filter tasks by status', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/boards/board-1/tasks?status_id=status-1',
      });

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('status_id', 'status-1');
    });

    it('should search tasks by title and description', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      const request = createMockNextRequest({
        url: 'http://localhost:3000/api/boards/board-1/tasks?search=urgent',
      });

      await GET(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });
  });

  describe('POST /api/boards/[boardId]/tasks', () => {
    it('should create task with valid data', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status_id: 'status-1',
        priority: 'high',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock board ownership
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      // Mock status verification
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'status-1', board_id: 'board-1' },
        error: null,
      });

      // Mock max order fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { order: 5 },
        error: null,
      });

      // Mock insert
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'new-task', ...taskData, order: 6 },
        error: null,
      });

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/boards/board-1/tasks',
        body: taskData,
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      const { status, data } = await extractResponseData(response);

      expect(status).toBe(201);
      expect(data.task).toMatchObject(taskData);
    });

    it('should return 400 for missing title', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/boards/board-1/tasks',
        body: { status_id: 'status-1' }, // Missing title
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      const { status, data } = await extractResponseData(response);

      expect(status).toBe(400);
      expect(data.error).toContain('Title');
    });

    it('should validate priority values', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/boards/board-1/tasks',
        body: {
          title: 'Test',
          status_id: 'status-1',
          priority: 'invalid',
        },
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      const { status, data } = await extractResponseData(response);

      expect(status).toBe(400);
      expect(data.error).toContain('Priority');
    });

    it('should limit tags to 10 items', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'board-1', user_id: 'user-1' },
        error: null,
      });

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/boards/board-1/tasks',
        body: {
          title: 'Test',
          status_id: 'status-1',
          tags: Array(11).fill('tag'),
        },
      });

      const response = await POST(request, {
        params: Promise.resolve({ boardId: 'board-1' }),
      });

      const { status, data } = await extractResponseData(response);

      expect(status).toBe(400);
      expect(data.error).toContain('Tags');
    });
  });
});
```

## Performance Testing

### Drag-and-Drop Performance Tests

```typescript
// src/components/board/__tests__/Board.performance.test.tsx
import { render, screen } from '@testing-library/react';
import { performance } from 'perf_hooks';
import Board from '../Board';

describe('Board Performance Tests', () => {
  it('should render 100 tasks within acceptable time', () => {
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: 'todo',
      order: i,
    }));

    const startTime = performance.now();

    render(<Board tasks={tasks} statuses={mockStatuses} />);

    const renderTime = performance.now() - startTime;

    // Should render within 500ms
    expect(renderTime).toBeLessThan(500);
  });

  it('should handle drag operations efficiently', async () => {
    const { rerender } = render(<Board tasks={largeTasks} statuses={mockStatuses} />);

    const startTime = performance.now();

    // Simulate drag start
    rerender(<Board tasks={largeTasks} statuses={mockStatuses} draggingTaskId="task-1" />);

    const dragStartTime = performance.now() - startTime;

    // Drag start should be instant
    expect(dragStartTime).toBeLessThan(50);
  });

  it('should use virtualization for large task lists', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: 'todo',
      order: i,
    }));

    const { container } = render(<Board tasks={tasks} statuses={mockStatuses} />);

    // Should only render visible tasks (not all 1000)
    const renderedTasks = container.querySelectorAll('[data-testid^="task-"]');
    expect(renderedTasks.length).toBeLessThan(100);
  });
});
```

### E2E Performance Tests

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load board within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="board-column"]');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle drag-and-drop smoothly', async ({ page }) => {
    await page.goto('/boards/test-board');

    const task = page.getByTestId('task-1');
    const targetColumn = page.getByTestId('column-in-progress');

    // Measure drag performance
    const startTime = Date.now();
    await task.dragTo(targetColumn);
    const dragTime = Date.now() - startTime;

    // Drag should complete within 1 second
    expect(dragTime).toBeLessThan(1000);

    // UI should update immediately
    await expect(targetColumn.locator('[data-testid="task-1"]')).toBeVisible({
      timeout: 100,
    });
  });

  test('should maintain 60fps during drag operations', async ({ page }) => {
    await page.goto('/boards/test-board');

    // Start performance monitoring
    await page.evaluate(() => {
      (window as any).frameRates = [];
      let lastTime = performance.now();

      function measureFPS() {
        const currentTime = performance.now();
        const fps = 1000 / (currentTime - lastTime);
        (window as any).frameRates.push(fps);
        lastTime = currentTime;
        requestAnimationFrame(measureFPS);
      }

      requestAnimationFrame(measureFPS);
    });

    // Perform drag operation
    const task = page.getByTestId('task-1');
    const targetColumn = page.getByTestId('column-done');
    await task.dragTo(targetColumn);

    // Check frame rates
    const frameRates = await page.evaluate(() => (window as any).frameRates);
    const avgFPS = frameRates.reduce((a: number, b: number) => a + b, 0) / frameRates.length;

    // Should maintain near 60fps
    expect(avgFPS).toBeGreaterThan(50);
  });

  test('should load images efficiently with lazy loading', async ({ page }) => {
    await page.goto('/boards/test-board');

    // Count initially loaded images
    const initialImages = await page.evaluate(() => {
      return document.querySelectorAll('img').length;
    });

    // Scroll down to load more
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(500);

    const afterScrollImages = await page.evaluate(() => {
      return document.querySelectorAll('img').length;
    });

    // More images should load after scroll
    expect(afterScrollImages).toBeGreaterThan(initialImages);
  });

  test('should bundle size be under 500KB for main chunk', async ({ page }) => {
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('_next/static'))
        .map((entry: any) => ({
          name: entry.name,
          size: entry.transferSize,
        }));
    });

    const mainChunk = performanceEntries.find((entry: any) =>
      entry.name.includes('main') && entry.name.endsWith('.js')
    );

    if (mainChunk) {
      expect(mainChunk.size).toBeLessThan(500 * 1024); // 500KB
    }
  });
});
```

## Test Coverage Goals

### Current Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 60,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

### Recommended Improvements

```javascript
// jest.config.js - Updated thresholds
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Per-directory thresholds
  './src/lib/': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
  },
  './src/hooks/': {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  './src/components/': {
    branches: 70,
    functions: 75,
    lines: 75,
    statements: 75,
  },
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
          fail_ci_if_error: true

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run accessibility tests
        run: npx playwright test e2e/accessibility.spec.ts

      - name: Upload accessibility report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: playwright-report/
          retention-days: 30

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/boards
          uploadArtifacts: true
```

## Best Practices Summary

### Testing Best Practices

1. **Follow the Testing Pyramid**
   - 70% unit tests
   - 20% integration tests
   - 10% E2E tests

2. **Write Maintainable Tests**
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Avoid test interdependencies
   - Use test utilities and helpers

3. **Mock External Dependencies**
   - Mock API calls
   - Mock Supabase client
   - Mock browser APIs when needed

4. **Test User Behavior, Not Implementation**
   - Use React Testing Library queries (getByRole, getByLabelText)
   - Test from user perspective
   - Avoid testing internal state

5. **Accessibility First**
   - Include accessibility tests for all components
   - Test keyboard navigation
   - Ensure WCAG 2.1 AA compliance

6. **Performance Monitoring**
   - Set performance budgets
   - Monitor bundle sizes
   - Test with realistic data volumes

7. **Continuous Integration**
   - Run tests on every PR
   - Block merges on test failures
   - Monitor coverage trends

## Next Steps

1. Install required dependencies (jest-axe, @axe-core/playwright) ✓
2. Update jest.setup.ts to configure jest-axe
3. Create accessibility test files for existing components
4. Add E2E tests for critical flows (task CRUD, drag-and-drop)
5. Create API route integration tests
6. Add performance tests for drag-and-drop operations
7. Update CI/CD pipeline with new test suites
8. Gradually increase coverage thresholds
9. Document testing patterns for team

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Performance](https://web.dev/performance/)
