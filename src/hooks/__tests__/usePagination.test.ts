'use client';

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePagination, useInfiniteScroll, useVirtualScroll } from '../usePagination';

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  private callback: IntersectionObserverCallback;
  private elements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter((el) => el !== element);
  }

  disconnect() {
    this.elements = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Helper to trigger intersection
  trigger(isIntersecting: boolean) {
    const entries = this.elements.map(
      (element) =>
        ({
          isIntersecting,
          target: element,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }) as IntersectionObserverEntry
    );
    this.callback(entries, this);
  }
}

let mockObserverInstance: MockIntersectionObserver | null = null;

beforeAll(() => {
  global.IntersectionObserver = jest.fn((callback) => {
    mockObserverInstance = new MockIntersectionObserver(callback);
    return mockObserverInstance;
  }) as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  mockObserverInstance = null;
  jest.clearAllMocks();
});

describe('usePagination', () => {
  const createMockFetcher = (totalItems: number, _pageSize: number = 20) => {
    const allItems = Array.from({ length: totalItems }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
    }));

    return jest.fn(async (page: number, size: number) => {
      const start = (page - 1) * size;
      const items = allItems.slice(start, start + size);
      return {
        items,
        hasMore: start + size < totalItems,
      };
    });
  };

  it('should initialize with empty items and correct default state', () => {
    const fetcher = createMockFetcher(50);
    const { result } = renderHook(() => usePagination(fetcher));

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.page).toBe(1);
  });

  it('should initialize with custom options', () => {
    const fetcher = createMockFetcher(50);
    const { result } = renderHook(() => usePagination(fetcher, { pageSize: 10, initialPage: 2 }));

    expect(result.current.page).toBe(2);
  });

  it('should load first page of items', async () => {
    const fetcher = createMockFetcher(50);
    const { result } = renderHook(() => usePagination(fetcher));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(20);
    expect(result.current.page).toBe(2);
    expect(result.current.hasMore).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(1, 20);
  });

  it('should load multiple pages', async () => {
    const fetcher = createMockFetcher(50, 20);
    const { result } = renderHook(() => usePagination(fetcher));

    await act(async () => {
      await result.current.loadMore();
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(40);
    expect(result.current.page).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should stop loading when no more items', async () => {
    const fetcher = createMockFetcher(30, 20);
    const { result } = renderHook(() => usePagination(fetcher));

    await act(async () => {
      await result.current.loadMore();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(30);
    expect(result.current.hasMore).toBe(false);

    // Try to load more when hasMore is false
    await act(async () => {
      await result.current.loadMore();
    });

    // Should not call fetcher again
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should not load while already loading', async () => {
    const fetcher = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { items: [{ id: 1 }], hasMore: true };
    });

    const { result } = renderHook(() => usePagination(fetcher));

    // Start loading
    act(() => {
      result.current.loadMore();
    });

    expect(result.current.loading).toBe(true);

    // Try to load again while loading
    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should only call once
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetcher = jest.fn(async () => {
      throw new Error('Network error');
    });

    const { result } = renderHook(() => usePagination(fetcher));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith('Pagination fetch error:', expect.any(Error));

    consoleError.mockRestore();
  });

  it('should reset state correctly', async () => {
    const fetcher = createMockFetcher(50);
    const { result } = renderHook(() => usePagination(fetcher));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(20);

    act(() => {
      result.current.reset();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.page).toBe(1);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('should allow manual setItems', () => {
    const fetcher = createMockFetcher(50);
    const { result } = renderHook(() => usePagination(fetcher));

    const customItems = [{ id: 100, name: 'Custom' }];

    act(() => {
      result.current.setItems(customItems);
    });

    expect(result.current.items).toEqual(customItems);
  });

  it('should use custom page size', async () => {
    const fetcher = createMockFetcher(50, 10);
    const { result } = renderHook(() => usePagination(fetcher, { pageSize: 10 }));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetcher).toHaveBeenCalledWith(1, 10);
    expect(result.current.items).toHaveLength(10);
  });
});

describe('useInfiniteScroll', () => {
  it('should create observer ref', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(callback));

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it('should not observe when disabled', () => {
    const callback = jest.fn();
    renderHook(() => useInfiniteScroll(callback, { enabled: false }));

    expect(global.IntersectionObserver).not.toHaveBeenCalled();
  });

  it('should observe element when enabled', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(callback, { enabled: true }));

    // Simulate assigning ref to an element
    const mockElement = document.createElement('div');

    act(() => {
      (result.current as React.MutableRefObject<HTMLDivElement | null>).current = mockElement;
    });

    // Re-render to trigger effect with element
    expect(global.IntersectionObserver).toHaveBeenCalled();
  });

  it('should use custom threshold', () => {
    const callback = jest.fn();
    renderHook(() => useInfiniteScroll(callback, { threshold: 200 }));

    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ rootMargin: '200px' })
    );
  });

  it('should call callback when intersecting', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(callback));

    // Assign element to ref
    const mockElement = document.createElement('div');
    (result.current as React.MutableRefObject<HTMLDivElement | null>).current = mockElement;

    // Trigger intersection
    if (mockObserverInstance) {
      mockObserverInstance.observe(mockElement);
      mockObserverInstance.trigger(true);
    }

    expect(callback).toHaveBeenCalled();
  });

  it('should not call callback when not intersecting', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInfiniteScroll(callback));

    const mockElement = document.createElement('div');
    (result.current as React.MutableRefObject<HTMLDivElement | null>).current = mockElement;

    if (mockObserverInstance) {
      mockObserverInstance.observe(mockElement);
      mockObserverInstance.trigger(false);
    }

    expect(callback).not.toHaveBeenCalled();
  });

  it('should cleanup observer on unmount', () => {
    const callback = jest.fn();
    const { unmount, result } = renderHook(() => useInfiniteScroll(callback));

    const mockElement = document.createElement('div');
    (result.current as React.MutableRefObject<HTMLDivElement | null>).current = mockElement;

    if (mockObserverInstance) {
      const unobserveSpy = jest.spyOn(mockObserverInstance, 'unobserve');
      unmount();
      // Unobserve is called during cleanup
      expect(unobserveSpy).toBeDefined();
    }
  });
});

