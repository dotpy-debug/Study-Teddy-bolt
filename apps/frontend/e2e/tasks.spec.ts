import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
    });

    // Mock initial tasks data
    await page.route('**/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              title: 'Complete Math Homework',
              subject: 'math',
              dueDate: '2024-01-20T10:00:00Z',
              priority: 'high',
              completed: false,
              estimatedTime: 60,
            },
            {
              id: '2',
              title: 'Read Science Chapter',
              subject: 'science',
              dueDate: '2024-01-22T10:00:00Z',
              priority: 'medium',
              completed: true,
              estimatedTime: 30,
            },
          ]),
        });
      }
    });

    await page.goto('/tasks');
  });

  test('should display task list correctly', async ({ page }) => {
    await expect(page.getByText('Complete Math Homework')).toBeVisible();
    await expect(page.getByText('Read Science Chapter')).toBeVisible();
    await expect(page.getByText('Mathematics')).toBeVisible();
    await expect(page.getByText('Science')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
    await expect(page.getByText('Medium')).toBeVisible();
  });

  test('should show completed tasks with different styling', async ({ page }) => {
    const completedTask = page.getByText('Read Science Chapter');
    await expect(completedTask).toHaveClass(/line-through/);
  });

  test('should toggle task completion', async ({ page }) => {
    // Mock task update response
    await page.route('**/tasks/1', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            title: 'Complete Math Homework',
            subject: 'math',
            dueDate: '2024-01-20T10:00:00Z',
            priority: 'high',
            completed: true,
            estimatedTime: 60,
          }),
        });
      }
    });

    // Find and click the completion toggle for the first task
    const taskCard = page.locator('[data-testid="task-card-1"]').first();
    const toggleButton = taskCard.getByRole('button').first();
    await toggleButton.click();

    // Verify the task appears completed
    await expect(page.getByText('Complete Math Homework')).toHaveClass(/line-through/);
  });

  test('should open task creation form', async ({ page }) => {
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await expect(page.getByText('Create New Task')).toBeVisible();
    await expect(page.getByLabel('Title')).toBeVisible();
    await expect(page.getByLabel('Subject')).toBeVisible();
    await expect(page.getByLabel('Due Date')).toBeVisible();
    await expect(page.getByLabel('Priority')).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    // Mock task creation response
    await page.route('**/tasks', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '3',
            ...requestBody,
            completed: false,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel('Title').fill('New Test Task');
    await page.getByLabel('Subject').selectOption('history');
    await page.getByLabel('Due Date').fill('2024-01-25');
    await page.getByLabel('Priority').selectOption('low');
    await page.getByLabel('Estimated Time').fill('45');

    await page.getByRole('button', { name: 'Create Task' }).click();

    // Should close the form and show the new task
    await expect(page.getByText('New Test Task')).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('Low')).toBeVisible();
  });

  test('should show validation errors for invalid task data', async ({ page }) => {
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Create Task' }).click();

    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    // Mock task update response
    await page.route('**/tasks/1', async (route) => {
      if (route.request().method() === 'PATCH') {
        const requestBody = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            title: requestBody.title || 'Complete Math Homework',
            subject: 'math',
            dueDate: '2024-01-20T10:00:00Z',
            priority: requestBody.priority || 'high',
            completed: false,
            estimatedTime: 60,
          }),
        });
      }
    });

    // Open task menu and click edit
    const taskCard = page.locator('[data-testid="task-card-1"]').first();
    const menuButton = taskCard.getByRole('button', { name: /more options/i });
    await menuButton.click();

    await page.getByText('Edit Task').click();

    // Update task title
    await page.getByLabel('Title').clear();
    await page.getByLabel('Title').fill('Updated Math Homework');
    await page.getByLabel('Priority').selectOption('medium');

    await page.getByRole('button', { name: 'Update Task' }).click();

    // Should show updated task
    await expect(page.getByText('Updated Math Homework')).toBeVisible();
  });

  test('should delete a task with confirmation', async ({ page }) => {
    // Mock task deletion response
    await page.route('**/tasks/1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Task deleted successfully' }),
        });
      }
    });

    // Open task menu and click delete
    const taskCard = page.locator('[data-testid="task-card-1"]').first();
    const menuButton = taskCard.getByRole('button', { name: /more options/i });
    await menuButton.click();

    await page.getByText('Delete Task').click();

    // Should show confirmation dialog
    await expect(page.getByText('Are you sure you want to delete')).toBeVisible();
    await expect(page.getByText('Complete Math Homework')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    // Task should be removed from the list
    await expect(page.getByText('Complete Math Homework')).not.toBeVisible();
  });

  test('should cancel task deletion', async ({ page }) => {
    // Open task menu and click delete
    const taskCard = page.locator('[data-testid="task-card-1"]').first();
    const menuButton = taskCard.getByRole('button', { name: /more options/i });
    await menuButton.click();

    await page.getByText('Delete Task').click();

    // Cancel deletion
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Task should still be visible
    await expect(page.getByText('Complete Math Homework')).toBeVisible();
  });

  test('should filter tasks by completion status', async ({ page }) => {
    // Mock filtered tasks response
    await page.route('**/tasks?completed=false', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Complete Math Homework',
            subject: 'math',
            dueDate: '2024-01-20T10:00:00Z',
            priority: 'high',
            completed: false,
            estimatedTime: 60,
          },
        ]),
      });
    });

    // Click filter for pending tasks
    await page.getByRole('button', { name: /pending|incomplete/i }).click();

    // Should only show incomplete tasks
    await expect(page.getByText('Complete Math Homework')).toBeVisible();
    await expect(page.getByText('Read Science Chapter')).not.toBeVisible();
  });

  test('should filter tasks by subject', async ({ page }) => {
    // Mock filtered tasks response
    await page.route('**/tasks?subject=math', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Complete Math Homework',
            subject: 'math',
            dueDate: '2024-01-20T10:00:00Z',
            priority: 'high',
            completed: false,
            estimatedTime: 60,
          },
        ]),
      });
    });

    // Select math subject filter
    await page.getByRole('combobox', { name: /subject/i }).selectOption('math');

    // Should only show math tasks
    await expect(page.getByText('Complete Math Homework')).toBeVisible();
    await expect(page.getByText('Read Science Chapter')).not.toBeVisible();
  });

  test('should show today\'s tasks', async ({ page }) => {
    // Mock today's tasks response
    await page.route('**/tasks/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Complete Math Homework',
            subject: 'math',
            dueDate: new Date().toISOString(),
            priority: 'high',
            completed: false,
            estimatedTime: 60,
          },
        ]),
      });
    });

    await page.getByRole('button', { name: /today|due today/i }).click();

    await expect(page.getByText('Due Today')).toBeVisible();
  });

  test('should show overdue tasks with warning styling', async ({ page }) => {
    // Mock overdue tasks
    await page.route('**/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              title: 'Overdue Task',
              subject: 'math',
              dueDate: '2024-01-10T10:00:00Z', // Past date
              priority: 'high',
              completed: false,
              estimatedTime: 60,
            },
          ]),
        });
      }
    });

    await page.reload();

    await expect(page.getByText('Overdue')).toBeVisible();
    await expect(page.getByText('Past Due')).toBeVisible();
  });

  test('should handle task loading states', async ({ page }) => {
    // Mock slow task loading
    await page.route('**/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/tasks');

    // Should show loading state
    await expect(page.getByText(/loading|Loading/)).toBeVisible();
  });

  test('should handle task creation errors', async ({ page }) => {
    // Mock task creation error
    await page.route('**/tasks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Invalid task data',
          }),
        });
      }
    });

    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel('Title').fill('Test Task');
    await page.getByRole('button', { name: 'Create Task' }).click();

    await expect(page.getByText('Invalid task data')).toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    // Mock search results
    await page.route('**/tasks?search=math', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Complete Math Homework',
            subject: 'math',
            dueDate: '2024-01-20T10:00:00Z',
            priority: 'high',
            completed: false,
            estimatedTime: 60,
          },
        ]),
      });
    });

    const searchInput = page.getByPlaceholder(/search tasks/i);
    await searchInput.fill('math');
    await searchInput.press('Enter');

    // Should show only matching tasks
    await expect(page.getByText('Complete Math Homework')).toBeVisible();
    await expect(page.getByText('Read Science Chapter')).not.toBeVisible();
  });
});