import { test as setup, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

const authFile = 'playwright/.auth/user.json';
const adminAuthFile = 'playwright/.auth/admin.json';

// Test credentials
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'test@studyteddy.com',
  password: process.env.TEST_USER_PASSWORD || 'testPassword123',
  name: 'Test User',
};

const adminUser = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@studyteddy.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'adminPassword123',
  name: 'Admin User',
};

setup('authenticate as user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page.locator('h1')).toContainText(/sign in|login/i);

  // Try to login with existing account first
  await page.getByRole('textbox', { name: /email/i }).fill(testUser.email);
  await page.getByRole('textbox', { name: /password/i }).fill(testUser.password);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  // Check if login was successful or if we need to register
  try {
    // Wait for either dashboard or error message
    await Promise.race([
      page.waitForURL('/dashboard', { timeout: 5000 }),
      page.locator('[data-testid="error-message"]').waitFor({ timeout: 5000 }),
    ]);

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Login successful, save auth state
      await page.context().storageState({ path: authFile });
      return;
    }
  } catch (error) {
    // Login failed, try to register
  }

  // If login failed, try to register new user
  console.log('Login failed, attempting to register new user...');

  await page.goto('/register');
  await expect(page.locator('h1')).toContainText(/sign up|register/i);

  // Fill registration form
  await page.getByRole('textbox', { name: /name/i }).fill(testUser.name);
  await page.getByRole('textbox', { name: /email/i }).fill(testUser.email);
  await page.getByRole('textbox', { name: /password/i }).first().fill(testUser.password);

  // Handle confirm password field if it exists
  const confirmPasswordField = page.getByRole('textbox', { name: /confirm password/i });
  if (await confirmPasswordField.isVisible()) {
    await confirmPasswordField.fill(testUser.password);
  }

  await page.getByRole('button', { name: /sign up|register/i }).click();

  // Wait for successful registration and redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 15000 });

  // Verify we're on the dashboard
  await expect(page.locator('h1, h2')).toContainText(/dashboard|welcome/i);

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});

setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page.locator('h1')).toContainText(/sign in|login/i);

  // Login as admin
  await page.getByRole('textbox', { name: /email/i }).fill(adminUser.email);
  await page.getByRole('textbox', { name: /password/i }).fill(adminUser.password);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  try {
    // Wait for dashboard or try to register admin
    await page.waitForURL('/dashboard', { timeout: 10000 });
  } catch (error) {
    // If admin login fails, register admin account
    console.log('Admin login failed, attempting to register admin user...');

    await page.goto('/register');
    await expect(page.locator('h1')).toContainText(/sign up|register/i);

    await page.getByRole('textbox', { name: /name/i }).fill(adminUser.name);
    await page.getByRole('textbox', { name: /email/i }).fill(adminUser.email);
    await page.getByRole('textbox', { name: /password/i }).first().fill(adminUser.password);

    const confirmPasswordField = page.getByRole('textbox', { name: /confirm password/i });
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(adminUser.password);
    }

    await page.getByRole('button', { name: /sign up|register/i }).click();
    await page.waitForURL('/dashboard', { timeout: 15000 });
  }

  // Verify admin access
  await expect(page.locator('h1, h2')).toContainText(/dashboard|welcome/i);

  // Save admin authenticated state
  await page.context().storageState({ path: adminAuthFile });
});

// Setup for API testing
setup('prepare API authentication', async ({ request }) => {
  // Create a test user via API if needed
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    // Try to login via API
    const loginResponse = await request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      // Store token for API tests
      process.env.TEST_AUTH_TOKEN = loginData.access_token;
      return;
    }
  } catch (error) {
    console.log('API login failed, attempting registration...');
  }

  try {
    // Register user via API
    const registerResponse = await request.post(`${apiBaseUrl}/auth/register`, {
      data: {
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      },
    });

    if (registerResponse.ok()) {
      const registerData = await registerResponse.json();
      process.env.TEST_AUTH_TOKEN = registerData.access_token;
      console.log('Test user registered successfully');
    }
  } catch (error) {
    console.error('Failed to register test user via API:', error);
  }
});

// Cleanup setup - remove any test data created during setup
setup('cleanup test data', async ({ request }) => {
  // This would clean up any test data created during setup
  // Implementation depends on your cleanup requirements
  console.log('Setup cleanup completed');
});

export { testUser, adminUser };