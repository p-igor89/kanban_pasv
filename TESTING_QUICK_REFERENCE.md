# Testing Quick Reference Guide

Quick reference for running tests and understanding the testing strategy for KanbanPro.

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest src/components/__tests__/Board.test.tsx

# Run tests matching pattern
npx jest --testPathPattern="taskUtils"

# Run tests for changed files only
npm run test -- --onlyChanged
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/task-flow.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

### Accessibility Tests

```bash
# Run accessibility E2E tests
npx playwright test e2e/accessibility-axe.spec.ts

# Run with detailed report
npx playwright test e2e/accessibility-axe.spec.ts --reporter=html
```

### Performance Tests

```bash
# Run performance tests
npx playwright test e2e/drag-drop-performance.spec.ts

# Run with performance tracing
npx playwright test --trace on
```

## Test File Structure

```
kanban_pasv/
├── src/
│   ├── components/
│   │   └── __tests__/           # Component unit tests
│   ├── hooks/
│   │   └── __tests__/           # Custom hooks tests
│   ├── lib/
│   │   └── __tests__/           # Utility function tests
│   └── app/
│       └── api/
│           └── __tests__/       # API route integration tests
└── e2e/
    ├── task-flow.spec.ts        # Task CRUD flows
    ├── accessibility-axe.spec.ts # Accessibility tests
    ├── drag-drop-performance.spec.ts # Performance tests
    └── ...
```

## Writing Tests - Patterns

### Unit Test Pattern (Jest + RTL)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Component from '../Component';

describe('Component Name', () => {
  it('should render with props', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('value')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Component onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Accessibility Test Pattern (jest-axe)

```typescript
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import Component from '../Component';

describe('Component Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Component />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### E2E Test Pattern (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ page }) => {
    await page.goto('/path');

    // Interact with page
    await page.getByRole('button', { name: /click me/i }).click();

    // Assert outcome
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### API Integration Test Pattern

```typescript
import { GET, POST } from '../route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

describe('API Route', () => {
  it('should return data for authenticated user', async () => {
    const mockSupabase = setupMockSupabase();

    const request = new NextRequest('http://localhost:3000/api/endpoint');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

## Common Testing Scenarios

### Testing Forms

```typescript
// Fill and submit form
await page.getByLabel(/email/i).fill('test@example.com');
await page.getByLabel(/password/i).fill('password123');
await page.getByRole('button', { name: /submit/i }).click();

// Check for validation errors
await expect(page.getByText(/required/i)).toBeVisible();
```

### Testing Drag-and-Drop

```typescript
// Playwright
const task = page.getByTestId('task-1');
const targetColumn = page.getByTestId('column-done');
await task.dragTo(targetColumn);

// Jest (mock)
const handleDragEnd = jest.fn();
render(<Board onDragEnd={handleDragEnd} />);
// Simulate drag via dnd-kit events
```

### Testing Real-time Updates

```typescript
// Create two browser contexts
const context1 = await browser.newContext();
const context2 = await browser.newContext();

const page1 = await context1.newPage();
const page2 = await context2.newPage();

// User 1 makes change
await page1.getByRole('button', { name: /add/i }).click();

// User 2 sees update
await expect(page2.getByText('New Item')).toBeVisible({ timeout: 5000 });
```

### Testing Modals/Dialogs

```typescript
// Open modal
await page.getByRole('button', { name: /create/i }).click();

// Modal should be visible
await expect(page.getByRole('dialog')).toBeVisible();

// Interact with modal
await page.getByLabel(/title/i).fill('Test');
await page.getByRole('button', { name: /save/i }).click();

// Modal should close
await expect(page.getByRole('dialog')).not.toBeVisible();
```

### Testing Dark Mode

```typescript
// Click theme toggle
await page.getByRole('button', { name: /theme/i }).click();

// Check HTML class changed
const html = page.locator('html');
await expect(html).toHaveClass(/dark/);

// Or set programmatically
await page.emulateMedia({ colorScheme: 'dark' });
```

## Debugging Tests

### Jest Debugging

```bash
# Run specific test with more info
npx jest --verbose ComponentName

# Show console logs
npx jest --silent=false

# Update snapshots
npx jest -u

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging

```bash
# Run with debug mode
npx playwright test --debug

# Run with UI mode (recommended)
npx playwright test --ui

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip

# Take screenshot on failure
npx playwright test --screenshot=only-on-failure
```

### Common Issues

**Issue: Test timeout**
```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  // your test code
});
```

**Issue: Element not found**
```typescript
// Use better locators
// Bad
page.locator('.some-class')

// Good
page.getByRole('button', { name: /submit/i })
page.getByLabel(/email/i)
page.getByTestId('unique-id')
```

**Issue: Flaky tests**
```typescript
// Wait for conditions instead of arbitrary timeouts
// Bad
await page.waitForTimeout(3000);

// Good
await page.waitForSelector('[data-testid="loaded"]');
await expect(page.getByText('Done')).toBeVisible();
```

## Best Practices

### DO

- Write tests from user perspective
- Use semantic queries (getByRole, getByLabel)
- Test behavior, not implementation
- Mock external dependencies
- Keep tests isolated and independent
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### DON'T

- Test internal state or implementation details
- Use arbitrary wait times
- Share state between tests
- Skip tests without good reason
- Write tests that depend on other tests
- Use brittle CSS selectors

## Coverage Thresholds

Current requirements:
- Branches: 60%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Goal:
- Branches: 80%
- Functions: 85%
- Lines: 85%
- Statements: 85%

## CI/CD Integration

Tests run automatically on:
- Push to main/develop
- Pull requests
- Pre-commit hooks (lint + type-check)

View results:
- GitHub Actions tab
- Codecov for coverage reports
- Playwright HTML report artifacts

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe GitHub](https://github.com/nickcolley/jest-axe)
- [Axe-core Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Getting Help

1. Check test output and error messages
2. Review relevant documentation
3. Look at existing similar tests
4. Use `--debug` or `--ui` mode to inspect
5. Check CI logs for failures on remote
6. Consult TESTING_STRATEGY.md for comprehensive guide
