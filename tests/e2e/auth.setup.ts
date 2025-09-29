import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to the login page
  await page.goto('/auth/signin');

  // Fill in the login form
  await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@studyteddy.com');
  await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword123');

  // Click the login button
  await page.click('[data-testid="signin-button"]');

  // Wait for successful authentication
  await page.waitForURL('/dashboard');

  // Verify we're logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
});