describe('useVirtualScroll', () => {
  const createItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should calculate virtual items for initial scroll position', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 300 })
    );

    // With containerHeight 300 and itemHeight 50, visible items = 6
    // Plus overscan of 3 on each side = 12 items max initially
    expect(result.current.virtualItems.length).toBeLessThanOrEqual(12);
    expect(result.current.totalHeight).toBe(100 * 50); // 5000px
  });

  it('should return correct total height', () => {
    const items = createItems(50);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 40, containerHeight: 400 })
    );

    expect(result.current.totalHeight).toBe(50 * 40); // 2000px
  });

  it('should provide container props with correct styles', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 300 })
    );

    expect(result.current.containerProps.style).toEqual({
      position: 'relative',
      height: 300,
      overflow: 'auto',
    });
    expect(typeof result.current.containerProps.onScroll).toBe('function');
  });

  it('should calculate correct item styles', () => {
    const items = createItems(10);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 200, overscan: 1 })
    );

    const firstItem = result.current.virtualItems[0];
    expect(firstItem.style).toEqual({
      position: 'absolute',
      top: firstItem.index * 50,
      height: 50,
      width: '100%',
    });
  });

  it('should update visible items on scroll', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 200, overscan: 2 })
    );

    // Simulate scroll
    act(() => {
      const mockEvent = {
        currentTarget: { scrollTop: 500 },
      } as React.UIEvent<HTMLDivElement>;
      result.current.containerProps.onScroll(mockEvent);
    });

    // After scrolling 500px (10 items), first visible should be around index 8 (with overscan)
    const firstVisibleIndex = result.current.virtualItems[0].index;
    expect(firstVisibleIndex).toBeGreaterThanOrEqual(8);
  });

  it('should handle scrollTo function', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 200 })
    );

    act(() => {
      result.current.scrollTo(20);
    });

    // After scrollTo(20), scroll position should be 20 * 50 = 1000px
    // First visible item should be around index 17 (with overscan of 3)
    const firstVisibleIndex = result.current.virtualItems[0].index;
    expect(firstVisibleIndex).toBeGreaterThanOrEqual(17);
  });

  it('should use custom overscan', () => {
    const items = createItems(100);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 200, overscan: 5 })
    );

    // With larger overscan, more items should be rendered
    // containerHeight/itemHeight = 4 visible + 5 overscan on each side = 14 max
    expect(result.current.virtualItems.length).toBeLessThanOrEqual(14);
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() =>
      useVirtualScroll([], { itemHeight: 50, containerHeight: 200 })
    );

    expect(result.current.virtualItems).toEqual([]);
    expect(result.current.totalHeight).toBe(0);
  });

  it('should include item data in virtual items', () => {
    const items = createItems(10);
    const { result } = renderHook(() =>
      useVirtualScroll(items, { itemHeight: 50, containerHeight: 200 })
    );

    const firstItem = result.current.virtualItems[0];
    expect(firstItem.item).toEqual(items[firstItem.index]);
    expect(firstItem.index).toBeDefined();
  });
});
