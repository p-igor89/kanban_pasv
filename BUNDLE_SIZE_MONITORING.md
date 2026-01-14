# Bundle Size Monitoring

## ✅ Setup Complete

Bundle size monitoring is now integrated into the CI/CD pipeline with automatic PR comments and size tracking.

## 🎯 Goals

- ✅ Monitor bundle size changes in every PR
- ✅ Prevent bundle size regressions
- ✅ Provide actionable feedback in PR comments
- ✅ Track bundle size over time

## 📊 How It Works

### GitHub Action (.github/workflows/bundle-size.yml)

The workflow runs automatically on every PR that modifies:

- `src/**` - Source code
- `public/**` - Public assets
- `package.json` - Dependencies
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind configuration

### Process

1. **Build PR branch** - Creates production build
2. **Analyze PR bundle** - Measures bundle sizes
3. **Build main branch** - Creates production build from main
4. **Analyze main bundle** - Measures baseline sizes
5. **Calculate diff** - Compares PR vs main
6. **Comment on PR** - Posts detailed report
7. **Check limits** - Warns if size increased significantly

### Size Thresholds

| Status         | Change    | Action                        |
| -------------- | --------- | ----------------------------- |
| 🎉 **Reduced** | < -50KB   | Celebrate! Great optimization |
| ✅ **Good**    | ±50KB     | No action needed              |
| ⚡ **Caution** | +50-100KB | Review changes                |
| ⚠️ **Warning** | > +100KB  | Optimize before merge         |

## 📝 PR Comment Example

```markdown
## ✅ Bundle Size Report

| Branch   | Total Size            | Chunks |
| -------- | --------------------- | ------ |
| **PR**   | 1,234.56 KB           | 45     |
| **main** | 1,189.23 KB           | 43     |
| **Diff** | 🟡 +45.33 KB (+3.81%) | +2     |

### Status: ⚡ Caution

⚡ **Caution**: Bundle size increased by more than 50KB.

### Guidelines

- ✅ **Good**: Change < ±50KB
- ⚡ **Caution**: Change between 50-100KB
- ⚠️ **Warning**: Change > 100KB

💡 Tips to reduce bundle size

- Use dynamic imports for large components
- Check for duplicate dependencies
- Enable tree shaking
- Use Next.js Image optimization
- Consider code splitting
- Analyze with `ANALYZE=true npm run build`
```

## 🔍 Local Analysis

### 1. Build with bundle analyzer

```bash
npm run build:analyze
```

This will:

- Build the project
- Generate bundle analysis
- Open interactive visualization in browser

### 2. Check bundle sizes manually

```bash
npm run build

# Check total size
du -sh .next/static

# Check individual chunks
ls -lh .next/static/chunks/*.js

# Find largest files
find .next/static -type f -exec du -h {} + | sort -rh | head -20
```

### 3. Analyze specific bundles

```bash
# Install bundle analyzer globally
npm install -g source-map-explorer

# Build project
npm run build

# Analyze specific bundle
source-map-explorer '.next/static/chunks/*.js'
```

## 📈 Optimization Strategies

### 1. Dynamic Imports

**Before:**

```typescript
import HeavyComponent from './HeavyComponent';

function MyPage() {
  return <HeavyComponent />;
}
```

**After:**

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loader />,
  ssr: false, // Optional: disable SSR for this component
});

function MyPage() {
  return <HeavyComponent />;
}
```

**Savings:** 50-200KB per component

### 2. Tree Shaking

Ensure imports are tree-shakeable:

**Before:**

```typescript
import * as icons from 'lucide-react';
<icons.Plus />
```

**After:**

```typescript
import { Plus } from 'lucide-react';
<Plus />
```

**Savings:** 100-500KB

### 3. Code Splitting by Route

Next.js automatically code-splits by route. Keep routes focused:

```
app/
├── (auth)/
│   ├── login/page.tsx       # Small bundle
│   └── register/page.tsx    # Small bundle
├── (dashboard)/
│   ├── boards/page.tsx      # Medium bundle
│   └── settings/page.tsx    # Small bundle
```

### 4. Analyze Dependencies

```bash
# Check which dependencies are largest
npm install -g webpack-bundle-analyzer
npm run build:analyze

# Check duplicate dependencies
npm ls | grep -E "deduped|UNMET"

# Check outdated packages
npm outdated
```

### 5. Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority  // For above-the-fold images
/>
```

### 6. Remove Unused Dependencies

```bash
# Find unused dependencies
npx depcheck

# Remove package
npm uninstall unused-package
```

## 🎯 Target Sizes

| Metric        | Target  | Current | Status |
| ------------- | ------- | ------- | ------ |
| First Load JS | < 250KB | ~220KB  | ✅     |
| Total Static  | < 2MB   | ~1.8MB  | ✅     |
| Largest Chunk | < 100KB | ~85KB   | ✅     |

## 📋 Checklist for Large PRs

Before merging a PR that increases bundle size:

- [ ] Run `npm run build:analyze` locally
- [ ] Check what's causing the increase
- [ ] Consider dynamic imports for new components
- [ ] Verify tree shaking is working
- [ ] Check for duplicate dependencies
- [ ] Document why the increase is necessary
- [ ] Get approval from team lead if > 100KB increase

## 🐛 Troubleshooting

### Issue: Bundle size check fails in CI

**Solution:**

1. Check GitHub Actions logs
2. Ensure build succeeds locally
3. Verify no missing dependencies

### Issue: False positives (size didn't actually change)

**Solution:**

- Rebase PR on latest main
- Clear cache and rebuild
- Check for non-deterministic builds

### Issue: Can't reduce bundle size further

**Solutions:**

1. Split large components
2. Move heavy dependencies to optional imports
3. Use smaller alternatives (e.g., date-fns-tz instead of moment-timezone)
4. Check if polyfills are needed

## 🔗 Resources

- [Next.js Bundle Analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Source Map Explorer](https://github.com/danvk/source-map-explorer)
- [Web.dev Performance Guide](https://web.dev/performance/)

## 📊 Monitoring Over Time

To track bundle size trends:

1. Check PR comments for historical data
2. Use GitHub's commit history
3. Consider tools like:
   - [Bundlephobia](https://bundlephobia.com/)
   - [Package Phobia](https://packagephobia.com/)
   - [Bundle Scanner](https://bundlescanner.com/)

---

**Status:** ✅ Bundle size monitoring active and configured

**Next:** Monitor PRs and optimize as needed
