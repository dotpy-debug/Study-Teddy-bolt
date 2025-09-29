import { SentryUtils } from '../../../sentry.client.config';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface UserJourneyMetric {
  journey: string;
  step: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();
  private journeys: Map<string, any[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring performance
   */
  startMeasure(name: string): void {
    this.measurements.set(name, performance.now());

    // Use Performance API if available
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End measuring and track the metric
   */
  endMeasure(name: string, tags?: Record<string, string>): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(name);

    // Use Performance API if available
    if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    // Track with Sentry
    SentryUtils.trackMetric(name, duration, { unit: 'ms', ...tags });

    return duration;
  }

  /**
   * Track a custom metric
   */
  trackMetric(metric: PerformanceMetric): void {
    SentryUtils.trackMetric(metric.name, metric.value, {
      unit: metric.unit,
      ...metric.tags,
    });

    // Log performance issues
    this.checkPerformanceThresholds(metric);
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVital(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    SentryUtils.trackMetric(`web_vital.${name}`, value, {
      unit: 'ms',
      rating,
      type: 'web_vital',
    });

    // Alert on poor Web Vitals
    if (rating === 'poor') {
      console.warn(`Poor Web Vital detected: ${name} = ${value}ms`);
    }
  }

  /**
   * Track user journey performance
   */
  startUserJourney(journeyId: string, journeyName: string): void {
    this.journeys.set(journeyId, []);
    this.startMeasure(`journey_${journeyId}`);

    SentryUtils.trackUserAction(`journey_start:${journeyName}`, {
      journeyId,
      journeyName,
    });
  }

  /**
   * Add step to user journey
   */
  addJourneyStep(journeyId: string, stepName: string, metadata?: Record<string, any>): void {
    const journey = this.journeys.get(journeyId) || [];
    const stepStart = performance.now();

    journey.push({
      step: stepName,
      timestamp: stepStart,
      metadata,
    });

    this.journeys.set(journeyId, journey);

    SentryUtils.trackUserAction(`journey_step:${stepName}`, {
      journeyId,
      stepName,
      metadata,
    });
  }

  /**
   * Complete user journey
   */
  completeUserJourney(journeyId: string, success: boolean = true): void {
    const totalDuration = this.endMeasure(`journey_${journeyId}`);
    const journey = this.journeys.get(journeyId) || [];

    const journeyMetric: UserJourneyMetric = {
      journey: journeyId,
      step: 'complete',
      duration: totalDuration,
      success,
      metadata: {
        steps: journey.length,
        stepDetails: journey,
      },
    };

    this.trackUserJourney(journeyMetric);
    this.journeys.delete(journeyId);
  }

  /**
   * Track user journey metric
   */
  trackUserJourney(metric: UserJourneyMetric): void {
    SentryUtils.trackUserAction(`journey_complete:${metric.journey}`, {
      duration: metric.duration,
      success: metric.success,
      steps: metric.metadata?.steps,
    });

    // Alert on slow journeys
    if (metric.duration > 10000) { // 10 seconds
      console.warn(`Slow user journey detected: ${metric.journey} = ${metric.duration}ms`);
    }
  }

  /**
   * Track API request performance
   */
  trackAPICall(endpoint: string, method: string, duration: number, status: number): void {
    SentryUtils.trackAPICall(endpoint, method, duration);

    this.trackMetric({
      name: `api.${method.toLowerCase()}.${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: status.toString(),
        type: 'api_call',
      },
    });
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, duration: number): void {
    this.trackMetric({
      name: `component.render.${componentName}`,
      value: duration,
      unit: 'ms',
      tags: {
        component: componentName,
        type: 'component_render',
      },
    });

    // Alert on slow renders
    if (duration > 100) {
      console.warn(`Slow component render: ${componentName} = ${duration}ms`);
    }
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;

      this.trackMetric({
        name: 'memory.used_heap',
        value: memory.usedJSHeapSize / 1024 / 1024,
        unit: 'MB',
        tags: { type: 'memory' },
      });

      this.trackMetric({
        name: 'memory.total_heap',
        value: memory.totalJSHeapSize / 1024 / 1024,
        unit: 'MB',
        tags: { type: 'memory' },
      });

      this.trackMetric({
        name: 'memory.heap_limit',
        value: memory.jsHeapSizeLimit / 1024 / 1024,
        unit: 'MB',
        tags: { type: 'memory' },
      });
    }
  }

  /**
   * Track bundle loading performance
   */
  trackBundleLoad(bundleName: string, duration: number, size?: number): void {
    this.trackMetric({
      name: `bundle.load.${bundleName}`,
      value: duration,
      unit: 'ms',
      tags: {
        bundle: bundleName,
        type: 'bundle_load',
      },
    });

    if (size) {
      this.trackMetric({
        name: `bundle.size.${bundleName}`,
        value: size / 1024,
        unit: 'KB',
        tags: {
          bundle: bundleName,
          type: 'bundle_size',
        },
      });
    }
  }

  /**
   * Check performance thresholds and alert
   */
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds: Record<string, number> = {
      'page.load': 3000,
      'api.request': 2000,
      'component.render': 100,
      'user.interaction': 100,
      'bundle.load': 5000,
    };

    for (const [pattern, threshold] of Object.entries(thresholds)) {
      if (metric.name.includes(pattern) && metric.value > threshold) {
        console.warn(`Performance threshold exceeded: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`);

        SentryUtils.trackUserAction('performance_threshold_exceeded', {
          metric: metric.name,
          value: metric.value,
          threshold,
          unit: metric.unit,
        });
      }
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    // Get navigation timing if available
    if (typeof performance.getEntriesByType === 'function') {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        summary.navigation = {
          domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
          loadComplete: nav.loadEventEnd - nav.fetchStart,
          firstPaint: nav.domContentLoadedEventStart - nav.fetchStart,
        };
      }

      // Get resource timing
      const resourceEntries = performance.getEntriesByType('resource');
      summary.resources = {
        count: resourceEntries.length,
        totalSize: resourceEntries.reduce((total, entry) => {
          return total + (entry as any).transferSize || 0;
        }, 0),
      };

      // Get measure entries
      const measureEntries = performance.getEntriesByType('measure');
      summary.measures = measureEntries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
      }));
    }

    return summary;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
    this.journeys.clear();

    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks();
    }

    if (typeof performance.clearMeasures === 'function') {
      performance.clearMeasures();
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-track memory usage periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitor.trackMemoryUsage();
  }, 30000); // Every 30 seconds
}