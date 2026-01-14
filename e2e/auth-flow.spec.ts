import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/boards');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('should show login form elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /sign up/i }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  });

  test('should show register form elements', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should validate email format on login', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: /email/i }).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // The browser should show HTML5 validation
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should validate password match on register', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different123');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show password mismatch error (exact text from register page)
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should redirect unauthenticated user from protected route', async ({ page }) => {
    // Try to access a specific board
    await page.goto('/boards/some-board-id');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
