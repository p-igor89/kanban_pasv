import { test, expect } from '@playwright/test';

test.describe('Board Detail Page (Unauthenticated)', () => {
  test('should redirect to login when accessing a board', async ({ page }) => {
    await page.goto('/boards/test-board-id');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Board Detail Page Elements', () => {
  test.skip('should show board header with back button', async ({ page }) => {
    // Requires authentication and existing board
    await page.goto('/boards/[boardId]');

    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add column/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new task/i })).toBeVisible();
  });

  test.skip('should show kanban columns', async ({ page }) => {
    // Default columns: Backlog, Todo, In Progress, Done
    await page.goto('/boards/[boardId]');

    await expect(page.getByText('Backlog')).toBeVisible();
    await expect(page.getByText('Todo')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test.skip('should show add column button at the end', async ({ page }) => {
    await page.goto('/boards/[boardId]');

    const addColumnButton = page.getByRole('button', { name: /add column/i }).last();
    await expect(addColumnButton).toBeVisible();
  });
});

test.describe('Create Task Modal', () => {
  test.skip('should show task creation form', async ({ page }) => {
    await page.goto('/boards/[boardId]');
    await page.getByRole('button', { name: /new task/i }).click();

    await expect(page.getByRole('heading', { name: /create.*task/i })).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/status/i)).toBeVisible();
    await expect(page.getByLabel(/priority/i)).toBeVisible();
  });

  test.skip('should validate required title', async ({ page }) => {
    await page.goto('/boards/[boardId]');
    await page.getByRole('button', { name: /new task/i }).click();

    const createButton = page.getByRole('button', { name: /create task/i });
    await expect(createButton).toBeDisabled();

    await page.getByLabel(/title/i).fill('My Task');
    await expect(createButton).not.toBeDisabled();
  });
});

test.describe('Task Card Interactions', () => {
  test.skip('should open task drawer on click', async ({ page }) => {
    // Requires existing task
    await page.goto('/boards/[boardId]');

    const taskCard = page.locator('[data-testid="task-card"]').first();
    await taskCard.click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test.skip('should show task details in drawer', async ({ page }) => {
    await page.goto('/boards/[boardId]');

    const taskCard = page.locator('[data-testid="task-card"]').first();
    await taskCard.click();

    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByText(/priority/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
  });
});

test.describe('Status/Column Management', () => {
  test.skip('should show status modal when adding column', async ({ page }) => {
    await page.goto('/boards/[boardId]');
    await page
      .getByRole('button', { name: /add column/i })
      .first()
      .click();

    await expect(page.getByRole('heading', { name: /column/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/color/i)).toBeVisible();
  });

  test.skip('should edit column on menu click', async ({ page }) => {
    await page.goto('/boards/[boardId]');

    // Open column menu
    const columnHeader = page.locator('[data-testid="column-header"]').first();
    await columnHeader.getByRole('button', { name: /settings/i }).click();

    await expect(page.getByRole('heading', { name: /edit.*column/i })).toBeVisible();
  });
});

test.describe('Drag and Drop', () => {
  test.skip('should allow dragging task between columns', async ({ page }) => {
    // This requires a visual/interaction test
    // Playwright supports drag and drop with dragTo
    await page.goto('/boards/[boardId]');

    const taskCard = page.locator('[data-testid="task-card"]').first();
    const targetColumn = page.locator('[data-testid="column"]').nth(1);

    await taskCard.dragTo(targetColumn);

    // Verify task moved (would need to check API or UI update)
  });
});

test.describe('Navigation', () => {
  test.skip('should navigate back to boards list', async ({ page }) => {
    await page.goto('/boards/[boardId]');

    await page.getByRole('link', { name: /back/i }).click();

    await expect(page).toHaveURL('/boards');
  });
});
