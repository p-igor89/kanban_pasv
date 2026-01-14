// Mock dependencies
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn().mockReturnValue({ auth: {} }),
  createServerClient: jest.fn().mockReturnValue({ auth: {} }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ getAll: jest.fn(), set: jest.fn() }),
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

describe('Supabase Index Exports', () => {
  it('should export createClient from client module', async () => {
    const { createClient } = await import('../index');
    expect(createClient).toBeDefined();
    expect(typeof createClient).toBe('function');
  });

  it('should export createServerClient from server module', async () => {
    const { createServerClient } = await import('../index');
    expect(createServerClient).toBeDefined();
    expect(typeof createServerClient).toBe('function');
  });

  it('should export types', async () => {
    // This test verifies that the types export doesn't cause runtime errors
    const indexModule = await import('../index');
    expect(indexModule).toBeDefined();
  });
});
