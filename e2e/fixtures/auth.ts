import { test as base, Page } from '@playwright/test';

// Test user credentials - should be configured in .env.test
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

/**
 * Fixture that provides an authenticated page
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Go to login page
    await page.goto('/login');

    // Fill in credentials
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_USER_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);

    // Submit login form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to boards page
    await page.waitForURL('/boards', { timeout: 10000 });

    // Use the authenticated page
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
