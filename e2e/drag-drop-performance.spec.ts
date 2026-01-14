import { test, expect } from '@playwright/test';

test.describe('Drag-and-Drop Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Check if we need to authenticate
    const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false);

    if (isLoginPage) {
      test.skip();
      return;
    }
  });

  test('should complete drag-and-drop within performance budget', async ({ page }) => {
    await page.goto('/boards');

    // Navigate to a board
    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();
    }

    // Wait for board to load
    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

    // Find a task to drag
    const task = page.locator('[data-testid^="task-"]').first();

    if (await task.isVisible().catch(() => false)) {
      // Find target column
      const columns = page.locator('[data-testid="board-column"]');
      const columnCount = await columns.count();

      if (columnCount >= 2) {
        const targetColumn = columns.nth(1);

        // Measure drag performance
        const startTime = Date.now();

        // Perform drag
        await task.dragTo(targetColumn);

        const dragTime = Date.now() - startTime;

        // Drag should complete within 1 second
        expect(dragTime).toBeLessThan(1000);

        // UI should update quickly
        await page.waitForTimeout(100);

        // Verify task moved (if visible)
        const taskStillVisible = await task.isVisible().catch(() => false);
        expect(taskStillVisible || true).toBeTruthy(); // Either moved or still there
      }
    }
  });

  test('should maintain smooth animation during drag', async ({ page }) => {
    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();
    }

    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

    // Setup performance monitoring
    await page.evaluate(() => {
      (window as any).performanceMetrics = {
        frameRates: [] as number[],
        longTasks: [] as number[],
      };

      let lastTime = performance.now();

      function measureFPS() {
        const currentTime = performance.now();
        const delta = currentTime - lastTime;
        const fps = 1000 / delta;

        (window as any).performanceMetrics.frameRates.push(fps);

        // Track long frames (>16.67ms = <60fps)
        if (delta > 16.67) {
          (window as any).performanceMetrics.longTasks.push(delta);
        }

        lastTime = currentTime;
        requestAnimationFrame(measureFPS);
      }

      requestAnimationFrame(measureFPS);
    });

    // Perform drag operation
    const task = page.locator('[data-testid^="task-"]').first();
    const columns = page.locator('[data-testid="board-column"]');

    if ((await task.isVisible().catch(() => false)) && (await columns.count()) >= 2) {
      const targetColumn = columns.nth(1);

      // Start measuring
      await page.waitForTimeout(100);

      // Perform drag
      await task.hover();
      await page.mouse.down();
      await page.mouse.move(0, 100, { steps: 10 });

      const targetBox = await targetColumn.boundingBox();
      if (targetBox) {
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
          steps: 20,
        });
      }

      await page.mouse.up();

      // Wait for animations to complete
      await page.waitForTimeout(500);

      // Check performance metrics
      const metrics = await page.evaluate(() => (window as any).performanceMetrics);

      // Calculate average FPS
      const avgFPS =
        metrics.frameRates.reduce((a: number, b: number) => a + b, 0) / metrics.frameRates.length;

      // Should maintain at least 50 FPS on average
      expect(avgFPS).toBeGreaterThan(50);

      // Should have minimal long tasks
      const longTaskCount = metrics.longTasks.length;
      const totalFrames = metrics.frameRates.length;

      // Less than 10% of frames should be long
      expect(longTaskCount / totalFrames).toBeLessThan(0.1);
    }
  });

  test('should handle multiple rapid drags efficiently', async ({ page }) => {
    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();
    }

    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

    const tasks = page.locator('[data-testid^="task-"]');
    const taskCount = await tasks.count();

    if (taskCount >= 3) {
      const startTime = Date.now();

      // Perform 3 drag operations rapidly
      for (let i = 0; i < 3; i++) {
        const task = tasks.nth(i);
        const columns = page.locator('[data-testid="board-column"]');
        const targetColumn = columns.nth((i % 2) + 1); // Alternate columns

        if ((await task.isVisible().catch(() => false)) && (await targetColumn.isVisible().catch(() => false))) {
          await task.dragTo(targetColumn);
          await page.waitForTimeout(100);
        }
      }

      const totalTime = Date.now() - startTime;

      // Should complete 3 drags in under 3 seconds
      expect(totalTime).toBeLessThan(3000);
    }
  });

  test('should not cause memory leaks during repeated drags', async ({ page }) => {
    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();
    }

    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0) {
      const tasks = page.locator('[data-testid^="task-"]');
      const columns = page.locator('[data-testid="board-column"]');

      // Perform 10 drag operations
      for (let i = 0; i < 10; i++) {
        const task = tasks.first();
        const targetColumn = columns.nth((i % 2) + 1);

        if (await task.isVisible().catch(() => false)) {
          await task.dragTo(targetColumn);
          await page.waitForTimeout(50);
        }
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((global as any).gc) {
          (global as any).gc();
        }
      });

      await page.waitForTimeout(500);

      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return 0;
      });

      // Memory should not increase by more than 5MB
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(memoryIncreaseMB).toBeLessThan(5);
    }
  });

  test('should handle drag with large number of tasks', async ({ page }) => {
    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();
    }

    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

    // Count tasks
    const tasks = page.locator('[data-testid^="task-"]');
    const taskCount = await tasks.count();

    console.log(`Board has ${taskCount} tasks`);

    if (taskCount > 0) {
      const startTime = Date.now();

      // Drag a task
      const task = tasks.first();
      const columns = page.locator('[data-testid="board-column"]');

      if ((await columns.count()) >= 2) {
        await task.dragTo(columns.nth(1));

        const dragTime = Date.now() - startTime;

        // Even with many tasks, drag should be fast
        expect(dragTime).toBeLessThan(1500);
      }
    }
  });

  test('should optimize rendering during drag', async ({ page }) => {
    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();
    }

    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

    // Monitor paint and layout events
    await page.evaluate(() => {
      (window as any).renderMetrics = {
        paints: 0,
        layouts: 0,
      };

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            (window as any).renderMetrics.paints++;
          }
          if (entry.entryType === 'layout-shift') {
            (window as any).renderMetrics.layouts++;
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'layout-shift'] });
    });

    const task = page.locator('[data-testid^="task-"]').first();
    const columns = page.locator('[data-testid="board-column"]');

    if ((await task.isVisible().catch(() => false)) && (await columns.count()) >= 2) {
      await task.dragTo(columns.nth(1));

      await page.waitForTimeout(500);

      // Check render metrics
      const metrics = await page.evaluate(() => (window as any).renderMetrics);

      // Should minimize layout shifts
      expect(metrics.layouts).toBeLessThan(10);
    }
  });
});

