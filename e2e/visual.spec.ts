import { test, expect } from '@playwright/test';

test.describe('Visual Tests - Login Page', () => {
  test('login page should match snapshot', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Visual Tests - Register Page', () => {
  test('register page should match snapshot', async ({ page }) => {
    await page.goto('/register');

    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('register-page.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Visual Tests - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login page mobile should match snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('register page mobile should match snapshot', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('register-page-mobile.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Visual Tests - Dark Mode', () => {
  test.use({ colorScheme: 'dark' });

  test('login page dark mode should match snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page-dark.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('register page dark mode should match snapshot', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('register-page-dark.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
