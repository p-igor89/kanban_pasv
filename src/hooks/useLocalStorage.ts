'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for persisting state in localStorage with automatic serialization/deserialization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Initialize state with a function to only run on mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove the item from storage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for caching data with expiration
 */
interface CachedData<T> {
  data: T;
  timestamp: number;
}

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000 // Default 5 minutes
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getCachedData = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = window.localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const parsedCache = JSON.parse(cached) as CachedData<T>;
      const isExpired = Date.now() - parsedCache.timestamp > ttlMs;

      if (isExpired) {
        window.localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return parsedCache.data;
    } catch {
      return null;
    }
  }, [key, ttlMs]);

  const setCachedData = useCallback(
    (newData: T) => {
      if (typeof window === 'undefined') return;

      try {
        const cacheEntry: CachedData<T> = {
          data: newData,
          timestamp: Date.now(),
        };
        window.localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
      } catch (error) {
        console.warn(`Error caching data for key "${key}":`, error);
      }
    },
    [key]
  );

  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(`cache_${key}`);
  }, [key]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData !== null) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    try {
      const result = await fetcher();
      setData(result);
      setCachedData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetcher, getCachedData, setCachedData]);

  const refetch = useCallback(async () => {
    clearCache();
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      setCachedData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetcher, clearCache, setCachedData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, clearCache };
}
