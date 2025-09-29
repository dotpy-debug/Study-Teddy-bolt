import * as Sentry from '@sentry/nextjs';
import React from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private performanceEntries: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track component render time
  startRender(componentName: string): string {
    const markName = `render-start-${componentName}-${Date.now()}`;
    performance.mark(markName);
    return markName;
  }

  endRender(componentName: string, startMark: string): void {
    const endMark = `render-end-${componentName}-${Date.now()}`;
    performance.mark(endMark);

    try {
      performance.measure(`render-${componentName}`, startMark, endMark);
      const entries = performance.getEntriesByName(`render-${componentName}`);
      const duration = entries[entries.length - 1]?.duration || 0;

      // Alert if render time exceeds threshold (50ms)
      if (duration > 50) {
        Sentry.addBreadcrumb({
          message: `Slow component render: ${componentName}`,
          level: 'warning',
          data: {
            component: componentName,
            duration: `${duration.toFixed(2)}ms`,
          },
        });
      }

      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(`render-${componentName}`);
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }

  // Track API call performance
  trackAPICall(endpoint: string, method: string = 'GET'): {
    finish: (status: number, error?: Error) => void;
  } {
    const transaction = Sentry.startTransaction({
      name: `API ${method} ${endpoint}`,
      op: 'api.call',
    });

    const start = performance.now();

    return {
      finish: (status: number, error?: Error) => {
        const duration = performance.now() - start;

        transaction.setData('http.status_code', status);
        transaction.setData('http.method', method);
        transaction.setData('duration', duration);

        if (error) {
          transaction.setStatus('internal_error');
          Sentry.captureException(error);
        } else if (status >= 400) {
          transaction.setStatus('invalid_argument');
        } else {
          transaction.setStatus('ok');
        }

        // Alert on slow API calls (>1000ms)
        if (duration > 1000) {
          Sentry.addBreadcrumb({
            message: `Slow API call: ${method} ${endpoint}`,
            level: 'warning',
            data: {
              endpoint,
              method,
              duration: `${duration.toFixed(2)}ms`,
              status,
            },
          });
        }

        transaction.finish();
      },
    };
  }

  // Track page load performance
  trackPageLoad(pageName: string): void {
    // Wait for next tick to ensure DOM is ready
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        const metrics = {
          page: pageName,
          ttfb: navigation.responseStart - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          firstPaint: 0,
          firstContentfulPaint: 0,
        };

        // Get paint timings
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          if (entry.name === 'first-paint') {
            metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Send to Sentry
        Sentry.addBreadcrumb({
          message: `Page load metrics: ${pageName}`,
          level: 'info',
          data: metrics,
        });

        // Alert on slow page loads (>3000ms for load complete)
        if (metrics.loadComplete > 3000) {
          Sentry.captureMessage(`Slow page load detected: ${pageName}`, 'warning');
        }

        // Alert on slow TTFB (>800ms)
        if (metrics.ttfb > 800) {
          Sentry.captureMessage(`Slow TTFB detected: ${pageName}`, 'warning');
        }
      }
    }, 0);
  }

  // Track bundle size
  trackBundleSize(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Track resource loading
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;

      resources.forEach((resource) => {
        if (resource.name.includes('/_next/static/')) {
          const size = resource.transferSize || 0;
          totalSize += size;

          if (resource.name.endsWith('.js')) {
            jsSize += size;
          } else if (resource.name.endsWith('.css')) {
            cssSize += size;
          }
        }
      });

      const bundleMetrics = {
        totalSize: Math.round(totalSize / 1024), // KB
        jsSize: Math.round(jsSize / 1024), // KB
        cssSize: Math.round(cssSize / 1024), // KB
      };

      Sentry.addBreadcrumb({
        message: 'Bundle size metrics',
        level: 'info',
        data: bundleMetrics,
      });

      // Alert if bundle exceeds 250KB (gzipped equivalent is roughly 70KB uncompressed)
      if (bundleMetrics.totalSize > 250) {
        Sentry.captureMessage(`Bundle size exceeds limit: ${bundleMetrics.totalSize}KB`, 'warning');
      }
    }
  }

  // Track memory usage
  trackMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;

      const memoryMetrics = {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };

      Sentry.addBreadcrumb({
        message: 'Memory usage metrics',
        level: 'info',
        data: memoryMetrics,
      });

      // Alert on high memory usage (>100MB)
      if (memoryMetrics.usedJSHeapSize > 100) {
        Sentry.captureMessage(`High memory usage detected: ${memoryMetrics.usedJSHeapSize}MB`, 'warning');
      }
    }
  }

  // Track user interactions
  trackUserInteraction(action: string, element: string, metadata?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      message: `User interaction: ${action}`,
      level: 'info',
      category: 'user',
      data: {
        action,
        element,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  // Track custom metrics
  trackCustomMetric(name: string, value: number, unit: string = 'ms'): void {
    Sentry.addBreadcrumb({
      message: `Custom metric: ${name}`,
      level: 'info',
      data: {
        name,
        value,
        unit,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// React hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();

  return {
    trackRender: () => {
      const startMark = monitor.startRender(componentName);
      return () => monitor.endRender(componentName, startMark);
    },
    trackAPICall: monitor.trackAPICall.bind(monitor),
    trackUserInteraction: monitor.trackUserInteraction.bind(monitor),
    trackCustomMetric: monitor.trackCustomMetric.bind(monitor),
  };
}

// Higher-order component for automatic performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const monitor = PerformanceMonitor.getInstance();
    const name = componentName || Component.displayName || Component.name || 'Unknown';

    React.useEffect(() => {
      const startMark = monitor.startRender(name);

      return () => {
        monitor.endRender(name, startMark);
      };
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();