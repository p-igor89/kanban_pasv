import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BoardTaskCard from '../BoardTaskCard';
import { Task } from '@/types/board';

// Mock dnd-kit
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn().mockReturnValue(''),
    },
  },
}));

describe('BoardTaskCard', () => {
  // Use a future date to avoid "Overdue" display
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const mockTask: Task = {
    id: 'task-1',
    board_id: 'board-1',
    status_id: 'status-1',
    title: 'Test Task',
    description: 'Test description',
    priority: 'high',
    tags: ['tag1', 'tag2'],
    assignee_name: 'John Doe',
    assignee_color: '#6366f1',
    due_date: futureDateStr,
    order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockOnClick = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render task title', () => {
    render(<BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render task description', () => {
    render(<BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render priority as border color', () => {
    const { container } = render(
      <BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />
    );

    // Priority is shown via left border color, not as text
    const card = container.firstChild as HTMLElement;
    expect(card.style.borderLeft).toContain('rgb(249, 115, 22)'); // high priority color #f97316
  });

  it('should render tags', () => {
    render(<BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('should render assignee initials', () => {
    render(<BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
    expect(screen.getByTitle('John Doe')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    render(<BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByText('Test Task'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should render without optional fields', () => {
    const minimalTask: Task = {
      ...mockTask,
      description: null,
      priority: null,
      tags: [],
      assignee_name: null,
      assignee_color: null,
      due_date: null,
    };

    render(<BoardTaskCard task={minimalTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    // No footer should be rendered without due_date and assignee
    expect(screen.queryByTitle('John Doe')).not.toBeInTheDocument();
  });

  it('should render different priority border colors', () => {
    const priorityColors: Record<string, string> = {
      critical: 'rgb(239, 68, 68)', // #ef4444
      high: 'rgb(249, 115, 22)', // #f97316
      medium: 'rgb(99, 102, 241)', // #6366f1
      low: 'rgb(16, 185, 129)', // #10b981
    };

    Object.entries(priorityColors).forEach(([priority, expectedColor]) => {
      const taskWithPriority: Task = {
        ...mockTask,
        priority: priority as Task['priority'],
      };

      const { container, unmount } = render(
        <BoardTaskCard task={taskWithPriority} onClick={mockOnClick} onDelete={mockOnDelete} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.style.borderLeft).toContain(expectedColor);

      unmount();
    });
  });

  it('should render as drag overlay when isDragOverlay is true', () => {
    render(
      <BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} isDragOverlay />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    // Delete button should not be shown in overlay
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show overdue for past dates', () => {
    const pastTask: Task = {
      ...mockTask,
      due_date: '2020-01-01',
    };

    render(<BoardTaskCard task={pastTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('should show Today for today date', () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTask: Task = {
      ...mockTask,
      due_date: today,
    };

    render(<BoardTaskCard task={todayTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('should show Tomorrow for tomorrow date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTask: Task = {
      ...mockTask,
      due_date: tomorrow.toISOString().split('T')[0],
    };

    render(<BoardTaskCard task={tomorrowTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  });

  it('should show extra tags count when more than 2 tags', () => {
    const taskWithManyTags: Task = {
      ...mockTask,
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
    };

    render(<BoardTaskCard task={taskWithManyTags} onClick={mockOnClick} onDelete={mockOnDelete} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('tag3')).not.toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<BoardTaskCard task={mockTask} onClick={mockOnClick} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('task-1');
    // onClick should not be called when delete is clicked
    expect(mockOnClick).not.toHaveBeenCalled();
  });
});
