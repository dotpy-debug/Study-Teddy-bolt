import { test, expect } from '@playwright/test';

test.describe('Component Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test page for isolated component testing
    await page.goto('/test-components'); // This would be a special route for testing
  });

  test('button variants', async ({ page }) => {
    await page.setContent(`
      <div style="padding: 20px; background: white;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary">Primary Button</button>
          <button class="btn btn-secondary">Secondary Button</button>
          <button class="btn btn-outline">Outline Button</button>
          <button class="btn btn-danger">Danger Button</button>
          <button class="btn btn-success">Success Button</button>
          <button class="btn btn-warning">Warning Button</button>
          <button class="btn btn-info">Info Button</button>
          <button class="btn btn-light">Light Button</button>
          <button class="btn btn-dark">Dark Button</button>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm">Small Button</button>
          <button class="btn btn-primary btn-md">Medium Button</button>
          <button class="btn btn-primary btn-lg">Large Button</button>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary" disabled>Disabled Button</button>
          <button class="btn btn-primary loading">Loading Button</button>
        </div>
      </div>
    `);

    await expect(page.locator('body')).toHaveScreenshot('button-variants.png');
  });

  test('form components', async ({ page }) => {
    await page.setContent(`
      <div style="padding: 20px; background: white; max-width: 600px;">
        <form style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label>Text Input</label>
            <input type="text" class="form-input" placeholder="Enter text..." />
          </div>

          <div>
            <label>Text Input with Error</label>
            <input type="text" class="form-input error" value="Invalid input" />
            <span class="error-message">This field is required</span>
          </div>

          <div>
            <label>Textarea</label>
            <textarea class="form-textarea" placeholder="Enter description..."></textarea>
          </div>

          <div>
            <label>Select</label>
            <select class="form-select">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>

          <div>
            <label>
              <input type="checkbox" class="form-checkbox" />
              Checkbox option
            </label>
          </div>

          <div>
            <label>
              <input type="radio" name="radio" class="form-radio" />
              Radio option 1
            </label>
            <label>
              <input type="radio" name="radio" class="form-radio" />
              Radio option 2
            </label>
          </div>

          <div>
            <label>File Input</label>
            <input type="file" class="form-file" />
          </div>

          <div>
            <label>Range Slider</label>
            <input type="range" class="form-range" min="0" max="100" value="50" />
          </div>
        </form>
      </div>
    `);

    await expect(page.locator('body')).toHaveScreenshot('form-components.png');
  });

  test('card components', async ({ page }) => {
    await page.setContent(`
      <div style="padding: 20px; background: #f5f5f5; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        <div class="card">
          <div class="card-header">
            <h3>Basic Card</h3>
          </div>
          <div class="card-body">
            <p>This is a basic card with header and body content.</p>
            <button class="btn btn-primary">Action</button>
          </div>
        </div>

        <div class="card">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjMwMHgyMDA8L3RleHQ+PC9zdmc+" class="card-image" />
          <div class="card-body">
            <h3>Card with Image</h3>
            <p>This card includes an image header.</p>
          </div>
        </div>

        <div class="card card-highlighted">
          <div class="card-body">
            <h3>Highlighted Card</h3>
            <p>This card has special highlighting.</p>
            <div class="card-footer">
              <button class="btn btn-outline">Cancel</button>
              <button class="btn btn-primary">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    `);

    await expect(page.locator('body')).toHaveScreenshot('card-components.png');
  });

  test('modal components', async ({ page }) => {
    await page.setContent(`
      <div style="position: relative; height: 100vh; background: #f0f0f0;">
        <!-- Modal Backdrop -->
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;"></div>

        <!-- Modal -->
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 1001; width: 500px; max-width: 90vw;">
          <div style="padding: 20px; border-bottom: 1px solid #eee;">
            <h2 style="margin: 0;">Modal Title</h2>
            <button style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
          </div>

          <div style="padding: 20px;">
            <p>This is the modal content. It can contain any elements including forms, images, or other components.</p>

            <div style="margin: 20px 0;">
              <label>Example input in modal:</label>
              <input type="text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter text..." />
            </div>
          </div>

          <div style="padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-outline">Cancel</button>
            <button class="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    `);

    await expect(page.locator('body')).toHaveScreenshot('modal-component.png');
  });

  test('navigation components', async ({ page }) => {
    await page.setContent(`
      <div style="background: white;">
        <!-- Top Navigation -->
        <nav style="background: #1f2937; color: white; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; height: 64px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="font-size: 20px; font-weight: bold;">Study Teddy</div>
            <div style="display: flex; gap: 15px;">
              <a href="#" style="color: white; text-decoration: none;">Dashboard</a>
              <a href="#" style="color: white; text-decoration: none;">Tasks</a>
              <a href="#" style="color: white; text-decoration: none;">Calendar</a>
              <a href="#" style="color: white; text-decoration: none;">Analytics</a>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <button style="background: none; border: none; color: white;">🔔</button>
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #4f46e5;"></div>
          </div>
        </nav>

        <!-- Breadcrumbs -->
        <div style="background: #f9fafb; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 8px; color: #6b7280;">
            <span>Dashboard</span>
            <span>›</span>
            <span>Tasks</span>
            <span>›</span>
            <span style="color: #111827;">Create Task</span>
          </div>
        </div>

        <!-- Sidebar Navigation -->
        <div style="display: flex; height: 400px;">
          <nav style="width: 250px; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 20px 0;">
            <div style="padding: 0 20px; margin-bottom: 20px;">
              <h3 style="margin: 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Navigation</h3>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li><a href="#" style="display: block; padding: 12px 20px; color: #334155; text-decoration: none; background: #e2e8f0;">📊 Overview</a></li>
              <li><a href="#" style="display: block; padding: 12px 20px; color: #334155; text-decoration: none;">✅ Tasks</a></li>
              <li><a href="#" style="display: block; padding: 12px 20px; color: #334155; text-decoration: none;">📅 Calendar</a></li>
              <li><a href="#" style="display: block; padding: 12px 20px; color: #334155; text-decoration: none;">🎯 Focus</a></li>
              <li><a href="#" style="display: block; padding: 12px 20px; color: #334155; text-decoration: none;">📈 Analytics</a></li>
              <li><a href="#" style="display: block; padding: 12px 20px; color: #334155; text-decoration: none;">⚙️ Settings</a></li>
            </ul>
          </nav>
          <div style="flex: 1; padding: 20px;">
            <h1>Main Content Area</h1>
            <p>This is where the main content would be displayed.</p>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div style="padding: 20px;">
          <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
            <div style="display: flex; gap: 0;">
              <button style="padding: 12px 16px; border: none; background: none; border-bottom: 2px solid #3b82f6; color: #3b82f6; font-weight: 500;">Active Tab</button>
              <button style="padding: 12px 16px; border: none; background: none; border-bottom: 2px solid transparent; color: #6b7280;">Inactive Tab</button>
              <button style="padding: 12px 16px; border: none; background: none; border-bottom: 2px solid transparent; color: #6b7280;">Another Tab</button>
            </div>
          </div>
          <div>Tab content would appear here.</div>
        </div>
      </div>
    `);

    await expect(page.locator('body')).toHaveScreenshot('navigation-components.png');
  });

  test('alert and notification components', async ({ page }) => {
    await page.setContent(`
      <div style="padding: 20px; background: #f5f5f5; display: flex; flex-direction: column; gap: 15px;">
        <!-- Success Alert -->
        <div style="background: #dcfce7; border: 1px solid #bbf7d0; color: #166534; padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
          <span style="color: #16a34a; font-size: 18px;">✓</span>
          <div>
            <strong>Success!</strong> Your task has been created successfully.
          </div>
          <button style="margin-left: auto; background: none; border: none; color: #166534; cursor: pointer;">✕</button>
        </div>

        <!-- Error Alert -->
        <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
          <span style="color: #dc2626; font-size: 18px;">⚠</span>
          <div>
            <strong>Error!</strong> Please check your input and try again.
          </div>
          <button style="margin-left: auto; background: none; border: none; color: #991b1b; cursor: pointer;">✕</button>
        </div>

        <!-- Warning Alert -->
        <div style="background: #fffbeb; border: 1px solid #fed7aa; color: #92400e; padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
          <span style="color: #f59e0b; font-size: 18px;">⚠</span>
          <div>
            <strong>Warning!</strong> This action cannot be undone.
          </div>
          <button style="margin-left: auto; background: none; border: none; color: #92400e; cursor: pointer;">✕</button>
        </div>

        <!-- Info Alert -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
          <span style="color: #3b82f6; font-size: 18px;">ℹ</span>
          <div>
            <strong>Info:</strong> Your session will expire in 5 minutes.
          </div>
          <button style="margin-left: auto; background: none; border: none; color: #1e40af; cursor: pointer;">✕</button>
        </div>

        <!-- Toast Notification -->
        <div style="position: fixed; top: 20px; right: 20px; background: white; border: 1px solid #e5e7eb; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 16px; width: 300px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
            <div style="flex: 1;">
              <div style="font-weight: 500; color: #111827;">Task Completed</div>
              <div style="color: #6b7280; font-size: 14px;">Mathematics homework finished</div>
            </div>
            <button style="background: none; border: none; color: #9ca3af; cursor: pointer;">✕</button>
          </div>
        </div>
      </div>
    `);

    await expect(page.locator('body')).toHaveScreenshot('alert-notification-components.png');
  });
});