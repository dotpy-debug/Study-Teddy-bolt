// Global setup for Playwright tests
import { chromium, FullConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.test' });

async function globalSetup(config: FullConfig) {
  const { baseURL = 'http://localhost:3000' } = config.projects[0].use;

  // Create a test user for authenticated tests
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Setting up test environment...');

    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if we can access the login form
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible()) {
      console.log('Login form found, proceeding with test user creation...');

      // Register a test user if needed
      try {
        await page.goto(`${baseURL}/register`);
        await page.fill('[name="email"]', 'e2e-test@example.com');
        await page.fill('[name="password"]', 'TestPassword123!');
        await page.fill('[name="firstName"]', 'E2E');
        await page.fill('[name="lastName"]', 'Test');
        await page.click('button[type="submit"]');

        // Wait for registration to complete
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('Test user registered successfully');
      } catch (error) {
        console.log('Test user might already exist, proceeding with login...');
      }

      // Login with test user
      await page.goto(`${baseURL}/login`);
      await page.fill('[name="email"]', 'e2e-test@example.com');
      await page.fill('[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Wait for login to complete
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Save authentication state
      await page.context().storageState({ path: 'playwright/.auth/user.json' });
      console.log('Authentication state saved');
    } else {
      console.log('Login form not found, creating anonymous auth state...');
      await page.context().storageState({ path: 'playwright/.auth/user.json' });
    }
  } catch (error) {
    console.error('Error during global setup:', error);
    // Create empty auth state as fallback
    await page.context().storageState({ path: 'playwright/.auth/user.json' });
  } finally {
    await browser.close();
  }

  console.log('Global setup completed');
}

export default globalSetup;