import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

export interface WebVitalsMetrics {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function getConnectionSpeed() {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      return conn.effectiveType || 'unknown';
    }
  }
  return 'unknown';
}

function sendToAnalytics(metric: Metric) {
  const analyticsId = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
      id: metric.id,
    });
  }

  // Send to Vercel Analytics if configured
  if (analyticsId) {
    const body = {
      dsn: analyticsId,
      id: metric.id,
      page: window.location.pathname,
      href: window.location.href,
      event_name: metric.name,
      value: metric.value.toString(),
      speed: getConnectionSpeed(),
    };

    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(vitalsUrl, blob);
    } else {
      fetch(vitalsUrl, {
        body: blob,
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
      });
    }
  }

  // Store in localStorage for local tracking
  try {
    const stored = localStorage.getItem('webVitals') || '[]';
    const vitals = JSON.parse(stored);
    vitals.push({
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    });

    // Keep only last 100 entries
    if (vitals.length > 100) {
      vitals.shift();
    }

    localStorage.setItem('webVitals', JSON.stringify(vitals));
  } catch (e) {
    console.error('Failed to store web vitals', e);
  }
}

export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics); // INP replaced FID in web-vitals v3+
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

export function getStoredVitals(): WebVitalsMetrics[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('webVitals') || '[]';
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Performance monitoring utilities
export function measureComponentRender(componentName: string) {
  if (typeof window === 'undefined' || !window.performance) return;

  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  const measureName = `${componentName}-render`;

  return {
    start: () => performance.mark(startMark),
    end: () => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const measure = performance.getEntriesByName(measureName)[0];
      if (measure && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} rendered in ${Math.round(measure.duration)}ms`);
      }

      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);

      return measure?.duration;
    }
  };
}

// Custom performance metrics
export function trackCustomMetric(name: string, value: number, unit: string = 'ms') {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Custom Metric] ${name}: ${value}${unit}`);
  }

  // Send to analytics if needed
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      name,
      value: Math.round(value),
      event_category: 'Custom Performance',
      event_label: unit,
    });
  }
}

// Initialize performance observer for long tasks
export function observeLongTasks(threshold: number = 50): (() => void) | undefined {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return undefined;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > threshold) {
          console.warn('[Long Task Detected]', {
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
            name: entry.name,
          });

          // Track long tasks
          trackCustomMetric('long_task', entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => observer.disconnect();
  } catch (e) {
    console.error('Failed to observe long tasks', e);
    return undefined;
  }
}