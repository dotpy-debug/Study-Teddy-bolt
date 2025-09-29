import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow user to sign up', async ({ page }) => {
    await page.click('[data-testid="signup-link"]');
    await expect(page).toHaveURL('/auth/signup');

    // Fill signup form
    await page.fill('[data-testid="email-input"]', `test+${Date.now()}@studyteddy.com`);
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="name-input"]', 'Test User');

    // Submit form
    await page.click('[data-testid="signup-button"]');

    // Should redirect to email verification or dashboard
    await page.waitForURL(/\/(verify-email|dashboard)/);
  });

  test('should allow user to sign in', async ({ page }) => {
    await page.click('[data-testid="signin-link"]');
    await expect(page).toHaveURL('/auth/signin');

    // Fill signin form
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@studyteddy.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword123');

    // Submit form
    await page.click('[data-testid="signin-button"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    await page.click('[data-testid="signin-link"]');

    // Try to submit empty form
    await page.click('[data-testid="signin-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.click('[data-testid="signin-link"]');
    await page.click('[data-testid="forgot-password-link"]');

    await expect(page).toHaveURL('/auth/forgot-password');

    // Fill email
    await page.fill('[data-testid="email-input"]', 'test@studyteddy.com');
    await page.click('[data-testid="reset-password-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible();
  });

  test('should allow user to sign out', async ({ page }) => {
    // Sign in first
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@studyteddy.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('/dashboard');

    // Sign out
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="signout-button"]');

    // Should redirect to home page
    await page.waitForURL('/');
    await expect(page.locator('[data-testid="signin-link"]')).toBeVisible();
  });
});