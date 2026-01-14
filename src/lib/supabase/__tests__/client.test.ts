// Mock createBrowserClient before importing
const mockCreateBrowserClient = jest.fn().mockReturnValue({
  auth: {
    getUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
});

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

// Set environment variables before importing
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Import after mocking
import { createClient } from '../client';

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a browser client with correct URL and key', () => {
    const client = createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );
    expect(client).toBeDefined();
  });

  it('should return the supabase client instance', () => {
    const client = createClient();

    expect(client).toHaveProperty('auth');
    expect(client.auth).toHaveProperty('getUser');
    expect(client.auth).toHaveProperty('signIn');
    expect(client.auth).toHaveProperty('signOut');
  });

  it('should create a new client on each call', () => {
    createClient();
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
  });
});
