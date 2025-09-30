import { onCLS, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface WebVitalMetrics {
  CLS: number;
  FCP: number;
  FID: number;
  LCP: number;
  TTFB: number;
}

export interface PerformanceEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  url: string;
  userAgent: string;
}

class WebVitalsTracker {
  private metrics: Map<string, PerformanceEntry> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTracking();
    }
  }

  private initializeTracking(): void {
    // Track Core Web Vitals
    onCLS(this.onMetric.bind(this));
    onFCP(this.onMetric.bind(this));
    // Note: FID is deprecated in web-vitals v4+, replaced by INP
    onLCP(this.onMetric.bind(this));
    onTTFB(this.onMetric.bind(this));

    // Track custom performance metrics
    this.trackLongTasks();
    this.trackResourceTimings();
    this.trackNavigationTiming();
  }

  private onMetric(metric: Metric): void {
    const entry: PerformanceEntry = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: Date.now(),
      id: metric.id,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.metrics.set(metric.name, entry);
    this.reportMetric(entry);
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      FID: [100, 300],
      LCP: [2500, 4000],
      TTFB: [800, 1800],
    };

    const [good, poor] = thresholds[metricName as keyof typeof thresholds] || [0, 0];

    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  private trackLongTasks(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Long task threshold
              this.reportCustomMetric({
                name: 'long-task',
                value: entry.duration,
                timestamp: Date.now(),
                url: window.location.href,
                details: {
                  startTime: entry.startTime,
                  duration: entry.duration,
                },
              });
            }
          });
        });

        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Long task tracking not supported:', error);
      }
    }
  }

  private trackResourceTimings(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const resource = entry as PerformanceResourceTiming;

            // Track slow resources
            if (resource.duration > 1000) {
              this.reportCustomMetric({
                name: 'slow-resource',
                value: resource.duration,
                timestamp: Date.now(),
                url: window.location.href,
                details: {
                  resourceUrl: resource.name,
                  resourceType: this.getResourceType(resource.name),
                  transferSize: resource.transferSize,
                  duration: resource.duration,
                },
              });
            }
          });
        });

        observer.observe({ entryTypes: ['resource'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Resource timing tracking not supported:', error);
      }
    }
  }

  private trackNavigationTiming(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const navigation = entry as PerformanceNavigationTiming;

            this.reportCustomMetric({
              name: 'navigation-timing',
              value: navigation.loadEventEnd - navigation.fetchStart,
              timestamp: Date.now(),
              url: window.location.href,
              details: {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                loadComplete: navigation.loadEventEnd - navigation.fetchStart,
                dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
                tcpConnect: navigation.connectEnd - navigation.connectStart,
                requestResponse: navigation.responseEnd - navigation.requestStart,
              },
            });
          });
        });

        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Navigation timing tracking not supported:', error);
      }
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private reportMetric(entry: PerformanceEntry): void {
    // Report to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', entry.name, {
        event_category: 'Web Vitals',
        event_label: entry.id,
        value: Math.round(entry.value),
        custom_map: {
          metric_rating: entry.rating,
        },
      });
    }

    // Report to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'performance',
        message: `${entry.name}: ${entry.value}ms (${entry.rating})`,
        level: entry.rating === 'poor' ? 'warning' : 'info',
        data: entry,
      });
    }

    // Report to internal analytics
    this.reportToAnalytics(entry);
  }

  private reportCustomMetric(metric: any): void {
    // Report custom metrics to analytics
    this.reportToAnalytics(metric);
  }

  private reportToAnalytics(data: any): void {
    // Send to internal analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).catch((error) => {
        console.warn('Failed to report performance metric:', error);
      });
    } else {
      console.log('Performance metric:', data);
    }
  }

  public getMetrics(): Map<string, PerformanceEntry> {
    return this.metrics;
  }

  public disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let webVitalsTracker: WebVitalsTracker | null = null;

export function initializeWebVitals(): WebVitalsTracker {
  if (!webVitalsTracker) {
    webVitalsTracker = new WebVitalsTracker();
  }
  return webVitalsTracker;
}

export function reportWebVitals(): void {
  if (typeof window !== 'undefined') {
    initializeWebVitals();
  }
}

export function observeLongTasks(): () => void {
  const tracker = initializeWebVitals();
  return () => tracker.disconnect();
}

// Export types for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    Sentry?: any;
  }
}