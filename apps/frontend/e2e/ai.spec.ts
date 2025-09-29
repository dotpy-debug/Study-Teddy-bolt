import { test, expect } from '@playwright/test';

test.describe('AI Tutor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai');
  });

  test('loads AI page and components', async ({ page }) => {
    await expect(page.getByText('AI Tutor')).toBeVisible();
    await expect(page.getByPlaceholder('Ask a question...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
  });

  test('sends a message and shows AI response (mocked)', async ({ page }) => {
    await page.route('**/ai/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'chat-1', aiResponse: 'Hello! How can I help you study today?' })
      });
    });

    await page.getByPlaceholder('Ask a question...').fill('Explain photosynthesis');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Explain photosynthesis')).toBeVisible();
    await expect(page.getByText('Hello! How can I help you study today?')).toBeVisible();
  });

  test('exports history (mocked)', async ({ page }) => {
    await page.route('**/ai/export?format=json', async (route) => {
      const data = JSON.stringify([{ id: '1', message: 'Hi', aiResponse: 'Hello' }]);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: data
      });
    });

    await page.getByRole('button', { name: 'Export JSON' }).click();
    // We can't assert file system, but button should be clickable without errors
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeEnabled();
  });
});