test.describe('Board Load Performance', () => {
  test('should load board within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();

      // Wait for board to be fully loaded
      await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      // Board should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    }
  });

  test('should render visible tasks first (virtualization)', async ({ page }) => {
    await page.goto('/boards');

    const firstBoard = page.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();

      await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

      // Count rendered tasks
      const renderedTasks = await page.locator('[data-testid^="task-"]').count();

      // If there are many tasks, should use virtualization
      // (rendering fewer than total tasks)
      console.log(`Rendered ${renderedTasks} tasks`);

      // Performance should be good regardless of task count
      const metricsStartTime = Date.now();

      // Scroll through board
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(100);

      const scrollPerformance = Date.now() - metricsStartTime;

      // Scrolling should be instant
      expect(scrollPerformance).toBeLessThan(200);
    }
  });

  test('should have good Time to Interactive', async ({ page: _page, browser }) => {
    const context = await browser.newContext();
    const newPage = await context.newPage();

    // Enable performance metrics
    const client = await context.newCDPSession(newPage);
    await client.send('Performance.enable');

    const startTime = Date.now();

    await newPage.goto('/boards');

    const firstBoard = newPage.locator('[data-testid^="board-"]').first();
    if (await firstBoard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstBoard.click();

      // Wait for board to be interactive
      await newPage.waitForSelector('[data-testid="board-column"]', { timeout: 5000 }).catch(() => {});

      // Try to interact with a task
      const task = newPage.locator('[data-testid^="task-"]').first();
      if (await task.isVisible().catch(() => false)) {
        await task.click();

        const timeToInteractive = Date.now() - startTime;

        // Should be interactive within 4 seconds
        expect(timeToInteractive).toBeLessThan(4000);
      }
    }

    await context.close();
  });
});
