'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface PaginationState {
  page: number;
  hasMore: boolean;
  loading: boolean;
}

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  loadMore: () => Promise<void>;
  reset: () => void;
  setItems: (items: T[]) => void;
}

/**
 * Hook for handling paginated data fetching
 */
export function usePagination<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ items: T[]; hasMore: boolean }>,
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { pageSize = 20, initialPage = 1 } = options;

  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    hasMore: true,
    loading: false,
  });

  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const result = await fetcherRef.current(state.page, pageSize);
      setItems((prev) => [...prev, ...result.items]);
      setState((prev) => ({
        page: prev.page + 1,
        hasMore: result.hasMore,
        loading: false,
      }));
    } catch (error) {
      console.error('Pagination fetch error:', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.loading, state.hasMore, state.page, pageSize]);

  const reset = useCallback(() => {
    setItems([]);
    setState({
      page: initialPage,
      hasMore: true,
      loading: false,
    });
  }, [initialPage]);

  return {
    items,
    loading: state.loading,
    hasMore: state.hasMore,
    page: state.page,
    loadMore,
    reset,
    setItems,
  };
}

/**
 * Hook for infinite scroll detection
 */
export function useInfiniteScroll(
  callback: () => void,
  options: {
    threshold?: number;
    enabled?: boolean;
  } = {}
): React.RefObject<HTMLDivElement | null> {
  const { threshold = 100, enabled = true } = options;
  const observerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          callbackRef.current();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, enabled]);

  return observerRef;
}

/**
 * Hook for virtual scrolling - only renders visible items
 */
export function useVirtualScroll<T>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
): {
  virtualItems: { item: T; index: number; style: React.CSSProperties }[];
  totalHeight: number;
  scrollTo: (index: number) => void;
  containerProps: {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
} {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      item: items[i],
      index: i,
      style: {
        position: 'absolute' as const,
        top: i * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    });
  }

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollTo = useCallback(
    (index: number) => {
      const offset = index * itemHeight;
      if (containerRef.current) {
        containerRef.current.scrollTop = offset;
      }
      setScrollTop(offset);
    },
    [itemHeight]
  );

  return {
    virtualItems,
    totalHeight,
    scrollTo,
    containerProps: {
      onScroll: handleScroll,
      style: {
        position: 'relative',
        height: containerHeight,
        overflow: 'auto',
      },
    },
  };
}
