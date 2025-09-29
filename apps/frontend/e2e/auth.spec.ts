import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication state
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login form correctly', async ({ page }) => {
    await page.goto('/login');

    // Check form elements
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByText('Sign in to your Study Teddy account')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Forgot your password?')).toBeVisible();
    await expect(page.getByText('Don\'t have an account?')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Please fill in all fields')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should handle login with valid credentials', async ({ page }) => {
    // Mock successful login response
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            authProvider: 'local',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle login errors', async ({ page }) => {
    // Mock failed login response
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid credentials',
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');

    await page.getByText('Sign up').click();

    await expect(page).toHaveURL('/register');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    await page.getByText('Forgot your password?').click();

    await expect(page).toHaveURL('/forgot-password');
  });

  test('should display registration form correctly', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('should handle registration with valid data', async ({ page }) => {
    // Mock successful registration response
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: '1',
            email: 'newuser@example.com',
            name: 'New User',
            authProvider: 'local',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        }),
      });
    });

    await page.goto('/register');

    await page.getByLabel('Name').fill('New User');
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle registration errors', async ({ page }) => {
    // Mock failed registration response
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User already exists',
        }),
      });
    });

    await page.goto('/register');

    await page.getByLabel('Name').fill('Existing User');
    await page.getByLabel('Email').fill('existing@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('User already exists')).toBeVisible();
  });

  test('should show loading state during authentication', async ({ page }) => {
    // Mock slow login response
    await page.route('**/auth/login', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    
    const submitButton = page.getByRole('button', { name: 'Sign in' });
    await submitButton.click();

    // Should show loading state
    await expect(page.getByText('Signing in...')).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test('should handle logout', async ({ page }) => {
    // First, simulate being logged in
    await page.goto('/login');
    
    // Mock successful login
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      });
    });

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/dashboard');

    // Mock logout response
    await page.route('**/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Logged out successfully',
        }),
      });
    });

    // Find and click logout button (assuming it's in a menu or header)
    await page.getByRole('button', { name: /logout|sign out/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Mock successful login
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/dashboard');

    // Reload the page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle session expiration', async ({ page }) => {
    // First login successfully
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/dashboard');

    // Mock expired session response
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Token expired',
        }),
      });
    });

    // Try to access a protected resource
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});