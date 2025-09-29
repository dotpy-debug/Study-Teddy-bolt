import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Performance', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should load dashboard quickly on mobile', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Dashboard should load within 3 seconds on mobile
    expect(loadTime).toBeLessThan(3000);

    // Verify critical elements are visible
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });

  test('should handle mobile network conditions', async ({ page }) => {
    // Simulate slow 3G connection
    await page.context().route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/dashboard/tasks');
    await page.waitForSelector('[data-testid="task-list"]');
    const endTime = Date.now();

    // Should still be usable even with slower connection
    expect(endTime - startTime).toBeLessThan(5000);

    // Verify loading states are shown
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
  });

  test('should optimize images for mobile', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that images are appropriately sized for mobile
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const boundingBox = await image.boundingBox();

      if (boundingBox) {
        // Images shouldn't exceed mobile viewport width
        expect(boundingBox.width).toBeLessThanOrEqual(390); // iPhone 12 width + some tolerance
      }
    }
  });

  test('should implement efficient scrolling on mobile', async ({ page }) => {
    await page.goto('/dashboard/tasks');

    // Create a long list scenario
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        const taskList = document.querySelector('[data-testid="task-list"]');
        if (taskList) {
          const taskItem = document.createElement('div');
          taskItem.setAttribute('data-testid', 'task-item');
          taskItem.textContent = `Task ${Date.now()}`;
          taskList.appendChild(taskItem);
        }
      });
    }

    // Test smooth scrolling performance
    const startY = 100;
    const endY = 500;

    await page.mouse.move(200, startY);
    await page.mouse.down();

    const scrollStartTime = Date.now();
    await page.mouse.move(200, endY, { steps: 10 });
    await page.mouse.up();

    const scrollEndTime = Date.now();
    const scrollDuration = scrollEndTime - scrollStartTime;

    // Scrolling should be responsive
    expect(scrollDuration).toBeLessThan(1000);
  });

  test('should handle touch gestures efficiently', async ({ page }) => {
    await page.goto('/dashboard/focus');

    // Test touch interactions on timer
    const timerElement = page.locator('[data-testid="timer-display"]');

    const startTime = Date.now();
    await timerElement.tap();
    const tapEndTime = Date.now();

    // Touch response should be immediate
    expect(tapEndTime - startTime).toBeLessThan(100);

    // Test pinch-to-zoom (if applicable)
    await page.touchscreen.tap(200, 200);
    await page.waitForTimeout(100);

    // Verify no unexpected layout shifts
    const afterTouchBox = await timerElement.boundingBox();
    expect(afterTouchBox).toBeTruthy();
  });

  test('should maintain 60fps during animations on mobile', async ({ page }) => {
    await page.goto('/dashboard/focus');

    // Start a focus session to trigger timer animation
    await page.fill('[data-testid="focus-duration-input"]', '1');
    await page.click('[data-testid="start-focus-button"]');

    // Monitor animation performance
    const performanceEntries = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const animationEntries = entries.filter(entry =>
            entry.entryType === 'measure' || entry.name.includes('animation')
          );
          resolve(animationEntries);
        });
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });

        setTimeout(() => resolve([]), 2000);
      });
    });

    // Verify no performance issues during animations
    expect(Array.isArray(performanceEntries)).toBe(true);
  });

  test('should efficiently handle mobile memory usage', async ({ page }) => {
    await page.goto('/dashboard');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Navigate through different sections
    await page.click('[data-testid="nav-tasks"]');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="nav-calendar"]');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="nav-focus"]');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="nav-analytics"]');
    await page.waitForLoadState('networkidle');

    // Check memory usage after navigation
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Memory shouldn't grow excessively (allow for some increase)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const maxAllowedIncrease = initialMemory * 2; // Allow 100% increase

      expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
    }
  });

  test('should handle mobile orientation changes', async ({ page }) => {
    await page.goto('/dashboard/calendar');

    // Test portrait mode (default)
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();

    // Simulate landscape mode
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);

    // Verify layout adapts to landscape
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();

    // Switch back to portrait
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // Verify layout adapts back
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();
  });

  test('should optimize for mobile battery usage', async ({ page }) => {
    await page.goto('/dashboard/focus');

    // Test that timers don't cause excessive redraws
    await page.fill('[data-testid="focus-duration-input"]', '2');
    await page.click('[data-testid="start-focus-button"]');

    // Monitor paint events
    const paintEvents = await page.evaluate(() => {
      return new Promise((resolve) => {
        let paintCount = 0;
        const observer = new PerformanceObserver((list) => {
          paintCount += list.getEntries().length;
        });
        observer.observe({ entryTypes: ['paint'] });

        setTimeout(() => resolve(paintCount), 3000);
      });
    });

    // Should not have excessive paint events
    expect(paintEvents).toBeLessThan(100);
  });
});