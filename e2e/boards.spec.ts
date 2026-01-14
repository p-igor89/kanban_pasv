import { test, expect } from '@playwright/test';

test.describe('Boards Page (Unauthenticated)', () => {
  test('should redirect to login when accessing boards', async ({ page }) => {
    await page.goto('/boards');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Boards Page UI Elements', () => {
  // These tests verify the UI structure when logged in
  // Note: Requires a logged in session - use for manual testing or with auth setup

  test.skip('should show boards page header', async ({ page }) => {
    // This would require authentication
    await page.goto('/boards');
    await expect(page.getByRole('heading', { name: 'My Boards' })).toBeVisible();
    await expect(page.getByRole('button', { name: /new board/i })).toBeVisible();
  });
});

test.describe('Create Board Modal', () => {
  test.skip('should show create board modal elements', async ({ page }) => {
    // This would require authentication
    await page.goto('/boards');
    await page.getByRole('button', { name: /new board/i }).click();

    await expect(page.getByRole('heading', { name: 'Create New Board' })).toBeVisible();
    await expect(page.getByLabel(/board name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create board/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test.skip('should close modal on cancel', async ({ page }) => {
    await page.goto('/boards');
    await page.getByRole('button', { name: /new board/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByRole('heading', { name: 'Create New Board' })).not.toBeVisible();
  });

  test.skip('should validate required fields', async ({ page }) => {
    await page.goto('/boards');
    await page.getByRole('button', { name: /new board/i }).click();

    // Try to submit empty form
    const createButton = page.getByRole('button', { name: /create board/i });
    await expect(createButton).toBeDisabled();

    // Fill in name
    await page.getByLabel(/board name/i).fill('Test Board');
    await expect(createButton).not.toBeDisabled();
  });
});

test.describe('Board Card Elements', () => {
  test.skip('should display board information', async ({ page }) => {
    // This requires an existing board
    await page.goto('/boards');

    const boardCard = page.locator('[class*="rounded-xl"]').first();
    await expect(boardCard).toBeVisible();

    // Board should have name, columns count, tasks count
    await expect(boardCard.getByText(/columns/)).toBeVisible();
    await expect(boardCard.getByText(/tasks/)).toBeVisible();
  });
});
