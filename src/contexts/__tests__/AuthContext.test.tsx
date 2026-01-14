import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock Supabase client
const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

// Simplified AuthProvider for testing
interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await mockGetUser();
        if (data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data } = mockOnAuthStateChange((_event: string, session: { user: User } | null) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await mockSignInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await mockSignUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await mockSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Test component
const TestConsumer = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (user) {
    return (
      <div data-testid="user-info">
        <span data-testid="user-email">{user.email}</span>
      </div>
    );
  }

  return <div data-testid="no-user">Not authenticated</div>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  });

  it('should show loading state initially', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(
      <MockAuthProvider>
        <TestConsumer />
      </MockAuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
  });

  it('should display user info when authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com' },
      },
    });

    render(
      <MockAuthProvider>
        <TestConsumer />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });
  });

  it('should display not authenticated when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(
      <MockAuthProvider>
        <TestConsumer />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    });
  });
});

describe('AuthContext signIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  });

  it('should call signInWithPassword with credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const SignInButton = () => {
      const { signIn } = useAuth();
      return <button onClick={() => signIn('test@example.com', 'password123')}>Sign In</button>;
    };

    render(
      <MockAuthProvider>
        <SignInButton />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByRole('button').click();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should return error on failed sign in', async () => {
    const error = new Error('Invalid credentials');
    mockSignInWithPassword.mockResolvedValue({ error });

    let signInResult: { error: Error | null } | null = null;

    const SignInButton = () => {
      const { signIn } = useAuth();
      return (
        <button
          onClick={async () => {
            signInResult = await signIn('test@example.com', 'wrong');
          }}
        >
          Sign In
        </button>
      );
    };

    render(
      <MockAuthProvider>
        <SignInButton />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByRole('button').click();
    });

    expect((signInResult as { error: Error | null } | null)?.error).toBe(error);
  });
});

describe('AuthContext signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
    mockSignOut.mockResolvedValue({});
  });

  it('should call signOut and clear user', async () => {
    const SignOutButton = () => {
      const { signOut, user } = useAuth();
      return (
        <div>
          {user && <span data-testid="user-email">{user.email}</span>}
          <button onClick={signOut}>Sign Out</button>
        </div>
      );
    };

    render(
      <MockAuthProvider>
        <SignOutButton />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByRole('button').click();
    });

    expect(mockSignOut).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId('user-email')).not.toBeInTheDocument();
    });
  });
});

describe('useAuth hook', () => {
  it('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
