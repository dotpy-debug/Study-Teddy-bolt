import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('User Journey - Task Management', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('complete task creation and management flow', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2')).toContainText(/dashboard|welcome/i);

    // Navigate to tasks page
    await page.getByRole('link', { name: /tasks/i }).click();
    await page.waitForURL('/tasks');

    // Create a new task
    const taskTitle = `Test Task ${faker.number.int({ min: 1000, max: 9999 })}`;
    const taskDescription = faker.lorem.sentence();

    await page.getByRole('button', { name: /add task|new task|create task/i }).click();

    // Fill task form
    await page.getByRole('textbox', { name: /title/i }).fill(taskTitle);
    await page.getByRole('textbox', { name: /description/i }).fill(taskDescription);

    // Set priority
    const priorityDropdown = page.getByRole('combobox', { name: /priority/i });
    if (await priorityDropdown.isVisible()) {
      await priorityDropdown.click();
      await page.getByRole('option', { name: /high/i }).click();
    }

    // Set due date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateInput = page.getByRole('textbox', { name: /due date/i });
    if (await dueDateInput.isVisible()) {
      await dueDateInput.fill(tomorrow.toISOString().split('T')[0]);
    }

    // Submit form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Verify task appears in the list
    await expect(page.locator('text=' + taskTitle)).toBeVisible();
    await expect(page.locator('text=' + taskDescription)).toBeVisible();

    // Update task progress
    const taskCard = page.locator(`[data-testid="task-card"]`).filter({ hasText: taskTitle });
    await taskCard.getByRole('button', { name: /edit|update/i }).click();

    // Update progress to 50%
    const progressSlider = page.getByRole('slider', { name: /progress/i });
    if (await progressSlider.isVisible()) {
      await progressSlider.fill('50');
    } else {
      // Alternative: progress input field
      const progressInput = page.getByRole('spinbutton', { name: /progress/i });
      if (await progressInput.isVisible()) {
        await progressInput.fill('50');
      }
    }

    await page.getByRole('button', { name: /save|update/i }).click();

    // Verify progress update
    await expect(taskCard.locator('text=50%')).toBeVisible();

    // Mark task as completed
    await taskCard.getByRole('button', { name: /complete|mark complete/i }).click();

    // Verify task is marked as completed
    await expect(taskCard.locator('[data-status="completed"]')).toBeVisible();

    // Filter to show only completed tasks
    const filterDropdown = page.getByRole('combobox', { name: /filter|status/i });
    if (await filterDropdown.isVisible()) {
      await filterDropdown.click();
      await page.getByRole('option', { name: /completed/i }).click();
    }

    // Verify only completed tasks are shown
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();

    // Delete the test task
    await taskCard.getByRole('button', { name: /delete|remove/i }).click();

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify task is removed
    await expect(page.locator(`text=${taskTitle}`)).not.toBeVisible();
  });

  test('focus session workflow', async ({ page }) => {
    // Navigate to focus sessions
    await page.goto('/focus');
    await expect(page.locator('h1, h2')).toContainText(/focus|pomodoro/i);

    // Start a new focus session
    await page.getByRole('button', { name: /start session|new session/i }).click();

    // Configure session
    const sessionTitle = `Focus Session ${faker.number.int({ min: 100, max: 999 })}`;
    await page.getByRole('textbox', { name: /title|session name/i }).fill(sessionTitle);

    // Set duration (25 minutes - Pomodoro)
    const durationSelect = page.getByRole('combobox', { name: /duration|time/i });
    if (await durationSelect.isVisible()) {
      await durationSelect.click();
      await page.getByRole('option', { name: /25|pomodoro/i }).click();
    }

    // Select focus type
    const typeSelect = page.getByRole('combobox', { name: /type|category/i });
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await page.getByRole('option', { name: /study|work/i }).click();
    }

    // Start the session
    await page.getByRole('button', { name: /start|begin/i }).click();

    // Verify session is active
    await expect(page.locator('[data-testid="timer"]')).toBeVisible();
    await expect(page.locator('text=' + sessionTitle)).toBeVisible();

    // Check timer is counting down
    const timerElement = page.locator('[data-testid="timer"]');
    const initialTime = await timerElement.textContent();

    // Wait a moment and check time has changed
    await page.waitForTimeout(2000);
    const updatedTime = await timerElement.textContent();
    expect(initialTime).not.toBe(updatedTime);

    // Pause the session
    await page.getByRole('button', { name: /pause/i }).click();
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

    // Resume the session
    await page.getByRole('button', { name: /resume/i }).click();
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();

    // End the session early
    await page.getByRole('button', { name: /stop|end/i }).click();

    // Fill session feedback
    const productivityRating = page.getByRole('slider', { name: /productivity/i });
    if (await productivityRating.isVisible()) {
      await productivityRating.fill('4');
    }

    const focusRating = page.getByRole('slider', { name: /focus/i });
    if (await focusRating.isVisible()) {
      await focusRating.fill('5');
    }

    // Add session notes
    const notesField = page.getByRole('textbox', { name: /notes|comments/i });
    if (await notesField.isVisible()) {
      await notesField.fill('Great focus session! Completed math homework.');
    }

    // Submit feedback
    await page.getByRole('button', { name: /submit|save/i }).click();

    // Verify session is saved to history
    await page.getByRole('link', { name: /history|sessions/i }).click();
    await expect(page.locator('text=' + sessionTitle)).toBeVisible();
  });

  test('subject management workflow', async ({ page }) => {
    // Navigate to subjects page
    await page.goto('/subjects');
    await expect(page.locator('h1, h2')).toContainText(/subjects|categories/i);

    // Create a new subject
    const subjectName = `Test Subject ${faker.number.int({ min: 100, max: 999 })}`;
    await page.getByRole('button', { name: /add subject|new subject/i }).click();

    // Fill subject form
    await page.getByRole('textbox', { name: /name|title/i }).fill(subjectName);

    // Choose a color
    const colorPicker = page.locator('[data-testid="color-picker"]');
    if (await colorPicker.isVisible()) {
      await colorPicker.click();
      await page.locator('[data-color="#3b82f6"]').click(); // Blue color
    }

    // Choose an icon
    const iconPicker = page.locator('[data-testid="icon-picker"]');
    if (await iconPicker.isVisible()) {
      await iconPicker.click();
      await page.locator('[data-icon="book"]').click();
    }

    // Save subject
    await page.getByRole('button', { name: /save|create/i }).click();

    // Verify subject appears in list
    await expect(page.locator('text=' + subjectName)).toBeVisible();

    // Edit the subject
    const subjectCard = page.locator('[data-testid="subject-card"]').filter({ hasText: subjectName });
    await subjectCard.getByRole('button', { name: /edit/i }).click();

    // Update name
    const updatedName = subjectName + ' Updated';
    await page.getByRole('textbox', { name: /name|title/i }).fill(updatedName);
    await page.getByRole('button', { name: /save|update/i }).click();

    // Verify update
    await expect(page.locator('text=' + updatedName)).toBeVisible();

    // Delete the subject
    const updatedSubjectCard = page.locator('[data-testid="subject-card"]').filter({ hasText: updatedName });
    await updatedSubjectCard.getByRole('button', { name: /delete|remove/i }).click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // Verify subject is removed
    await expect(page.locator('text=' + updatedName)).not.toBeVisible();
  });
});

