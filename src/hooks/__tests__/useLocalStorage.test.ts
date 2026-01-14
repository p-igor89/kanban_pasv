import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalStorage, useCachedData } from '../useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('stored-value'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage<number>('counter', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('should remove value from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('initial');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('should handle object values', () => {
    const initialValue = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue));

    act(() => {
      result.current[1]({ name: 'updated', count: 5 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 5 });
  });

  it('should handle array values', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('test-key', []));

    act(() => {
      result.current[1](['item1', 'item2']);
    });

    expect(result.current[0]).toEqual(['item1', 'item2']);
  });

  it('should handle JSON parse errors gracefully', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid json');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');

    consoleSpy.mockRestore();
  });
});

describe('useCachedData', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch and cache data', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

    const { result } = renderHook(() => useCachedData('test-cache', fetcher, 60000));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: 1, name: 'test' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should use cached data if not expired', async () => {
    const cachedData = {
      data: { id: 1, name: 'cached' },
      timestamp: Date.now(),
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

    const fetcher = jest.fn().mockResolvedValue({ id: 2, name: 'fresh' });

    const { result } = renderHook(() => useCachedData('test-cache', fetcher, 60000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: 1, name: 'cached' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should refetch data when cache is expired', async () => {
    const expiredData = {
      data: { id: 1, name: 'expired' },
      timestamp: Date.now() - 120000, // 2 minutes ago
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(expiredData));

    const fetcher = jest.fn().mockResolvedValue({ id: 2, name: 'fresh' });

    const { result } = renderHook(() => useCachedData('test-cache', fetcher, 60000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: 2, name: 'fresh' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useCachedData('error-test-key', fetcher, 60000));

    // Wait for the async fetch to complete
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(result.current.error).not.toBeNull();
    expect(result.current.data).toBe(null);
  });

  it('should allow manual refetch', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

    const { result } = renderHook(() => useCachedData('test-cache', fetcher, 60000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    fetcher.mockResolvedValueOnce({ id: 2, name: 'refreshed' });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual({ id: 2, name: 'refreshed' });
  });

  it('should clear cache', async () => {
    const cachedData = {
      data: { id: 1, name: 'cached' },
      timestamp: Date.now(),
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

    const fetcher = jest.fn().mockResolvedValue({ id: 2, name: 'fresh' });

    const { result } = renderHook(() => useCachedData('test-cache', fetcher, 60000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearCache();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('cache_test-cache');
  });
});
