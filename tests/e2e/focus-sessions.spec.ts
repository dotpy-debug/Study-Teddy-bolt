import { test, expect } from '@playwright/test';

test.describe('Focus Sessions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/focus');
  });

  test('should start a focus session', async ({ page }) => {
    // Set focus duration
    await page.fill('[data-testid="focus-duration-input"]', '25');

    // Select session type
    await page.selectOption('[data-testid="session-type-select"]', 'pomodoro');

    // Start session
    await page.click('[data-testid="start-focus-button"]');

    // Verify session started
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-status"]')).toHaveText('In Progress');
  });

  test('should pause and resume focus session', async ({ page }) => {
    // Start a session first
    await page.fill('[data-testid="focus-duration-input"]', '25');
    await page.click('[data-testid="start-focus-button"]');

    // Wait for session to start
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();

    // Pause session
    await page.click('[data-testid="pause-focus-button"]');
    await expect(page.locator('[data-testid="session-status"]')).toHaveText('Paused');

    // Resume session
    await page.click('[data-testid="resume-focus-button"]');
    await expect(page.locator('[data-testid="session-status"]')).toHaveText('In Progress');
  });

  test('should stop focus session', async ({ page }) => {
    // Start a session
    await page.fill('[data-testid="focus-duration-input"]', '25');
    await page.click('[data-testid="start-focus-button"]');

    // Stop session
    await page.click('[data-testid="stop-focus-button"]');

    // Confirm stopping
    await page.click('[data-testid="confirm-stop-button"]');

    // Verify session stopped
    await expect(page.locator('[data-testid="session-status"]')).toHaveText('Stopped');
  });

  test('should complete a focus session', async ({ page }) => {
    // Start a very short session for testing (1 minute)
    await page.fill('[data-testid="focus-duration-input"]', '1');
    await page.click('[data-testid="start-focus-button"]');

    // Wait for session to complete (with some buffer time)
    await page.waitForSelector('[data-testid="session-complete-modal"]', { timeout: 70000 });

    // Verify completion modal appears
    await expect(page.locator('[data-testid="session-complete-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-message"]')).toContainText('completed');

    // Close completion modal
    await page.click('[data-testid="close-completion-modal"]');
  });

  test('should track session statistics', async ({ page }) => {
    // Navigate to statistics
    await page.click('[data-testid="focus-stats-tab"]');

    // Verify statistics are displayed
    await expect(page.locator('[data-testid="total-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-focus-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-session-length"]')).toBeVisible();
  });

  test('should set session goals', async ({ page }) => {
    // Navigate to goals section
    await page.click('[data-testid="focus-goals-tab"]');

    // Set daily goal
    await page.fill('[data-testid="daily-goal-input"]', '120');
    await page.click('[data-testid="save-daily-goal-button"]');

    // Set weekly goal
    await page.fill('[data-testid="weekly-goal-input"]', '600');
    await page.click('[data-testid="save-weekly-goal-button"]');

    // Verify goals are saved
    await expect(page.locator('[data-testid="daily-goal-display"]')).toHaveText('120 minutes');
    await expect(page.locator('[data-testid="weekly-goal-display"]')).toHaveText('600 minutes');
  });

  test('should customize focus session settings', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="focus-settings-tab"]');

    // Enable notifications
    await page.check('[data-testid="notifications-enabled-checkbox"]');

    // Set break reminder
    await page.check('[data-testid="break-reminder-checkbox"]');
    await page.fill('[data-testid="break-duration-input"]', '5');

    // Set custom sounds
    await page.selectOption('[data-testid="start-sound-select"]', 'chime');
    await page.selectOption('[data-testid="end-sound-select"]', 'bell');

    // Save settings
    await page.click('[data-testid="save-settings-button"]');

    // Verify settings saved
    await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
  });

  test('should handle session with background noise', async ({ page }) => {
    // Select background noise
    await page.click('[data-testid="background-noise-button"]');
    await page.selectOption('[data-testid="noise-type-select"]', 'rain');

    // Start session with background noise
    await page.fill('[data-testid="focus-duration-input"]', '5');
    await page.click('[data-testid="start-focus-button"]');

    // Verify audio controls are visible
    await expect(page.locator('[data-testid="audio-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume-slider"]')).toBeVisible();
  });

  test('should integrate with task selection', async ({ page }) => {
    // Select a task for the focus session
    await page.click('[data-testid="select-task-button"]');
    await page.click('[data-testid="task-option"]:first-child');

    // Verify task is selected
    await expect(page.locator('[data-testid="selected-task-display"]')).toBeVisible();

    // Start session with selected task
    await page.fill('[data-testid="focus-duration-input"]', '25');
    await page.click('[data-testid="start-focus-button"]');

    // Verify task progress tracking
    await expect(page.locator('[data-testid="task-progress-indicator"]')).toBeVisible();
  });
});