test.describe('User Journey - AI Features', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('AI chat and study plan generation', async ({ page }) => {
    // Navigate to AI chat
    await page.goto('/ai-chat');
    await expect(page.locator('h1, h2')).toContainText(/ai|chat|teddy/i);

    // Ask a question
    const question = 'Explain the concept of derivatives in calculus';
    await page.getByRole('textbox', { name: /message|question/i }).fill(question);
    await page.getByRole('button', { name: /send|ask/i }).click();

    // Wait for AI response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=derivatives')).toBeVisible();

    // Generate practice questions
    await page.getByRole('button', { name: /practice questions|generate questions/i }).click();

    // Configure practice questions
    const subjectSelect = page.getByRole('combobox', { name: /subject/i });
    if (await subjectSelect.isVisible()) {
      await subjectSelect.click();
      await page.getByRole('option', { name: /mathematics|math/i }).click();
    }

    const difficultySelect = page.getByRole('combobox', { name: /difficulty/i });
    if (await difficultySelect.isVisible()) {
      await difficultySelect.click();
      await page.getByRole('option', { name: /medium/i }).click();
    }

    const questionCount = page.getByRole('spinbutton', { name: /number|count/i });
    if (await questionCount.isVisible()) {
      await questionCount.fill('5');
    }

    await page.getByRole('button', { name: /generate|create/i }).click();

    // Wait for questions to be generated
    await expect(page.locator('[data-testid="practice-questions"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=1.')).toBeVisible(); // First question

    // Generate study plan
    await page.getByRole('link', { name: /study plan/i }).click();
    await page.waitForURL('/ai/study-plan');

    const studyPlanSubject = `Advanced Calculus ${faker.number.int({ min: 100, max: 999 })}`;
    await page.getByRole('textbox', { name: /subject|topic/i }).fill(studyPlanSubject);

    const hoursPerWeek = page.getByRole('spinbutton', { name: /hours.*week/i });
    if (await hoursPerWeek.isVisible()) {
      await hoursPerWeek.fill('10');
    }

    const totalWeeks = page.getByRole('spinbutton', { name: /weeks|duration/i });
    if (await totalWeeks.isVisible()) {
      await totalWeeks.fill('8');
    }

    const skillLevel = page.getByRole('combobox', { name: /skill level|level/i });
    if (await skillLevel.isVisible()) {
      await skillLevel.click();
      await page.getByRole('option', { name: /intermediate/i }).click();
    }

    const goals = page.getByRole('textbox', { name: /goals|objectives/i });
    if (await goals.isVisible()) {
      await goals.fill('Master calculus concepts and prepare for advanced mathematics');
    }

    await page.getByRole('button', { name: /generate plan|create plan/i }).click();

    // Wait for study plan to be generated
    await expect(page.locator('[data-testid="study-plan"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Week 1')).toBeVisible();
    await expect(page.locator('text=' + studyPlanSubject)).toBeVisible();
  });
});

