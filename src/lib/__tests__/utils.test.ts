/**
 * Utility functions tests
 */

describe('Utility Functions', () => {
  describe('formatDate', () => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    };

    it('should return "just now" for very recent dates', () => {
      const now = new Date();
      expect(formatDate(now.toISOString())).toBe('just now');
    });

    it('should return minutes ago for recent dates', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatDate(fiveMinutesAgo.toISOString())).toBe('5m ago');
    });

    it('should return hours ago for dates within a day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatDate(threeHoursAgo.toISOString())).toBe('3h ago');
    });

    it('should return days ago for dates within a week', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatDate(twoDaysAgo.toISOString())).toBe('2d ago');
    });

    it('should return formatted date for older dates', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const result = formatDate(twoWeeksAgo.toISOString());
      expect(result).not.toContain('ago');
    });
  });

  describe('formatFileSize', () => {
    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });

    it('should format large files correctly', () => {
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });
  });

  describe('truncateText', () => {
    const truncateText = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - 3) + '...';
    };

    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should handle edge cases', () => {
      expect(truncateText('Hi', 2)).toBe('Hi');
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('generateColor', () => {
    const generateColor = (seed: string): string => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 70%, 50%)`;
    };

    it('should generate consistent colors for same input', () => {
      const color1 = generateColor('test');
      const color2 = generateColor('test');
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different inputs', () => {
      const color1 = generateColor('test1');
      const color2 = generateColor('test2');
      expect(color1).not.toBe(color2);
    });

    it('should return valid HSL format', () => {
      const color = generateColor('hello');
      expect(color).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
    });
  });

  describe('validateEmail', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@invalid.com')).toBe(false);
      expect(validateEmail('invalid@.com')).toBe(false);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    const debounce = <T extends (...args: unknown[]) => unknown>(
      fn: T,
      delay: number
    ): ((...args: Parameters<T>) => void) => {
      let timeoutId: NodeJS.Timeout;
      return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      };
    };

    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Priority Utils', () => {
  const priorityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortByPriority = <T extends { priority: string | null }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const priorityA = a.priority
        ? (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4)
        : 4;
      const priorityB = b.priority
        ? (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
        : 4;
      return priorityA - priorityB;
    });
  };

  it('should sort items by priority', () => {
    const items = [
      { id: 1, priority: 'low' },
      { id: 2, priority: 'critical' },
      { id: 3, priority: 'medium' },
      { id: 4, priority: 'high' },
    ];

    const sorted = sortByPriority(items);
    expect(sorted[0].priority).toBe('critical');
    expect(sorted[1].priority).toBe('high');
    expect(sorted[2].priority).toBe('medium');
    expect(sorted[3].priority).toBe('low');
  });

  it('should handle null priorities', () => {
    const items = [
      { id: 1, priority: null },
      { id: 2, priority: 'high' },
      { id: 3, priority: null },
    ];

    const sorted = sortByPriority(items);
    expect(sorted[0].priority).toBe('high');
    expect(sorted[1].priority).toBeNull();
    expect(sorted[2].priority).toBeNull();
  });
});

describe('Task Ordering', () => {
  const reorderTasks = <T extends { id: string; order: number }>(
    tasks: T[],
    sourceIndex: number,
    destinationIndex: number
  ): T[] => {
    const result = [...tasks];
    const [removed] = result.splice(sourceIndex, 1);
    result.splice(destinationIndex, 0, removed);
    return result.map((task, index) => ({ ...task, order: index }));
  };

  it('should reorder tasks correctly', () => {
    const tasks = [
      { id: '1', order: 0, title: 'Task 1' },
      { id: '2', order: 1, title: 'Task 2' },
      { id: '3', order: 2, title: 'Task 3' },
    ];

    const reordered = reorderTasks(tasks, 0, 2);
    expect(reordered[0].id).toBe('2');
    expect(reordered[1].id).toBe('3');
    expect(reordered[2].id).toBe('1');
    expect(reordered[0].order).toBe(0);
    expect(reordered[1].order).toBe(1);
    expect(reordered[2].order).toBe(2);
  });

  it('should handle edge cases', () => {
    const tasks = [{ id: '1', order: 0, title: 'Task 1' }];
    const reordered = reorderTasks(tasks, 0, 0);
    expect(reordered).toHaveLength(1);
    expect(reordered[0].id).toBe('1');
  });
});
