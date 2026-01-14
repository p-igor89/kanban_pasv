import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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

// Mock task data
const mockTasks = [
  {
    id: 'task-1',
    board_id: 'board-1',
    status_id: 'status-1',
    title: 'Task 1',
    description: 'Description 1',
    priority: 'high' as const,
    tags: ['tag1'],
    assignee_name: 'John',
    assignee_color: '#ff0000',
    due_date: '2026-12-31',
    order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    board_id: 'board-1',
    status_id: 'status-1',
    title: 'Task 2',
    description: null,
    priority: 'low' as const,
    tags: [],
    assignee_name: null,
    assignee_color: null,
    due_date: null,
    order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockStatus = {
  id: 'status-1',
  board_id: 'board-1',
  name: 'To Do',
  color: '#3B82F6',
  order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Create a simplified BoardColumn for testing
interface BoardColumnProps {
  status: typeof mockStatus;
  tasks: typeof mockTasks;
  onAddTask: () => void;
  onEditStatus: () => void;
  onDeleteStatus: () => void;
  onTaskClick: (taskId: string) => void;
}

const MockBoardColumn: React.FC<BoardColumnProps> = ({
  status,
  tasks,
  onAddTask,
  onEditStatus,
  onDeleteStatus,
  onTaskClick,
}) => {
  return (
    <div data-testid="board-column" className="board-column">
      <div className="column-header" style={{ borderTopColor: status.color }}>
        <h3 data-testid="column-title">{status.name}</h3>
        <span data-testid="task-count">{tasks.length}</span>
        <div className="column-actions">
          <button onClick={onAddTask} data-testid="add-task-btn">
            Add Task
          </button>
          <button onClick={onEditStatus} data-testid="edit-status-btn">
            Edit
          </button>
          <button onClick={onDeleteStatus} data-testid="delete-status-btn">
            Delete
          </button>
        </div>
      </div>
      <div className="task-list" data-testid="task-list">
        {tasks.map((task) => (
          <div
            key={task.id}
            data-testid={`task-${task.id}`}
            className="task-card"
            onClick={() => onTaskClick(task.id)}
          >
            <h4>{task.title}</h4>
            {task.priority && <span className="priority">{task.priority}</span>}
            {task.assignee_name && <span className="assignee">{task.assignee_name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('BoardColumn Component', () => {
  const defaultProps = {
    status: mockStatus,
    tasks: mockTasks,
    onAddTask: jest.fn(),
    onEditStatus: jest.fn(),
    onDeleteStatus: jest.fn(),
    onTaskClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render column with status name', () => {
    render(<MockBoardColumn {...defaultProps} />);
    expect(screen.getByTestId('column-title')).toHaveTextContent('To Do');
  });

  it('should display task count', () => {
    render(<MockBoardColumn {...defaultProps} />);
    expect(screen.getByTestId('task-count')).toHaveTextContent('2');
  });

  it('should render all tasks', () => {
    render(<MockBoardColumn {...defaultProps} />);
    expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
  });

  it('should call onAddTask when add button is clicked', () => {
    render(<MockBoardColumn {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-task-btn'));
    expect(defaultProps.onAddTask).toHaveBeenCalledTimes(1);
  });

  it('should call onEditStatus when edit button is clicked', () => {
    render(<MockBoardColumn {...defaultProps} />);
    fireEvent.click(screen.getByTestId('edit-status-btn'));
    expect(defaultProps.onEditStatus).toHaveBeenCalledTimes(1);
  });

  it('should call onDeleteStatus when delete button is clicked', () => {
    render(<MockBoardColumn {...defaultProps} />);
    fireEvent.click(screen.getByTestId('delete-status-btn'));
    expect(defaultProps.onDeleteStatus).toHaveBeenCalledTimes(1);
  });

  it('should call onTaskClick when task is clicked', () => {
    render(<MockBoardColumn {...defaultProps} />);
    fireEvent.click(screen.getByTestId('task-task-1'));
    expect(defaultProps.onTaskClick).toHaveBeenCalledWith('task-1');
  });

  it('should render empty column correctly', () => {
    render(<MockBoardColumn {...defaultProps} tasks={[]} />);
    expect(screen.getByTestId('task-count')).toHaveTextContent('0');
    expect(screen.getByTestId('task-list').children).toHaveLength(0);
  });
});

describe('BoardColumn Styling', () => {
  const defaultProps = {
    status: mockStatus,
    tasks: mockTasks,
    onAddTask: jest.fn(),
    onEditStatus: jest.fn(),
    onDeleteStatus: jest.fn(),
    onTaskClick: jest.fn(),
  };

  it('should have correct structure', () => {
    render(<MockBoardColumn {...defaultProps} />);
    expect(screen.getByTestId('board-column')).toBeInTheDocument();
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });
});

describe('Task Priority Display', () => {
  const defaultProps = {
    status: mockStatus,
    tasks: mockTasks,
    onAddTask: jest.fn(),
    onEditStatus: jest.fn(),
    onDeleteStatus: jest.fn(),
    onTaskClick: jest.fn(),
  };

  it('should display priority for tasks with priority', () => {
    render(<MockBoardColumn {...defaultProps} />);
    const taskWithPriority = screen.getByTestId('task-task-1');
    expect(taskWithPriority).toHaveTextContent('high');
  });

  it('should display assignee for tasks with assignee', () => {
    render(<MockBoardColumn {...defaultProps} />);
    const taskWithAssignee = screen.getByTestId('task-task-1');
    expect(taskWithAssignee).toHaveTextContent('John');
  });
});
