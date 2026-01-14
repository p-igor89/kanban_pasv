# Performance Monitoring Guide

This guide covers setting up performance monitoring and analytics for the Admin Panel (Kanban Board).

## Table of Contents

- [Overview](#overview)
- [Web Vitals Monitoring](#web-vitals-monitoring)
- [Vercel Analytics](#vercel-analytics)
- [Google Analytics 4](#google-analytics-4)
- [Sentry Performance Monitoring](#sentry-performance-monitoring)
- [Custom Performance Tracking](#custom-performance-tracking)
- [Lighthouse CI](#lighthouse-ci)
- [Best Practices](#best-practices)

---

## Overview

### Why Monitor Performance?

- **User Experience**: Faster apps lead to happier users
- **SEO**: Core Web Vitals are a Google ranking factor
- **Business Metrics**: Performance impacts conversion rates
- **Debugging**: Identify performance bottlenecks

### Key Metrics

- **LCP (Largest Contentful Paint)**: Loading performance (< 2.5s good)
- **FID (First Input Delay)**: Interactivity (< 100ms good)
- **CLS (Cumulative Layout Shift)**: Visual stability (< 0.1 good)
- **TTFB (Time to First Byte)**: Server response time (< 800ms good)
- **FCP (First Contentful Paint)**: First render (< 1.8s good)

---

## Web Vitals Monitoring

### Built-in Next.js Web Vitals

Next.js provides built-in Web Vitals reporting out of the box.

#### 1. Create Web Vitals Reporter

Create `src/app/web-vitals.tsx`:

```typescript
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(metric);
    }

    // Send to analytics endpoint
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', body);
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
      });
    }
  });

  return null;
}
```

#### 2. Add to Root Layout

Update `src/app/layout.tsx`:

```typescript
import { WebVitals } from './web-vitals';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <WebVitals />
      </body>
    </html>
  );
}
```

#### 3. Create Analytics API Endpoint (Optional)

Create `src/app/api/analytics/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log to console (for debugging)
    console.log('Web Vital:', body);

    // TODO: Send to your analytics service
    // await sendToGoogleAnalytics(body);
    // await sendToVercel(body);
    // await sendToSentry(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

---

## Vercel Analytics

**Best for:** Vercel-hosted applications

### Setup

1. **Install Vercel Analytics**

   ```bash
   npm install @vercel/analytics
   ```

2. **Add to Root Layout**

   Update `src/app/layout.tsx`:

   ```typescript
   import { Analytics } from '@vercel/analytics/react';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

3. **Enable in Vercel Dashboard**
   - Go to your project in Vercel
   - Navigate to "Analytics" tab
   - Click "Enable Analytics"

### Features

- **Automatic Web Vitals tracking**
- **Real user monitoring (RUM)**
- **Geographic distribution**
- **Device & browser breakdown**
- **Free for personal projects** (14-day retention)
- **Paid plans** for extended retention

### View Analytics

- Dashboard: `https://vercel.com/<username>/<project>/analytics`
- View metrics: LCP, FID, CLS, TTFB
- Filter by page, device, country

---

## Google Analytics 4

**Best for:** Detailed user behavior analytics

### Setup

1. **Create GA4 Property**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create account and GA4 property
   - Copy your Measurement ID (G-XXXXXXXXXX)

2. **Install next-google-analytics**

   ```bash
   npm install nextjs-google-analytics
   ```

3. **Add to Environment Variables**

   Update `.env.local`:

   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Add to Root Layout**

   Update `src/app/layout.tsx`:

   ```typescript
   import { GoogleAnalytics } from 'nextjs-google-analytics';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           {children}
           <GoogleAnalytics trackPageViews />
         </body>
       </html>
     );
   }
   ```

### Track Custom Events

```typescript
'use client';

import { event } from 'nextjs-google-analytics';

function TaskCard() {
  const handleTaskCreate = () => {
    event('task_created', {
      category: 'Task',
      label: 'New Task',
    });
  };

  return <button onClick={handleTaskCreate}>Create Task</button>;
}
```

### Track Performance

```typescript
// src/app/web-vitals.tsx
import { event } from 'nextjs-google-analytics';

export function WebVitals() {
  useReportWebVitals((metric) => {
    event(metric.name, {
      category: 'Web Vitals',
      value: Math.round(metric.value),
      label: metric.id,
      nonInteraction: true,
    });
  });
}
```

---

## Sentry Performance Monitoring

**Best for:** Error tracking + performance monitoring

### Setup

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Create a new Next.js project
   - Copy your DSN

2. **Install Sentry**

   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

   This will:
   - Install dependencies
   - Create `sentry.client.config.ts`
   - Create `sentry.server.config.ts`
   - Create `sentry.edge.config.ts`
   - Update `next.config.js`

3. **Add DSN to Environment Variables**

   Update `.env.local`:

   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

4. **Configure Performance Monitoring**

   Update `sentry.client.config.ts`:

   ```typescript
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 1.0, // 100% of transactions
     environment: process.env.NODE_ENV,
     enabled: process.env.NODE_ENV === 'production',

     // Performance Monitoring
     integrations: [
       new Sentry.BrowserTracing({
         tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com/],
       }),
       new Sentry.Replay({
         maskAllText: true,
         blockAllMedia: true,
       }),
     ],

     // Session Replay (optional)
     replaysSessionSampleRate: 0.1, // 10% of sessions
     replaysOnErrorSampleRate: 1.0, // 100% of errors
   });
   ```

### Track Custom Transactions

```typescript
import * as Sentry from '@sentry/nextjs';

async function fetchTasks() {
  const transaction = Sentry.startTransaction({
    op: 'fetch',
    name: 'GET /api/tasks',
  });

  try {
    const response = await fetch('/api/tasks');
    const data = await response.json();
    transaction.setStatus('ok');
    return data;
  } catch (error) {
    transaction.setStatus('error');
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### Features

- **Error tracking** with stack traces
- **Performance monitoring** (frontend + backend)
- **Session replay** (see what users did before error)
- **Release tracking** (compare performance across versions)
- **Alerts** for performance degradation

---

## Custom Performance Tracking

### Track Component Render Time

```typescript
'use client';

import { useEffect, useState } from 'react';

export function Board() {
  const [renderTime, setRenderTime] = useState<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    return () => {
      const end = performance.now();
      const duration = end - start;
      setRenderTime(duration);

      // Log slow renders
      if (duration > 16) {  // > 1 frame at 60fps
        console.warn(`Slow render: ${duration.toFixed(2)}ms`);
      }

      // Send to analytics
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', JSON.stringify({
          metric: 'component_render',
          component: 'Board',
          duration,
        }));
      }
    };
  }, []);

  return <div>...</div>;
}
```

### Track API Response Times

```typescript
async function fetchWithTiming(url: string) {
  const start = performance.now();

  try {
    const response = await fetch(url);
    const end = performance.now();
    const duration = end - start;

    // Log to console
    console.log(`API ${url}: ${duration.toFixed(2)}ms`);

    // Send to analytics
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/analytics',
        JSON.stringify({
          metric: 'api_response',
          endpoint: url,
          duration,
          status: response.status,
        })
      );
    }

    return response.json();
  } catch (error) {
    const end = performance.now();
    const duration = end - start;

    console.error(`API ${url} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}
```

### Performance Observer

```typescript
// src/lib/performance-observer.ts
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  // Observe Long Tasks (> 50ms)
  const longTaskObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.warn('Long Task detected:', entry.duration, 'ms');
      // Send to analytics
    }
  });
  longTaskObserver.observe({ entryTypes: ['longtask'] });

  // Observe Layout Shifts
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        console.warn('Layout Shift:', entry);
        // Send to analytics
      }
    }
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });
}
```

---

## Lighthouse CI

**Best for:** Automated performance testing in CI/CD

### Setup

1. **Install Lighthouse CI**

   ```bash
   npm install -g @lhci/cli
   npm install --save-dev @lhci/cli
   ```

2. **Create Lighthouse Config**

   Create `lighthouserc.json`:

   ```json
   {
     "ci": {
       "collect": {
         "startServerCommand": "npm run build && npm run start",
         "url": ["http://localhost:3000"],
         "numberOfRuns": 3
       },
       "assert": {
         "preset": "lighthouse:recommended",
         "assertions": {
           "categories:performance": ["warn", { "minScore": 0.9 }],
           "categories:accessibility": ["error", { "minScore": 0.9 }],
           "categories:best-practices": ["warn", { "minScore": 0.9 }],
           "categories:seo": ["warn", { "minScore": 0.9 }]
         }
       },
       "upload": {
         "target": "temporary-public-storage"
       }
     }
   }
   ```

3. **Add npm Script**

   Update `package.json`:

   ```json
   {
     "scripts": {
       "lighthouse": "lhci autorun"
     }
   }
   ```

4. **Run Lighthouse**
   ```bash
   npm run lighthouse
   ```

### GitHub Actions Integration

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-results
          path: .lighthouseci
```

---

## Best Practices

### 1. Set Performance Budgets

Define acceptable thresholds for key metrics:

```javascript
// performance-budget.js
module.exports = {
  budgets: [
    {
      path: '/*',
      timings: [
        { metric: 'interactive', budget: 3000 }, // 3s
        { metric: 'first-contentful-paint', budget: 1500 }, // 1.5s
      ],
      resourceSizes: [
        { resourceType: 'script', budget: 300 }, // 300KB
        { resourceType: 'image', budget: 500 }, // 500KB
        { resourceType: 'total', budget: 1000 }, // 1MB
      ],
    },
  ],
};
```

### 2. Monitor in Production

- Use **Real User Monitoring (RUM)** not just synthetic tests
- Track metrics by:
  - Device type (mobile vs desktop)
  - Geographic location
  - Browser/OS
  - Network speed (4G vs WiFi)

### 3. Set Up Alerts

**Vercel:**

- Configure alerts for Core Web Vitals degradation

**Sentry:**

- Set up alerts for slow transactions (> 3s)
- Alert on error rate spikes

**Google Analytics:**

- Set up custom alerts for bounce rate changes

### 4. Regular Performance Audits

Schedule quarterly audits:

- Run Lighthouse
- Check bundle size (`npm run build:analyze`)
- Review slow database queries
- Optimize images
- Update dependencies

### 5. Track User-Centric Metrics

Beyond Core Web Vitals, track:

- **Time to Interactive (TTI)**
- **Total Blocking Time (TBT)**
- **Speed Index**
- **Task completion time**

---

## Comparison Table

| Tool                   | Type         | Cost      | Best For                    | Setup Difficulty |
| ---------------------- | ------------ | --------- | --------------------------- | ---------------- |
| **Next.js Web Vitals** | Built-in     | Free      | Basic monitoring            | Easy             |
| **Vercel Analytics**   | RUM          | Free/Paid | Vercel-hosted apps          | Very Easy        |
| **Google Analytics 4** | Analytics    | Free      | User behavior + performance | Easy             |
| **Sentry**             | APM + Errors | Free/Paid | Comprehensive monitoring    | Medium           |
| **Lighthouse CI**      | Synthetic    | Free      | CI/CD automation            | Medium           |

---

## Recommended Setup

**For MVP:**

1. Enable built-in Next.js Web Vitals logging
2. Use Vercel Analytics (if on Vercel)
3. Run Lighthouse manually before each release

**For Production:**

1. Implement all of the above +
2. Add Google Analytics 4 for user behavior
3. Add Sentry for error tracking + performance
4. Set up Lighthouse CI in GitHub Actions
5. Configure alerts for performance degradation

---

## Additional Resources

- [Web Vitals Official Site](https://web.dev/vitals/)
- [Next.js Analytics Documentation](https://nextjs.org/analytics)
- [Google Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Core Web Vitals Report (Google Search Console)](https://search.google.com/search-console)

---

**Last Updated:** 2026-01-11

For questions or issues, please open an issue on GitHub.
