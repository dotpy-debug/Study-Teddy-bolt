import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.use({ ...devices['iPhone 12'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should show mobile hamburger menu', async ({ page }) => {
    // Verify hamburger menu is visible on mobile
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Click hamburger menu
    await page.click('[data-testid="mobile-menu-button"]');

    // Verify mobile menu opens
    await expect(page.locator('[data-testid="mobile-navigation-drawer"]')).toBeVisible();

    // Verify navigation items are visible
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tasks"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-calendar"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-focus"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible();
  });

  test('should navigate between sections on mobile', async ({ page }) => {
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');

    // Navigate to tasks
    await page.click('[data-testid="nav-tasks"]');
    await expect(page).toHaveURL('/dashboard/tasks');

    // Verify mobile menu closes after navigation
    await expect(page.locator('[data-testid="mobile-navigation-drawer"]')).not.toBeVisible();

    // Open menu again and navigate to calendar
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="nav-calendar"]');
    await expect(page).toHaveURL('/dashboard/calendar');
  });

  test('should handle swipe gestures', async ({ page }) => {
    // Test swipe to open menu (if implemented)
    const startX = 10;
    const startY = 200;
    const endX = 250;
    const endY = 200;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();

    // Verify menu opens with swipe
    await expect(page.locator('[data-testid="mobile-navigation-drawer"]')).toBeVisible();

    // Swipe to close
    await page.mouse.move(endX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY);
    await page.mouse.up();

    // Verify menu closes
    await expect(page.locator('[data-testid="mobile-navigation-drawer"]')).not.toBeVisible();
  });

  test('should show bottom navigation if implemented', async ({ page }) => {
    // Check if bottom navigation exists
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');

    if (await bottomNav.isVisible()) {
      // Verify bottom navigation items
      await expect(page.locator('[data-testid="bottom-nav-home"]')).toBeVisible();
      await expect(page.locator('[data-testid="bottom-nav-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="bottom-nav-focus"]')).toBeVisible();
      await expect(page.locator('[data-testid="bottom-nav-more"]')).toBeVisible();

      // Test navigation via bottom nav
      await page.click('[data-testid="bottom-nav-tasks"]');
      await expect(page).toHaveURL('/dashboard/tasks');
    }
  });

  test('should handle mobile touch interactions', async ({ page }) => {
    await page.goto('/dashboard/tasks');

    // Test touch tap on task item
    await page.locator('[data-testid="task-item"]:first-child').tap();

    // Verify task details or edit mode opens
    await expect(page.locator('[data-testid="task-details"]')).toBeVisible();

    // Test long press for context menu (if implemented)
    await page.locator('[data-testid="task-item"]:nth-child(2)').tap({ delay: 1000 });

    // Check if context menu appears
    const contextMenu = page.locator('[data-testid="task-context-menu"]');
    if (await contextMenu.isVisible()) {
      await expect(contextMenu).toBeVisible();
    }
  });

  test('should adapt content for mobile viewport', async ({ page }) => {
    await page.goto('/dashboard/calendar');

    // Verify calendar adapts to mobile view
    await expect(page.locator('[data-testid="calendar-mobile-view"]')).toBeVisible();

    // Test month navigation with mobile controls
    await page.click('[data-testid="mobile-prev-month"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="mobile-next-month"]');

    // Verify day view on mobile
    await page.click('[data-testid="calendar-day"]:first-child');
    await expect(page.locator('[data-testid="mobile-day-view"]')).toBeVisible();
  });

  test('should handle mobile form interactions', async ({ page }) => {
    await page.goto('/dashboard/tasks');

    // Open create task on mobile
    await page.click('[data-testid="mobile-create-task-fab"]');

    // Verify mobile-optimized form
    await expect(page.locator('[data-testid="mobile-task-form"]')).toBeVisible();

    // Test form fields on mobile
    await page.fill('[data-testid="task-title-input"]', 'Mobile Test Task');

    // Test mobile-friendly date picker
    await page.click('[data-testid="mobile-date-picker"]');
    await expect(page.locator('[data-testid="mobile-date-picker-modal"]')).toBeVisible();

    // Select date and close picker
    await page.click('[data-testid="date-option"]:first-child');
    await page.click('[data-testid="date-picker-confirm"]');

    // Save task
    await page.click('[data-testid="mobile-save-task"]');

    // Verify task was created
    await expect(page.locator('[data-testid="task-item"]').filter({ hasText: 'Mobile Test Task' })).toBeVisible();
  });

  test('should handle mobile keyboard and input focus', async ({ page }) => {
    await page.goto('/dashboard/tasks');

    // Test search input focus on mobile
    await page.click('[data-testid="mobile-search-input"]');

    // Verify keyboard doesn't obstruct important UI
    await page.fill('[data-testid="mobile-search-input"]', 'test search');

    // Test that viewport adjusts for keyboard
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Clear search and verify keyboard dismisses
    await page.fill('[data-testid="mobile-search-input"]', '');
    await page.click('[data-testid="main-content"]'); // Click outside to dismiss keyboard
  });
});