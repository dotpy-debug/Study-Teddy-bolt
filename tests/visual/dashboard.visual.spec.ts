import { test, expect } from '@playwright/test';

test.describe('Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Hide dynamic content that changes frequently
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="last-login"],
        [data-testid="notification-timestamp"],
        [data-testid="real-time-chart"],
        .animation,
        .animated {
          visibility: hidden !important;
        }

        /* Stabilize charts and dynamic content */
        canvas {
          filter: grayscale(1) !important;
        }
      `
    });
  });

  test('dashboard overview desktop', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-overview-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard tasks view', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-tasks-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard calendar view', async ({ page }) => {
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-calendar-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard focus session view', async ({ page }) => {
    await page.goto('/dashboard/focus');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-focus-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard analytics view', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for charts to load
    await page.waitForSelector('[data-testid="analytics-chart"]', { timeout: 10000 });

    await expect(page).toHaveScreenshot('dashboard-analytics-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard sidebar collapsed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Collapse sidebar
    await page.click('[data-testid="sidebar-toggle"]');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('dashboard-sidebar-collapsed.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard with modal open', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    await page.waitForLoadState('networkidle');

    // Open create task modal
    await page.click('[data-testid="create-task-button"]');
    await page.waitForSelector('[data-testid="task-modal"]');

    await expect(page).toHaveScreenshot('dashboard-create-task-modal.png', {
      animations: 'disabled'
    });
  });

  test('dashboard empty states', async ({ page }) => {
    // Mock empty state by adding CSS to hide content
    await page.goto('/dashboard/tasks');
    await page.addStyleTag({
      content: `
        [data-testid="task-item"] {
          display: none !important;
        }
      `
    });

    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-tasks-empty.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dashboard loading states', async ({ page }) => {
    // Intercept API calls to create loading state
    await page.route('**/api/tasks', route => {
      // Delay response to capture loading state
      setTimeout(() => route.continue(), 2000);
    });

    await page.goto('/dashboard/tasks');

    // Capture loading state
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-tasks-loading.png', {
      animations: 'disabled'
    });
  });
});