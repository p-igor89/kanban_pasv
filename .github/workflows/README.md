# CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### 🔄 CI (`ci.yml`)

**Triggers:**

- Pull requests to `main`, `develop`, or `feat/*` branches
- Pushes to `main`, `develop`, or `feat/*` branches

**Jobs:**

1. **Lint and Type Check**
   - Runs ESLint to check code quality
   - Runs TypeScript type checking

2. **Unit Tests**
   - Runs Jest unit tests with coverage
   - Uploads coverage reports to Codecov

3. **Build**
   - Builds the Next.js application
   - Requires lint and unit tests to pass

4. **E2E Tests** (Conditional)
   - Runs Playwright E2E tests
   - Only runs on PRs to `main` branch
   - Requires build to pass
   - Uploads test reports as artifacts

5. **Status Check**
   - Final check to ensure all required jobs passed
   - Used as a branch protection requirement

### ✅ PR Checks (`pr-checks.yml`)

**Triggers:**

- Pull requests (opened, synchronized, reopened)

**Jobs:**

1. **Quick Code Quality Checks**
   - Checks code formatting with Prettier
   - Runs ESLint
   - Checks for merge conflict markers

2. **PR Information**
   - Displays PR statistics
   - Warns if PR is too large (>50 files)

## Setup Requirements

### Required Secrets

Add these secrets in your repository settings (`Settings > Secrets and variables > Actions`):

- `MONGODB_URI` - MongoDB connection string for running tests
- `CODECOV_TOKEN` (Optional) - For uploading coverage reports to Codecov

### Branch Protection

Recommended branch protection rules for `main`:

1. Require status checks to pass:
   - `Lint and Type Check`
   - `Unit Tests`
   - `Build`
   - `All Checks Passed`

2. Require branches to be up to date before merging

3. Require linear history

## Local Testing

Test your changes locally before pushing:

```bash
# Run all checks
npm run validate

# Individual checks
npm run lint
npm run type-check
npm run test
npm run build
npm run test:e2e
```

## Troubleshooting

### E2E Tests Failing

E2E tests may be flaky due to:

- Network timeouts
- Database connection issues
- Race conditions

If E2E tests fail on CI but pass locally:

1. Check the Playwright report artifact
2. Review the test logs
3. Consider increasing timeouts in `playwright.config.ts`

### Build Failing

Common issues:

- Missing environment variables
- TypeScript errors
- Dependency conflicts

Check the build logs and ensure all dependencies are properly installed.

## Artifacts

The following artifacts are uploaded on test failures:

- `playwright-report/` - Playwright HTML test reports (retained for 7 days)

Access artifacts from the workflow run details page.