test.describe('User Journey - Dashboard and Analytics', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('dashboard overview and analytics', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2')).toContainText(/dashboard|welcome/i);

    // Check key dashboard elements
    await expect(page.locator('[data-testid="tasks-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="focus-time-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();

    // Check quick stats
    const tasksCount = page.locator('[data-testid="total-tasks"]');
    if (await tasksCount.isVisible()) {
      const count = await tasksCount.textContent();
      expect(count).toMatch(/\d+/); // Should contain numbers
    }

    const completedTasks = page.locator('[data-testid="completed-tasks"]');
    if (await completedTasks.isVisible()) {
      const completed = await completedTasks.textContent();
      expect(completed).toMatch(/\d+/);
    }

    // Check today's schedule
    const todaySchedule = page.locator('[data-testid="today-schedule"]');
    if (await todaySchedule.isVisible()) {
      await expect(todaySchedule.locator('h3, h4')).toContainText(/today|schedule/i);
    }

    // Navigate to analytics page
    await page.getByRole('link', { name: /analytics|reports|stats/i }).click();
    await page.waitForURL('/analytics');

    // Check analytics charts
    await expect(page.locator('[data-testid="productivity-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="focus-time-chart"]')).toBeVisible();

    // Change time range
    const timeRangeSelect = page.getByRole('combobox', { name: /time range|period/i });
    if (await timeRangeSelect.isVisible()) {
      await timeRangeSelect.click();
      await page.getByRole('option', { name: /last 30 days/i }).click();

      // Wait for charts to update
      await page.waitForTimeout(1000);
    }

    // Check subject breakdown
    const subjectBreakdown = page.locator('[data-testid="subject-breakdown"]');
    if (await subjectBreakdown.isVisible()) {
      await expect(subjectBreakdown.locator('h3, h4')).toContainText(/subject|breakdown/i);
    }

    // Export report
    const exportButton = page.getByRole('button', { name: /export|download/i });
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/report.*\.(pdf|csv|xlsx)$/i);
    }
  });

  test('profile and settings management', async ({ page }) => {
    // Navigate to profile settings
    await page.goto('/settings/profile');
    await expect(page.locator('h1, h2')).toContainText(/profile|settings/i);

    // Update profile information
    const nameField = page.getByRole('textbox', { name: /name|full name/i });
    if (await nameField.isVisible()) {
      await nameField.fill('Updated Test User');
    }

    const bioField = page.getByRole('textbox', { name: /bio|about/i });
    if (await bioField.isVisible()) {
      await bioField.fill('I am a dedicated student using StudyTeddy to improve my learning.');
    }

    // Save profile changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Check for success message
    const successMessage = page.locator('[data-testid="success-message"]');
    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText(/saved|updated/i);
    }

    // Navigate to notification settings
    await page.getByRole('link', { name: /notifications/i }).click();
    await page.waitForURL('/settings/notifications');

    // Toggle notification preferences
    const emailNotifications = page.getByRole('switch', { name: /email notifications/i });
    if (await emailNotifications.isVisible()) {
      await emailNotifications.click();
    }

    const pushNotifications = page.getByRole('switch', { name: /push notifications/i });
    if (await pushNotifications.isVisible()) {
      await pushNotifications.click();
    }

    // Save notification settings
    await page.getByRole('button', { name: /save|update/i }).click();

    // Navigate to security settings
    await page.getByRole('link', { name: /security|password/i }).click();
    await page.waitForURL('/settings/security');

    // Check two-factor authentication section
    const twoFactorSection = page.locator('[data-testid="two-factor-auth"]');
    if (await twoFactorSection.isVisible()) {
      await expect(twoFactorSection.locator('h3, h4')).toContainText(/two.factor|2fa/i);
    }

    // Check active sessions
    const activeSessions = page.locator('[data-testid="active-sessions"]');
    if (await activeSessions.isVisible()) {
      await expect(activeSessions.locator('h3, h4')).toContainText(/active sessions|devices/i);
    }
  });
});