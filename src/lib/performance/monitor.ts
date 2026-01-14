/**
 * Performance monitoring utility for tracking Core Web Vitals and custom metrics
 * Integrates with analytics services and provides real-time performance insights
 */
/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // Custom metrics
  taskRenderTime?: number;
  apiResponseTime?: number;
  dragDropLatency?: number;
  realtimeLatency?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private marks: Map<string, number> = new Map();
  private reportingEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  private buffer: PerformanceMetrics[] = [];
  private bufferSize = 10;
  private debug = process.env.NODE_ENV === 'development';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeCoreWebVitals();
      this.initializeCustomMetrics();
      this.setupPerformanceObservers();
      this.setupReportingInterval();
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeCoreWebVitals() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
          if (this.metrics.lcp !== undefined) {
            this.logMetric('LCP', this.metrics.lcp);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.set('lcp', lcpObserver);
      } catch {
        console.warn('LCP observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
            this.logMetric('FID', this.metrics.fid);
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        this.observers.set('fid', fidObserver);
      } catch {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsEntries: PerformanceEntry[] = [];
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any) {
            if (!entry.hadRecentInput) {
              clsEntries.push(entry);
              clsValue += entry.value;
            }
          }
          this.metrics.cls = clsValue;
          this.logMetric('CLS', this.metrics.cls);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.set('cls', clsObserver);
      } catch {
        console.warn('CLS observer not supported');
      }
    }

    // Time to First Byte
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.metrics.ttfb = timing.responseStart - timing.navigationStart;
      this.logMetric('TTFB', this.metrics.ttfb);
    }
  }

  /**
   * Initialize custom metrics specific to the Kanban board
   */
  private initializeCustomMetrics() {
    // Track navigation timing
    if (window.performance && window.performance.getEntriesByType) {
      const navigationEntries = window.performance.getEntriesByType('navigation') as any;
      if (navigationEntries.length > 0) {
        const navigation = navigationEntries[0];
        this.metrics.fcp = navigation.loadEventEnd - navigation.fetchStart;
        this.logMetric('FCP', this.metrics.fcp);
      }
    }
  }

  /**
   * Setup performance observers for ongoing monitoring
   */
  private setupPerformanceObservers() {
    // Monitor long tasks (blocking the main thread)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.reportLongTask({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch {
      console.warn('Long task observer not supported');
    }

    // Monitor resource loading
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          if (entry.duration > 1000) {
            this.reportSlowResource({
              name: entry.name,
              duration: entry.duration,
              type: entry.initiatorType,
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch {
      console.warn('Resource observer not supported');
    }
  }

  /**
   * Mark the start of a custom performance measurement
   */
  public markStart(name: string) {
    this.marks.set(name, performance.now());
    if (this.debug) {
      console.log(`[Performance] Started measuring: ${name}`);
    }
  }

  /**
   * Mark the end of a custom performance measurement and record the duration
   */
  public markEnd(name: string, threshold?: number) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for: ${name}`);
      return;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // Log if duration exceeds threshold
    if (threshold && duration > threshold) {
      console.warn(
        `[Performance] ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }

    if (this.debug) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    // Store custom metrics
    this.storeCustomMetric(name, duration);

    return duration;
  }

  /**
   * Store custom metrics for reporting
   */
  private storeCustomMetric(name: string, value: number) {
    switch (name) {
      case 'task-render':
        this.metrics.taskRenderTime = value;
        break;
      case 'api-call':
        this.metrics.apiResponseTime = value;
        break;
      case 'drag-drop':
        this.metrics.dragDropLatency = value;
        break;
      case 'realtime-update':
        this.metrics.realtimeLatency = value;
        break;
    }
  }

  /**
   * Log metrics in development mode
   */
  private logMetric(name: string, value: number) {
    if (this.debug) {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`);
    }
  }

  /**
   * Report long-running tasks
   */
  private reportLongTask(task: { name: string; duration: number; startTime: number }) {
    if (this.debug) {
      console.warn(`[Performance] Long task detected:`, task);
    }
    // Send to analytics
    this.sendToAnalytics('long-task', task);
  }

  /**
   * Report slow-loading resources
   */
  private reportSlowResource(resource: { name: string; duration: number; type: string }) {
    if (this.debug) {
      console.warn(`[Performance] Slow resource:`, resource);
    }
    // Send to analytics
    this.sendToAnalytics('slow-resource', resource);
  }

  /**
   * Setup interval for periodic reporting
   */
  private setupReportingInterval() {
    // Report metrics every 30 seconds
    setInterval(() => {
      if (Object.keys(this.metrics).length > 0) {
        this.reportMetrics();
      }
    }, 30000);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  /**
   * Report collected metrics to analytics service
   */
  private reportMetrics() {
    const metricsToReport = { ...this.metrics };

    // Add context to the report
    const report = {
      ...metricsToReport,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };

    // Buffer metrics for batch reporting
    this.buffer.push(report);

    if (this.buffer.length >= this.bufferSize) {
      this.flushBuffer();
    }

    if (this.debug) {
      console.table(metricsToReport);
    }
  }

  /**
   * Flush buffered metrics to analytics endpoint
   */
  private flushBuffer() {
    if (this.buffer.length === 0) return;

    const payload = {
      metrics: this.buffer,
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
    };

    // Send to analytics endpoint
    if (this.reportingEndpoint) {
      fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((error) => {
        console.error('Failed to report metrics:', error);
      });
    }

    // Clear buffer
    this.buffer = [];
  }

  /**
   * Send custom events to analytics
   */
  private sendToAnalytics(eventName: string, data: any) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, data);
    }
  }

  /**
   * Get or create session ID for tracking
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('perf-session-id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('perf-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get current metrics snapshot
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if metrics meet performance budget
   */
  public checkBudget(budget: Partial<PerformanceMetrics>): boolean {
    for (const [key, threshold] of Object.entries(budget)) {
      const actualValue = this.metrics[key as keyof PerformanceMetrics];
      if (actualValue && actualValue > threshold) {
        console.warn(`[Performance] Budget exceeded for ${key}: ${actualValue} > ${threshold}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Cleanup observers on unmount
   */
  public cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.marks.clear();
    this.flushBuffer();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const markStart = (name: string) => performanceMonitor.markStart(name);
export const markEnd = (name: string, threshold?: number) =>
  performanceMonitor.markEnd(name, threshold);
export const getMetrics = () => performanceMonitor.getMetrics();
export const checkBudget = (budget: Partial<PerformanceMetrics>) =>
  performanceMonitor.checkBudget(budget);

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    markStart,
    markEnd,
    getMetrics,
    checkBudget,
  };
}
