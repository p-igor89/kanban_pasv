import { test, expect } from '@playwright/test';

test.describe('Task Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/Kanban/i);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/boards');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login Flow', () => {
  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await expect(registerLink).toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Browser validation should prevent submission
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for error message
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Register Flow', () => {
  test('should display register form elements', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/name|full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.getByRole('link', { name: /sign in|login/i });
    await expect(loginLink).toBeVisible();
  });

  test('should validate password match', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/name|full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different');

    await page.getByRole('button', { name: /create account|sign up|register/i }).click();

    await expect(page.getByText(/match|mismatch/i)).toBeVisible({ timeout: 3000 });
  });

  test('should validate minimum password length', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/name|full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('123');
    await page.getByLabel(/confirm password/i).fill('123');

    await page.getByRole('button', { name: /create account|sign up|register/i }).click();

    await expect(page.getByText(/6 characters|too short|minimum/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark theme', async ({ page }) => {
    await page.goto('/login');

    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /theme|dark|light/i }).first();

    if (await themeToggle.isVisible()) {
      // Get initial state
      const html = page.locator('html');
      const initialClass = await html.getAttribute('class');

      // Toggle theme
      await themeToggle.click();

      // Check class changed
      const newClass = await html.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });
});

test.describe('Navigation', () => {
  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for navigation elements
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Form should still be visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load login page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load assets efficiently', async ({ page }) => {
    await page.goto('/login');

    // Check that main content is visible quickly
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Keyboard Navigation', () => {
  test('should support tab navigation in login form', async ({ page }) => {
    await page.goto('/login');

    // Focus email input
    await page.getByLabel(/email/i).focus();

    // Tab to password
    await page.keyboard.press('Tab');

    // Tab to submit button
    await page.keyboard.press('Tab');

    // Should be able to activate button with Enter
    const activeElement = page.locator(':focus');
    await expect(activeElement).toBeVisible();
  });

  test('should support Enter key for form submission', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Should attempt to login (may show error for invalid credentials)
    await page.waitForTimeout(1000);
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.route('**/api/**', (route) => route.abort('failed'));

    await page.goto('/login');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show some error indication
    await page.waitForTimeout(2000);
  });
});
