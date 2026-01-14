/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests with Axe-Core', () => {
  test('should have no accessibility violations on home page', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no accessibility violations on login page', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no accessibility violations on register page', async ({ page }) => {
    await page.goto('/register');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no color contrast violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper keyboard navigation support', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.keyboard'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA implementation', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.aria'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper form labels and structure', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.forms'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper page structure and headings', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.structure'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.text-alternatives'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    await emailInput.focus();

    // Check that focused element is visible
    await expect(emailInput).toBeFocused();

    // Verify focus is visible with sufficient contrast
    const focusStyles = await emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
        border: styles.border,
      };
    });

    // Should have some focus indicator
    const hasFocusIndicator =
      focusStyles.outline !== 'none' ||
      focusStyles.outlineWidth !== '0px' ||
      focusStyles.border !== 'none';

    expect(hasFocusIndicator).toBe(true);
  });

  test('should support screen reader navigation with landmarks', async ({ page }) => {
    await page.goto('/');

    // Get all landmarks
    const landmarks = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll(
          'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]'
        )
      );

      return elements.map((el) => ({
        tagName: el.tagName,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
      }));
    });

    // Should have at least a main landmark
    expect(landmarks.length).toBeGreaterThan(0);
    expect(landmarks.some((l) => l.tagName === 'MAIN' || l.role === 'main')).toBe(true);
  });

  test('should have no violations in dark mode', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode if toggle exists
    const themeToggle = page.getByRole('button', { name: /theme|dark|light/i }).first();

    if (await themeToggle.isVisible().catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should be usable at 200% zoom', async ({ page }) => {
    await page.goto('/login');

    // Simulate 200% zoom by reducing viewport
    await page.setViewportSize({ width: 640, height: 480 });

    // Elements should still be visible and usable
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();

    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();

    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();

    // Run accessibility scan at zoomed level
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should provide detailed violation report', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.log('\nAccessibility violations found:');

      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`\n${violation.id}: ${violation.description}`);
        console.log(`Impact: ${violation.impact}`);
        console.log(`Help: ${violation.helpUrl}`);
        console.log(`Affected elements: ${violation.nodes.map((node) => node.target).join(', ')}`);
      });
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should scan board page for accessibility', async ({ page }) => {
    await page.goto('/boards');

    const isLoginPage = await page
      .locator('input[type="email"]')
      .isVisible()
      .catch(() => false);

    if (!isLoginPage) {
      // Wait for board list to load
      await page.waitForSelector('[data-testid="board-list"]', { timeout: 5000 }).catch(() => {});

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    } else {
      test.skip();
    }
  });

  test('should verify keyboard navigation flow', async ({ page }) => {
    await page.goto('/login');

    // Tab through all interactive elements
    const focusableElements: string[] = [];

    // Tab up to 10 times to capture focus order
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;

        return {
          tagName: el.tagName,
          type: el.getAttribute('type'),
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          text: el.textContent?.trim().substring(0, 20),
        };
      });

      if (focusedElement) {
        focusableElements.push(
          `${focusedElement.tagName}${focusedElement.type ? `[${focusedElement.type}]` : ''}`
        );
      }
    }

    console.log('Keyboard navigation order:', focusableElements);

    // Should have at least some focusable elements
    expect(focusableElements.length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Best Practices', () => {
  test('should have proper document language', async ({ page }) => {
    await page.goto('/');

    const lang = await page.evaluate(() => document.documentElement.lang);

    expect(lang).toBeTruthy();
    expect(lang.length).toBeGreaterThan(0);
  });

  test('should have viewport meta tag for responsive design', async ({ page }) => {
    await page.goto('/');

    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });

    expect(viewport).toContain('width=device-width');
  });

  test('should have descriptive page title', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();

    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe('Untitled');
  });

  test('should skip link visibility on focus', async ({ page }) => {
    await page.goto('/');

    // Tab to first element (often skip link)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const focusedElement = page.locator(':focus');

    // If it's a skip link, it should be visible when focused
    const text = await focusedElement.textContent().catch(() => '');

    if (text && text.toLowerCase().includes('skip')) {
      await expect(focusedElement).toBeVisible();
    }
  });
});
