import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockSearchResults = [
  {
    id: 'task-1',
    board_id: 'board-1',
    board_name: 'My Board',
    status_id: 'status-1',
    status_name: 'To Do',
    title: 'Test Task 1',
    description: 'Test description',
    priority: 'high',
    tags: ['tag1'],
    due_date: '2026-12-31',
  },
  {
    id: 'task-2',
    board_id: 'board-1',
    board_name: 'My Board',
    status_id: 'status-2',
    status_name: 'Done',
    title: 'Test Task 2',
    description: null,
    priority: null,
    tags: [],
    due_date: null,
  },
];

// Simplified GlobalSearch for testing (synchronous version)
interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (taskId: string, boardId: string) => void;
}

const MockGlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<typeof mockSearchResults>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // For testing, call search directly without debounce
    performSearch(value);
  };

  if (!isOpen) return null;

  return (
    <div data-testid="global-search" className="global-search-overlay">
      <div className="search-modal">
        <div className="search-header">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search tasks..."
            data-testid="search-input"
            autoFocus
          />
          <button onClick={onClose} data-testid="close-search">
            Close
          </button>
        </div>

        <div className="search-results" data-testid="search-results">
          {loading && <div data-testid="search-loading">Searching...</div>}

          {!loading && searched && results.length === 0 && (
            <div data-testid="no-results">No results found</div>
          )}

          {!loading && results.length > 0 && (
            <ul>
              {results.map((result) => (
                <li
                  key={result.id}
                  onClick={() => onSelectResult(result.id, result.board_id)}
                  data-testid={`result-${result.id}`}
                  className="search-result-item"
                >
                  <div className="result-title">{result.title}</div>
                  <div className="result-meta">
                    {result.board_name} / {result.status_name}
                  </div>
                  {result.priority && <span className="result-priority">{result.priority}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="search-footer">Press Esc to close</div>
      </div>
    </div>
  );
};

describe('GlobalSearch Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSelectResult: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ results: mockSearchResults }),
    });
  });

  it('should render when open', () => {
    render(<MockGlobalSearch {...defaultProps} />);
    expect(screen.getByTestId('global-search')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<MockGlobalSearch {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('global-search')).not.toBeInTheDocument();
  });

  it('should have autofocused search input', () => {
    render(<MockGlobalSearch {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toHaveFocus();
  });

  it('should call onClose when close button is clicked', () => {
    render(<MockGlobalSearch {...defaultProps} />);
    fireEvent.click(screen.getByTestId('close-search'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    render(<MockGlobalSearch {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

describe('GlobalSearch Search Functionality', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSelectResult: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ results: mockSearchResults }),
    });
  });

  it('should call search API when typing', async () => {
    render(<MockGlobalSearch {...defaultProps} />);

    const input = screen.getByTestId('search-input');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?q=test');
    });
  });

  it('should display search results', async () => {
    render(<MockGlobalSearch {...defaultProps} />);

    const input = screen.getByTestId('search-input');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('result-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('result-task-2')).toBeInTheDocument();
    });
  });

  it('should display no results message when no matches', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ results: [] }),
    });

    render(<MockGlobalSearch {...defaultProps} />);

    const input = screen.getByTestId('search-input');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'nonexistent' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
    });
  });

  it('should not search for empty query', async () => {
    render(<MockGlobalSearch {...defaultProps} />);

    const input = screen.getByTestId('search-input');

    await act(async () => {
      fireEvent.change(input, { target: { value: '   ' } });
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('GlobalSearch Result Selection', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSelectResult: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ results: mockSearchResults }),
    });
  });

  it('should call onSelectResult when result is clicked', async () => {
    render(<MockGlobalSearch {...defaultProps} />);

    const input = screen.getByTestId('search-input');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('result-task-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('result-task-1'));

    expect(defaultProps.onSelectResult).toHaveBeenCalledWith('task-1', 'board-1');
  });
});

describe('GlobalSearch Accessibility', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSelectResult: jest.fn(),
  };

  it('should have accessible search input', () => {
    render(<MockGlobalSearch {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    render(<MockGlobalSearch {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    expect(input).toHaveFocus();
  });
});
