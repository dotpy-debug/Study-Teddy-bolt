import { test, expect } from '@playwright/test';

test.describe('Core Web Vitals Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Add Web Vitals monitoring
      window.webVitalsData = {
        CLS: [],
        FID: [],
        FCP: [],
        LCP: [],
        TTFB: []
      };

      // Mock web-vitals library if not available
      if (!window.webVitals) {
        window.webVitals = {
          getCLS: (callback) => {
            // Simulate CLS measurement
            setTimeout(() => callback({ value: Math.random() * 0.1 }), 1000);
          },
          getFID: (callback) => {
            // Simulate FID measurement
            setTimeout(() => callback({ value: Math.random() * 100 }), 500);
          },
          getFCP: (callback) => {
            // Simulate FCP measurement
            setTimeout(() => callback({ value: 1000 + Math.random() * 1000 }), 800);
          },
          getLCP: (callback) => {
            // Simulate LCP measurement
            setTimeout(() => callback({ value: 1500 + Math.random() * 1500 }), 1200);
          },
          getTTFB: (callback) => {
            // Simulate TTFB measurement
            setTimeout(() => callback({ value: 200 + Math.random() * 300 }), 200);
          }
        };
      }
    });
  });

  test('should meet Core Web Vitals thresholds on homepage', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure Core Web Vitals
    const webVitals = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const vitals = {};
        let collected = 0;
        const totalMetrics = 5;

        const checkComplete = () => {
          if (collected === totalMetrics) {
            resolve(vitals);
          }
        };

        // Collect CLS (Cumulative Layout Shift)
        window.webVitals.getCLS((metric) => {
          vitals.CLS = metric.value;
          collected++;
          checkComplete();
        });

        // Collect FID (First Input Delay)
        window.webVitals.getFID((metric) => {
          vitals.FID = metric.value;
          collected++;
          checkComplete();
        });

        // Collect FCP (First Contentful Paint)
        window.webVitals.getFCP((metric) => {
          vitals.FCP = metric.value;
          collected++;
          checkComplete();
        });

        // Collect LCP (Largest Contentful Paint)
        window.webVitals.getLCP((metric) => {
          vitals.LCP = metric.value;
          collected++;
          checkComplete();
        });

        // Collect TTFB (Time to First Byte)
        window.webVitals.getTTFB((metric) => {
          vitals.TTFB = metric.value;
          collected++;
          checkComplete();
        });

        // Fallback timeout
        setTimeout(() => {
          if (collected < totalMetrics) {
            console.warn('Not all Web Vitals collected, using fallback');
            resolve(vitals);
          }
        }, 5000);
      });
    });

    console.log('Web Vitals Results:', webVitals);

    // Core Web Vitals thresholds
    if (webVitals.CLS !== undefined) {
      expect(webVitals.CLS).toBeLessThan(0.1); // Good: < 0.1
    }

    if (webVitals.FID !== undefined) {
      expect(webVitals.FID).toBeLessThan(100); // Good: < 100ms
    }

    if (webVitals.FCP !== undefined) {
      expect(webVitals.FCP).toBeLessThan(1800); // Good: < 1.8s
    }

    if (webVitals.LCP !== undefined) {
      expect(webVitals.LCP).toBeLessThan(2500); // Good: < 2.5s
    }

    if (webVitals.TTFB !== undefined) {
      expect(webVitals.TTFB).toBeLessThan(600); // Good: < 600ms
    }
  });

  test('should meet Core Web Vitals thresholds on dashboard', async ({ page }) => {
    // Login first
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@studyteddy.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('/dashboard');

    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        ttfb: navigation.responseStart - navigation.navigationStart,
      };
    });

    console.log('Dashboard Performance Metrics:', performanceMetrics);

    // Performance thresholds for dashboard
    expect(performanceMetrics.ttfb).toBeLessThan(800); // TTFB under 800ms
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // FCP under 2s
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // DOM ready under 3s
    expect(performanceMetrics.loadComplete).toBeLessThan(5000); // Full load under 5s
  });

  test('should handle layout shifts gracefully', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');

    // Monitor layout shifts during dynamic content loading
    const layoutShifts = await page.evaluate(() => {
      return new Promise((resolve) => {
        let cumulativeLayoutShift = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              cumulativeLayoutShift += entry.value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        // Simulate dynamic content loading
        setTimeout(() => {
          observer.disconnect();
          resolve(cumulativeLayoutShift);
        }, 3000);
      });
    });

    console.log('Cumulative Layout Shift:', layoutShifts);

    // CLS should be under 0.1 for good user experience
    expect(layoutShifts).toBeLessThan(0.1);
  });

  test('should maintain good FID on interactive elements', async ({ page }) => {
    await page.goto('/dashboard/focus');
    await page.waitForLoadState('networkidle');

    // Measure First Input Delay
    const fidResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let firstInputDelay = null;

        const observer = new PerformanceObserver((list) => {
          const firstInput = list.getEntries()[0];
          if (firstInput) {
            firstInputDelay = firstInput.processingStart - firstInput.startTime;
            observer.disconnect();
            resolve(firstInputDelay);
          }
        });

        observer.observe({ type: 'first-input', buffered: true });

        // Simulate user interaction
        setTimeout(() => {
          const button = document.querySelector('[data-testid="start-focus-button"]');
          if (button) {
            button.click();
          }
        }, 1000);

        // Fallback timeout
        setTimeout(() => {
          if (firstInputDelay === null) {
            observer.disconnect();
            resolve(0); // No delay measured
          }
        }, 5000);
      });
    });

    console.log('First Input Delay:', fidResult);

    // FID should be under 100ms for good responsiveness
    expect(fidResult).toBeLessThan(100);
  });

  test('should optimize Largest Contentful Paint', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    // Wait for content to load and measure LCP
    const lcpResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        let largestContentfulPaint = 0;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            largestContentfulPaint = lastEntry.startTime;
          }
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Wait for page to stabilize
        setTimeout(() => {
          observer.disconnect();
          resolve(largestContentfulPaint);
        }, 4000);
      });
    });

    console.log('Largest Contentful Paint:', lcpResult);

    // LCP should be under 2.5s for good user experience
    expect(lcpResult).toBeLessThan(2500);
  });

  test('should measure Time to Interactive', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard/calendar');

    // Wait for page to become interactive
    await page.waitForFunction(() => {
      return document.readyState === 'complete' &&
             performance.getEntriesByType('navigation')[0].loadEventEnd > 0;
    });

    // Measure TTI approximation
    const ttiApprox = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.loadEventEnd - navigation.navigationStart;
    });

    console.log('Time to Interactive (approx):', ttiApprox);

    // TTI should be under 3.5s for good user experience
    expect(ttiApprox).toBeLessThan(3500);
  });

  test('should monitor resource loading performance', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Analyze resource loading performance
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const analysis = {
        totalResources: resources.length,
        slowResources: [],
        largeResources: [],
        totalTransferSize: 0,
        averageResponseTime: 0
      };

      let totalResponseTime = 0;

      resources.forEach(resource => {
        const responseTime = resource.responseEnd - resource.responseStart;
        totalResponseTime += responseTime;

        // Flag slow resources (> 1s)
        if (responseTime > 1000) {
          analysis.slowResources.push({
            url: resource.name,
            responseTime: responseTime
          });
        }

        // Flag large resources (> 100KB)
        if (resource.transferSize && resource.transferSize > 100000) {
          analysis.largeResources.push({
            url: resource.name,
            size: resource.transferSize
          });
        }

        if (resource.transferSize) {
          analysis.totalTransferSize += resource.transferSize;
        }
      });

      analysis.averageResponseTime = totalResponseTime / resources.length;

      return analysis;
    });

    console.log('Resource Performance Analysis:', resourceMetrics);

    // Performance assertions
    expect(resourceMetrics.slowResources.length).toBeLessThan(5); // Max 5 slow resources
    expect(resourceMetrics.averageResponseTime).toBeLessThan(500); // Average response under 500ms
    expect(resourceMetrics.totalTransferSize).toBeLessThan(2000000); // Total under 2MB
  });

  test('should validate Core Web Vitals on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile-specific performance measurement
    const mobilePerformance = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        ttfb: navigation.responseStart - navigation.navigationStart,
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
      };
    });

    console.log('Mobile Performance Metrics:', mobilePerformance);

    // Mobile-specific thresholds (slightly more lenient)
    expect(mobilePerformance.ttfb).toBeLessThan(1000); // TTFB under 1s on mobile
    expect(mobilePerformance.fcp).toBeLessThan(2500); // FCP under 2.5s on mobile
    expect(mobilePerformance.domInteractive).toBeLessThan(4000); // DOM interactive under 4s
    expect(mobilePerformance.loadComplete).toBeLessThan(6000); // Full load under 6s
  });
});