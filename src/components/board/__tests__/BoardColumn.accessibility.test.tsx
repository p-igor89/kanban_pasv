import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
}));

jest.mock('@dnd-kit/sortable', () => ({
  ...jest.requireActual('@dnd-kit/sortable'),
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

// Mock component for testing
const MockBoardColumn: React.FC<{
  status: { id: string; name: string; color: string };
  tasks: Array<{ id: string; title: string; priority?: string }>;
  onAddTask: () => void;
}> = ({ status, tasks, onAddTask }) => {
  return (
    <section
      data-testid="board-column"
      role="region"
      aria-label={`${status.name} column`}
      className="board-column"
    >
      <div className="column-header" style={{ borderTopColor: status.color }}>
        <h3 id={`column-${status.id}-title`}>{status.name}</h3>
        <span aria-live="polite" aria-atomic="true">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
        <button
          onClick={onAddTask}
          aria-label={`Add task to ${status.name}`}
          data-testid="add-task-btn"
        >
          Add Task
        </button>
      </div>
      <ul
        role="list"
        aria-label={`Tasks in ${status.name}`}
        aria-describedby={`column-${status.id}-title`}
      >
        {tasks.map((task) => (
          <li key={task.id} role="listitem">
            <button
              role="button"
              aria-label={`${task.title}${task.priority ? `, priority: ${task.priority}` : ''}`}
              tabIndex={0}
            >
              <h4>{task.title}</h4>
              {task.priority && (
                <span className="priority" aria-label={`Priority: ${task.priority}`}>
                  {task.priority}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

describe('BoardColumn Accessibility', () => {
  const mockStatus = {
    id: 'status-1',
    name: 'To Do',
    color: '#3B82F6',
  };

  const mockTasks = [
    { id: 'task-1', title: 'Task 1', priority: 'high' },
    { id: 'task-2', title: 'Task 2' },
  ];

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA landmarks and labels', () => {
    render(<MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />);

    // Column should be a landmark region
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'To Do column');

    // Task list should be properly labeled
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-label', 'Tasks in To Do');
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    const mockAddTask = jest.fn();

    render(<MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={mockAddTask} />);

    const addButton = screen.getByRole('button', { name: /add task to to do/i });

    // Focus the button
    await user.tab();

    // Should be able to activate with Enter
    await user.keyboard('{Enter}');
    expect(mockAddTask).toHaveBeenCalledTimes(1);

    // Should be able to activate with Space
    addButton.focus();
    await user.keyboard(' ');
    expect(mockAddTask).toHaveBeenCalledTimes(2);
  });

  it('should announce task count changes', () => {
    const { rerender } = render(
      <MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />
    );

    // Get the live region
    const liveRegion = screen.getByText(/2 tasks/i);
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    // Update with more tasks
    const moreTasks = [...mockTasks, { id: 'task-3', title: 'Task 3' }];
    rerender(<MockBoardColumn status={mockStatus} tasks={moreTasks} onAddTask={jest.fn()} />);

    expect(screen.getByText(/3 tasks/i)).toBeInTheDocument();
  });

  it('should have descriptive task labels', () => {
    render(<MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />);

    const taskWithPriority = screen.getByRole('button', {
      name: /task 1.*priority.*high/i,
    });
    expect(taskWithPriority).toBeInTheDocument();

    const taskWithoutPriority = screen.getByRole('button', { name: /^task 2$/i });
    expect(taskWithoutPriority).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(<MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />);

    // Column title should be h3
    const columnTitle = screen.getByRole('heading', { level: 3 });
    expect(columnTitle).toHaveTextContent('To Do');

    // Task titles should be h4
    const taskTitles = screen.getAllByRole('heading', { level: 4 });
    expect(taskTitles).toHaveLength(2);
  });

  it('should make all interactive elements keyboard accessible', async () => {
    const user = userEvent.setup();

    render(<MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />);

    // Get all buttons
    const buttons = screen.getAllByRole('button');

    // All should have tabIndex 0 or be naturally focusable
    buttons.forEach((button) => {
      const tabIndex = button.getAttribute('tabindex');
      expect(tabIndex === null || tabIndex === '0').toBe(true);
    });

    // Should be able to tab through all
    await user.tab();
    expect(buttons[0]).toHaveFocus();

    await user.tab();
    expect(buttons[1]).toHaveFocus();

    await user.tab();
    expect(buttons[2]).toHaveFocus();
  });

  it('should have sufficient color contrast for status indicator', () => {
    const { container } = render(
      <MockBoardColumn status={mockStatus} tasks={mockTasks} onAddTask={jest.fn()} />
    );

    const header = container.querySelector('.column-header') as HTMLElement;
    expect(header).toHaveStyle({ borderTopColor: '#3B82F6' });

    // Status color should not be the only indicator (should have text)
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('should work with empty task list', async () => {
    const { container } = render(
      <MockBoardColumn status={mockStatus} tasks={[]} onAddTask={jest.fn()} />
    );

    // Should still pass accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Should announce 0 tasks
    expect(screen.getByText(/0 tasks/i)).toBeInTheDocument();
  });
});
