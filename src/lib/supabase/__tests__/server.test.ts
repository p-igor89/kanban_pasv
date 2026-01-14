// Mock next/headers
const mockCookieStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue(mockCookieStore),
}));

// Mock createServerClient
const mockCreateServerClient = jest.fn().mockReturnValue({
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
  from: jest.fn(),
});

jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

// Set environment variables
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
import { createClient } from '../server';

describe('Supabase Server Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a server client with correct URL and key', async () => {
    const client = await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
    expect(client).toBeDefined();
  });

  it('should return the supabase client instance', async () => {
    const client = await createClient();

    expect(client).toHaveProperty('auth');
    expect(client).toHaveProperty('from');
  });

  describe('Cookie handling', () => {
    it('should provide getAll function using cookieStore', async () => {
      mockCookieStore.getAll.mockReturnValue([{ name: 'test', value: 'value' }]);

      await createClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
      const cookies = cookiesConfig.getAll();

      expect(cookies).toEqual([{ name: 'test', value: 'value' }]);
    });

    it('should provide setAll function that sets cookies', async () => {
      await createClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
      const cookiesToSet = [{ name: 'session', value: 'token', options: { path: '/' } }];

      cookiesConfig.setAll(cookiesToSet);

      expect(mockCookieStore.set).toHaveBeenCalledWith('session', 'token', { path: '/' });
    });

    it('should handle setAll errors silently (Server Component case)', async () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component');
      });

      await createClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
      const cookiesToSet = [{ name: 'session', value: 'token', options: {} }];

      // Should not throw
      expect(() => cookiesConfig.setAll(cookiesToSet)).not.toThrow();
    });
  });
});
