import { test, expect } from '@playwright/test';

test.describe('Accessibility - Login Page', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');

    // Email input should be properly labeled
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Password input should be properly labeled
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have descriptive button text', async ({ page }) => {
    await page.goto('/login');

    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should have proper link to register', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', { name: /sign up/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/login');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/welcome back/i);
  });
});

test.describe('Accessibility - Register Page', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test('should have proper link to login', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('should have proper heading', async ({ page }) => {
    await page.goto('/register');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/create an account/i);
  });
});

test.describe('Accessibility - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login form should be usable on mobile', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register form should be usable on mobile', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });
});
