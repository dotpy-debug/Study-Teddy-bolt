import { test, expect } from '@playwright/test';

test.describe('Calendar Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/calendar');
  });

  test('should display calendar view', async ({ page }) => {
    // Verify calendar is loaded
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-header"]')).toBeVisible();

    // Verify current month is displayed
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    await expect(page.locator('[data-testid="calendar-month-year"]')).toContainText(currentMonth);
  });

  test('should navigate between months', async ({ page }) => {
    // Click next month
    await page.click('[data-testid="next-month-button"]');

    // Verify month changed
    await page.waitForTimeout(300);
    const nextMonthButton = page.locator('[data-testid="calendar-month-year"]');
    const nextMonthText = await nextMonthButton.textContent();

    // Click previous month twice to go back
    await page.click('[data-testid="prev-month-button"]');
    await page.click('[data-testid="prev-month-button"]');

    await page.waitForTimeout(300);
    const prevMonthText = await nextMonthButton.textContent();

    expect(nextMonthText).not.toBe(prevMonthText);
  });

  test('should create a calendar event', async ({ page }) => {
    // Click on a specific date
    await page.click('[data-testid="calendar-day"]:nth-child(15)');

    // Fill event form
    await page.fill('[data-testid="event-title-input"]', 'Study Session');
    await page.fill('[data-testid="event-description-input"]', 'Math homework review');
    await page.fill('[data-testid="event-start-time"]', '09:00');
    await page.fill('[data-testid="event-end-time"]', '10:30');

    // Select event type
    await page.selectOption('[data-testid="event-type-select"]', 'study');

    // Save event
    await page.click('[data-testid="save-event-button"]');

    // Verify event appears on calendar
    await expect(page.locator('[data-testid="calendar-event"]').filter({ hasText: 'Study Session' })).toBeVisible();
  });

  test('should edit an existing event', async ({ page }) => {
    // Click on an existing event
    await page.click('[data-testid="calendar-event"]:first-child');

    // Edit event details
    await page.fill('[data-testid="event-title-input"]', 'Updated Study Session');
    await page.fill('[data-testid="event-description-input"]', 'Physics homework review');

    // Save changes
    await page.click('[data-testid="save-event-button"]');

    // Verify event was updated
    await expect(page.locator('[data-testid="calendar-event"]').filter({ hasText: 'Updated Study Session' })).toBeVisible();
  });

  test('should delete a calendar event', async ({ page }) => {
    // Get initial event count
    const initialEventCount = await page.locator('[data-testid="calendar-event"]').count();

    // Click on an event to open it
    await page.click('[data-testid="calendar-event"]:first-child');

    // Delete event
    await page.click('[data-testid="delete-event-button"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-event-button"]');

    // Verify event was deleted
    const newEventCount = await page.locator('[data-testid="calendar-event"]').count();
    expect(newEventCount).toBe(initialEventCount - 1);
  });

  test('should switch between calendar views', async ({ page }) => {
    // Test month view (default)
    await expect(page.locator('[data-testid="calendar-month-view"]')).toBeVisible();

    // Switch to week view
    await page.click('[data-testid="week-view-button"]');
    await expect(page.locator('[data-testid="calendar-week-view"]')).toBeVisible();

    // Switch to day view
    await page.click('[data-testid="day-view-button"]');
    await expect(page.locator('[data-testid="calendar-day-view"]')).toBeVisible();

    // Switch back to month view
    await page.click('[data-testid="month-view-button"]');
    await expect(page.locator('[data-testid="calendar-month-view"]')).toBeVisible();
  });

  test('should sync with external calendar', async ({ page }) => {
    // Navigate to calendar settings
    await page.click('[data-testid="calendar-settings-button"]');

    // Connect Google Calendar
    await page.click('[data-testid="connect-google-calendar"]');

    // Mock OAuth flow (in real tests, you'd need to handle OAuth)
    // For now, we'll verify the button click triggers the right flow
    await expect(page).toHaveURL(/calendar\/connect/);
  });

  test('should filter events by type', async ({ page }) => {
    // Click filter button
    await page.click('[data-testid="event-filter-button"]');

    // Filter by study events only
    await page.uncheck('[data-testid="filter-meetings-checkbox"]');
    await page.uncheck('[data-testid="filter-personal-checkbox"]');
    await page.check('[data-testid="filter-study-checkbox"]');

    // Apply filter
    await page.click('[data-testid="apply-filter-button"]');

    // Verify only study events are visible
    const visibleEvents = page.locator('[data-testid="calendar-event"]:visible');
    const count = await visibleEvents.count();

    for (let i = 0; i < count; i++) {
      const eventType = await visibleEvents.nth(i).getAttribute('data-event-type');
      expect(eventType).toBe('study');
    }
  });

  test('should handle recurring events', async ({ page }) => {
    // Click on a date to create event
    await page.click('[data-testid="calendar-day"]:nth-child(10)');

    // Fill event details
    await page.fill('[data-testid="event-title-input"]', 'Weekly Study Group');
    await page.fill('[data-testid="event-start-time"]', '14:00');
    await page.fill('[data-testid="event-end-time"]', '16:00');

    // Set as recurring
    await page.check('[data-testid="recurring-event-checkbox"]');
    await page.selectOption('[data-testid="recurrence-pattern-select"]', 'weekly');
    await page.fill('[data-testid="recurrence-end-date"]', '2024-12-31');

    // Save event
    await page.click('[data-testid="save-event-button"]');

    // Verify recurring events appear
    await expect(page.locator('[data-testid="calendar-event"][data-recurring="true"]')).toHaveCount(4, { timeout: 10000 });
  });

  test('should show event reminders', async ({ page }) => {
    // Create an event with reminder
    await page.click('[data-testid="calendar-day"]:nth-child(5)');
    await page.fill('[data-testid="event-title-input"]', 'Important Meeting');

    // Set reminder
    await page.check('[data-testid="event-reminder-checkbox"]');
    await page.selectOption('[data-testid="reminder-time-select"]', '15'); // 15 minutes before

    await page.click('[data-testid="save-event-button"]');

    // Verify reminder is set
    const eventWithReminder = page.locator('[data-testid="calendar-event"]').filter({ hasText: 'Important Meeting' });
    await expect(eventWithReminder.locator('[data-testid="reminder-indicator"]')).toBeVisible();
  });

  test('should integrate with task deadlines', async ({ page }) => {
    // Verify tasks with deadlines appear on calendar
    await expect(page.locator('[data-testid="task-deadline-event"]')).toBeVisible();

    // Click on a task deadline
    await page.click('[data-testid="task-deadline-event"]:first-child');

    // Verify task details modal opens
    await expect(page.locator('[data-testid="task-details-modal"]')).toBeVisible();

    // Verify link to task
    await page.click('[data-testid="view-task-button"]');
    await expect(page).toHaveURL(/dashboard\/tasks/);
  });
});