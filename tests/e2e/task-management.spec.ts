import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tasks');
  });

  test('should create a new task', async ({ page }) => {
    // Click create task button
    await page.click('[data-testid="create-task-button"]');

    // Fill task form
    await page.fill('[data-testid="task-title-input"]', 'Test Task');
    await page.fill('[data-testid="task-description-input"]', 'This is a test task description');
    await page.selectOption('[data-testid="task-priority-select"]', 'high');
    await page.selectOption('[data-testid="task-category-select"]', 'study');

    // Set due date
    await page.fill('[data-testid="task-due-date-input"]', '2024-12-31');

    // Save task
    await page.click('[data-testid="save-task-button"]');

    // Verify task was created
    await expect(page.locator('[data-testid="task-item"]').filter({ hasText: 'Test Task' })).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    // Assuming there's at least one task, click on it
    await page.click('[data-testid="task-item"]:first-child [data-testid="edit-task-button"]');

    // Update task details
    await page.fill('[data-testid="task-title-input"]', 'Updated Test Task');
    await page.selectOption('[data-testid="task-priority-select"]', 'medium');

    // Save changes
    await page.click('[data-testid="save-task-button"]');

    // Verify task was updated
    await expect(page.locator('[data-testid="task-item"]').filter({ hasText: 'Updated Test Task' })).toBeVisible();
  });

  test('should mark task as completed', async ({ page }) => {
    // Click on task checkbox
    await page.click('[data-testid="task-item"]:first-child [data-testid="task-checkbox"]');

    // Verify task is marked as completed
    await expect(page.locator('[data-testid="task-item"]:first-child')).toHaveClass(/completed/);
  });

  test('should delete a task', async ({ page }) => {
    // Get initial task count
    const initialTaskCount = await page.locator('[data-testid="task-item"]').count();

    // Delete first task
    await page.click('[data-testid="task-item"]:first-child [data-testid="delete-task-button"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify task was deleted
    const newTaskCount = await page.locator('[data-testid="task-item"]').count();
    expect(newTaskCount).toBe(initialTaskCount - 1);
  });

  test('should filter tasks by priority', async ({ page }) => {
    // Click on priority filter
    await page.click('[data-testid="priority-filter-button"]');
    await page.click('[data-testid="filter-high-priority"]');

    // Verify only high priority tasks are shown
    const visibleTasks = page.locator('[data-testid="task-item"]:visible');
    const count = await visibleTasks.count();

    for (let i = 0; i < count; i++) {
      const priorityBadge = visibleTasks.nth(i).locator('[data-testid="task-priority-badge"]');
      await expect(priorityBadge).toHaveText('High');
    }
  });

  test('should search tasks', async ({ page }) => {
    // Type in search box
    await page.fill('[data-testid="task-search-input"]', 'math');

    // Wait for search results
    await page.waitForTimeout(500);

    // Verify search results contain the search term
    const visibleTasks = page.locator('[data-testid="task-item"]:visible');
    const count = await visibleTasks.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const taskTitle = await visibleTasks.nth(i).locator('[data-testid="task-title"]').textContent();
        expect(taskTitle?.toLowerCase()).toContain('math');
      }
    }
  });

  test('should handle task sorting', async ({ page }) => {
    // Click sort by due date
    await page.click('[data-testid="sort-button"]');
    await page.click('[data-testid="sort-by-due-date"]');

    // Verify tasks are sorted by due date
    const dueDates = await page.locator('[data-testid="task-due-date"]').allTextContents();
    const sortedDates = [...dueDates].sort();
    expect(dueDates).toEqual(sortedDates);
  });

  test('should create task with subtasks', async ({ page }) => {
    await page.click('[data-testid="create-task-button"]');

    // Fill main task
    await page.fill('[data-testid="task-title-input"]', 'Main Task with Subtasks');

    // Add subtasks
    await page.click('[data-testid="add-subtask-button"]');
    await page.fill('[data-testid="subtask-input-0"]', 'Subtask 1');

    await page.click('[data-testid="add-subtask-button"]');
    await page.fill('[data-testid="subtask-input-1"]', 'Subtask 2');

    // Save task
    await page.click('[data-testid="save-task-button"]');

    // Verify task with subtasks was created
    const taskWithSubtasks = page.locator('[data-testid="task-item"]').filter({ hasText: 'Main Task with Subtasks' });
    await expect(taskWithSubtasks).toBeVisible();
    await expect(taskWithSubtasks.locator('[data-testid="subtask-item"]')).toHaveCount(2);
  });
});