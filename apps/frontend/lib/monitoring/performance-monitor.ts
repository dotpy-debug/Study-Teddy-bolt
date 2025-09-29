// Frontend Performance Monitoring
export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

export interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  line?: number;
  column?: number;
  timestamp: Date;
  userAgent: string;
  userId?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics | null = null;
  private errors: ErrorEvent[] = [];
  private apiEndpoint: string;

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_API_URL || '';
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor performance metrics
    this.collectPerformanceMetrics();

    // Monitor errors
    this.setupErrorTracking();

    // Monitor API calls
    this.setupAPIMonitoring();

    // Send metrics periodically
    setInterval(() => {
      this.sendMetrics();
    }, 60000); // Every minute
  }

  private collectPerformanceMetrics() {
    if (typeof window === 'undefined' || !window.performance) return;

    // Wait for page load to complete
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        this.metrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: this.getMetricValue('first-contentful-paint'),
          largestContentfulPaint: this.getMetricValue('largest-contentful-paint'),
          cumulativeLayoutShift: this.getMetricValue('cumulative-layout-shift'),
          firstInputDelay: this.getMetricValue('first-input-delay'),
          timeToInteractive: navigation.domInteractive - navigation.fetchStart,
        };
      }, 1000);
    });
  }

  private getMetricValue(metricName: string): number {
    if (typeof window === 'undefined') return 0;

    const entries = performance.getEntriesByName(metricName);
    return entries.length > 0 ? entries[0].startTime : 0;
  }

  private setupErrorTracking() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
      });
    });
  }

  private setupAPIMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.trackAPICall({
          url,
          method: (args[1]?.method || 'GET') as string,
          status: response.status,
          duration: endTime - startTime,
          success: response.ok,
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        
        this.trackAPICall({
          url,
          method: (args[1]?.method || 'GET') as string,
          status: 0,
          duration: endTime - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }
    };
  }

  private trackError(error: ErrorEvent) {
    this.errors.push(error);
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    // Log error for debugging
    console.error('Frontend error tracked:', error);
  }

  private trackAPICall(call: {
    url: string;
    method: string;
    status: number;
    duration: number;
    success: boolean;
    error?: string;
  }) {
    // Log slow API calls
    if (call.duration > 2000) {
      console.warn(`Slow API call detected: ${call.method} ${call.url} took ${call.duration}ms`);
    }

    // Log failed API calls
    if (!call.success) {
      console.error(`API call failed: ${call.method} ${call.url}`, call.error);
    }
  }

  private async sendMetrics() {
    if (!this.apiEndpoint || (!this.metrics && this.errors.length === 0)) return;

    try {
      const payload = {
        metrics: this.metrics,
        errors: this.errors.splice(0), // Send and clear errors
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      await fetch(`${this.apiEndpoint}/monitoring/frontend-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  // Public methods for manual tracking
  public trackCustomError(message: string, context?: Record<string, any>) {
    this.trackError({
      message,
      url: window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      stack: JSON.stringify(context),
    });
  }

  public getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  public getErrors(): ErrorEvent[] {
    return [...this.errors];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// React hook for using performance monitor
import { useEffect, useState } from 'react';

export function usePerformanceMonitor() {
  const [monitor] = useState(() => getPerformanceMonitor());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, [monitor]);

  return {
    monitor,
    metrics,
    trackError: (message: string, context?: Record<string, any>) => 
      monitor.trackCustomError(message, context),
  };
}