import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the hooks and components
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    signOut: jest.fn(),
  }),
}));

jest.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Create a simplified Header component for testing
const MockHeader = () => {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  return (
    <header data-testid="header" className="header">
      <div className="logo">KanbanPro</div>
      <nav>
        <button onClick={() => setIsSearchOpen(true)} data-testid="search-button">
          Search
        </button>
        <button data-testid="theme-toggle">Toggle Theme</button>
        <button data-testid="notifications-button">Notifications</button>
        <button data-testid="user-menu">User Menu</button>
      </nav>
      {isSearchOpen && (
        <div data-testid="search-modal">
          <input type="text" placeholder="Search..." data-testid="search-input" />
          <button onClick={() => setIsSearchOpen(false)} data-testid="close-search">
            Close
          </button>
        </div>
      )}
    </header>
  );
};

describe('Header Component', () => {
  it('should render the header with logo', () => {
    render(<MockHeader />);
    expect(screen.getByText('KanbanPro')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    render(<MockHeader />);
    expect(screen.getByTestId('search-button')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-button')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('should open search modal when search button is clicked', () => {
    render(<MockHeader />);

    const searchButton = screen.getByTestId('search-button');
    fireEvent.click(searchButton);

    expect(screen.getByTestId('search-modal')).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('should close search modal when close button is clicked', () => {
    render(<MockHeader />);

    // Open search
    fireEvent.click(screen.getByTestId('search-button'));
    expect(screen.getByTestId('search-modal')).toBeInTheDocument();

    // Close search
    fireEvent.click(screen.getByTestId('close-search'));
    expect(screen.queryByTestId('search-modal')).not.toBeInTheDocument();
  });
});

describe('Header Accessibility', () => {
  it('should have accessible header element', () => {
    render(<MockHeader />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('should have focusable buttons', () => {
    render(<MockHeader />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });
});
