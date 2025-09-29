import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test('homepage desktop layout', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Hide dynamic elements that change frequently
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="user-avatar"],
        .animation,
        .animated {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('homepage mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="user-avatar"],
        .animation,
        .animated {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('homepage tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="user-avatar"],
        .animation,
        .animated {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('homepage dark mode', async ({ page }) => {
    await page.goto('/');

    // Switch to dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // Wait for theme transition

    await page.waitForLoadState('networkidle');

    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="user-avatar"],
        .animation,
        .animated {
          visibility: hidden !important;
        }
      `
    });

    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});