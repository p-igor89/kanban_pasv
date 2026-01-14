// Mock Supabase client for useRealtimeBoard
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    }),
    removeChannel: jest.fn(),
  }),
}));

describe('Hooks Index Exports', () => {
  it('should export useDebounce', async () => {
    const { useDebounce } = await import('../index');
    expect(useDebounce).toBeDefined();
    expect(typeof useDebounce).toBe('function');
  });

  it('should export useDebouncedCallback', async () => {
    const { useDebouncedCallback } = await import('../index');
    expect(useDebouncedCallback).toBeDefined();
    expect(typeof useDebouncedCallback).toBe('function');
  });

  it('should export useThrottledCallback', async () => {
    const { useThrottledCallback } = await import('../index');
    expect(useThrottledCallback).toBeDefined();
    expect(typeof useThrottledCallback).toBe('function');
  });

  it('should export useLocalStorage', async () => {
    const { useLocalStorage } = await import('../index');
    expect(useLocalStorage).toBeDefined();
    expect(typeof useLocalStorage).toBe('function');
  });

  it('should export useCachedData', async () => {
    const { useCachedData } = await import('../index');
    expect(useCachedData).toBeDefined();
    expect(typeof useCachedData).toBe('function');
  });

  it('should export usePagination', async () => {
    const { usePagination } = await import('../index');
    expect(usePagination).toBeDefined();
    expect(typeof usePagination).toBe('function');
  });

  it('should export useInfiniteScroll', async () => {
    const { useInfiniteScroll } = await import('../index');
    expect(useInfiniteScroll).toBeDefined();
    expect(typeof useInfiniteScroll).toBe('function');
  });

  it('should export useVirtualScroll', async () => {
    const { useVirtualScroll } = await import('../index');
    expect(useVirtualScroll).toBeDefined();
    expect(typeof useVirtualScroll).toBe('function');
  });

  it('should export useRealtimeBoard', async () => {
    const { useRealtimeBoard } = await import('../index');
    expect(useRealtimeBoard).toBeDefined();
    expect(typeof useRealtimeBoard).toBe('function');
  });
});
