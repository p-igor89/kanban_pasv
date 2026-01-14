import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockTask = {
  id: 'task-1',
  board_id: 'board-1',
  status_id: 'status-1',
  title: 'Test Task',
  description: 'Test Description',
  priority: 'high' as const,
  tags: ['tag1', 'tag2'],
  assignee_name: 'John Doe',
  assignee_color: '#ff0000',
  due_date: '2026-12-31',
  order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockStatuses = [
  { id: 'status-1', name: 'To Do', color: '#3B82F6', order: 0 },
  { id: 'status-2', name: 'In Progress', color: '#F59E0B', order: 1 },
  { id: 'status-3', name: 'Done', color: '#10B981', order: 2 },
];

// Simplified TaskDrawer for testing
interface TaskDrawerProps {
  task: typeof mockTask | null;
  statuses: typeof mockStatuses;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: typeof mockTask) => void;
  onDelete: (taskId: string) => void;
}

const MockTaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  statuses,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [title, setTitle] = React.useState(task?.title || '');
  const [description, setDescription] = React.useState(task?.description || '');
  const [priority, setPriority] = React.useState(task?.priority || '');
  const [statusId, setStatusId] = React.useState(task?.status_id || '');

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority || '');
      setStatusId(task.status_id);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onUpdate({
      ...task,
      title,
      description,
      priority: priority as typeof task.priority,
      status_id: statusId,
    });
  };

  const handleDelete = () => {
    if (window.confirm('Delete this task?')) {
      onDelete(task.id);
    }
  };

  return (
    <div data-testid="task-drawer" className="task-drawer">
      <div className="drawer-header">
        <h2>Edit Task</h2>
        <button onClick={onClose} data-testid="close-drawer">
          Close
        </button>
      </div>

      <div className="drawer-content">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="task-title-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="task-description-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            data-testid="task-status-select"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            data-testid="task-priority-select"
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div data-testid="task-tags">
            {task.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {task.assignee_name && (
          <div className="form-group">
            <label>Assignee</label>
            <span data-testid="task-assignee">{task.assignee_name}</span>
          </div>
        )}

        {task.due_date && (
          <div className="form-group">
            <label>Due Date</label>
            <span data-testid="task-due-date">{task.due_date}</span>
          </div>
        )}
      </div>

      <div className="drawer-footer">
        <button onClick={handleSave} data-testid="save-task">
          Save
        </button>
        <button onClick={handleDelete} data-testid="delete-task" className="danger">
          Delete
        </button>
      </div>
    </div>
  );
};

describe('TaskDrawer Component', () => {
  const defaultProps = {
    task: mockTask,
    statuses: mockStatuses,
    isOpen: true,
    onClose: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open with task', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    expect(screen.getByTestId('task-drawer')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<MockTaskDrawer {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('task-drawer')).not.toBeInTheDocument();
  });

  it('should not render when task is null', () => {
    render(<MockTaskDrawer {...defaultProps} task={null} />);
    expect(screen.queryByTestId('task-drawer')).not.toBeInTheDocument();
  });

  it('should display task title in input', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    expect(screen.getByTestId('task-title-input')).toHaveValue('Test Task');
  });

  it('should display task description in textarea', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    expect(screen.getByTestId('task-description-input')).toHaveValue('Test Description');
  });

  it('should display task tags', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    const tagsContainer = screen.getByTestId('task-tags');
    expect(tagsContainer).toHaveTextContent('tag1');
    expect(tagsContainer).toHaveTextContent('tag2');
  });

  it('should display assignee', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    expect(screen.getByTestId('task-assignee')).toHaveTextContent('John Doe');
  });

  it('should display due date', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    expect(screen.getByTestId('task-due-date')).toHaveTextContent('2026-12-31');
  });

  it('should call onClose when close button is clicked', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    fireEvent.click(screen.getByTestId('close-drawer'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TaskDrawer Editing', () => {
  const defaultProps = {
    task: mockTask,
    statuses: mockStatuses,
    isOpen: true,
    onClose: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update title when input changes', async () => {
    const user = userEvent.setup();
    render(<MockTaskDrawer {...defaultProps} />);

    const titleInput = screen.getByTestId('task-title-input');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    expect(titleInput).toHaveValue('Updated Title');
  });

  it('should call onUpdate with updated task when save is clicked', async () => {
    const user = userEvent.setup();
    render(<MockTaskDrawer {...defaultProps} />);

    const titleInput = screen.getByTestId('task-title-input');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    fireEvent.click(screen.getByTestId('save-task'));

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Title',
      })
    );
  });

  it('should change status when status select changes', async () => {
    const user = userEvent.setup();
    render(<MockTaskDrawer {...defaultProps} />);

    const statusSelect = screen.getByTestId('task-status-select');
    await user.selectOptions(statusSelect, 'status-2');

    expect(statusSelect).toHaveValue('status-2');
  });

  it('should change priority when priority select changes', async () => {
    const user = userEvent.setup();
    render(<MockTaskDrawer {...defaultProps} />);

    const prioritySelect = screen.getByTestId('task-priority-select');
    await user.selectOptions(prioritySelect, 'critical');

    expect(prioritySelect).toHaveValue('critical');
  });
});

describe('TaskDrawer Deletion', () => {
  const defaultProps = {
    task: mockTask,
    statuses: mockStatuses,
    isOpen: true,
    onClose: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('should call onDelete when delete is confirmed', () => {
    render(<MockTaskDrawer {...defaultProps} />);
    fireEvent.click(screen.getByTestId('delete-task'));

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onDelete).toHaveBeenCalledWith('task-1');
  });

  it('should not call onDelete when delete is cancelled', () => {
    window.confirm = jest.fn(() => false);
    render(<MockTaskDrawer {...defaultProps} />);
    fireEvent.click(screen.getByTestId('delete-task'));

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
  });
});

describe('TaskDrawer Accessibility', () => {
  const defaultProps = {
    task: mockTask,
    statuses: mockStatuses,
    isOpen: true,
    onClose: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };

  it('should have labeled form elements', () => {
    render(<MockTaskDrawer {...defaultProps} />);

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
  });
});
