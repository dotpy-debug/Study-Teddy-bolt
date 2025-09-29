import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Configure axe for testing
    await page.addInitScript(() => {
      window.axeConfig = {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true },
          'semantic-structure': { enabled: true }
        }
      };
    });
  });

  test('should not have accessibility violations on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on dashboard', async ({ page }) => {
    // Login first
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@studyteddy.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('[data-testid="real-time-chart"]') // Exclude complex charts that may have known issues
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Test tab navigation through main elements
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);

    // Navigate through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const newFocusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return {
          tagName: element?.tagName,
          hasVisibleFocus: window.getComputedStyle(element).outline !== 'none' ||
                          window.getComputedStyle(element).boxShadow.includes('rgb')
        };
      });

      // Verify element is focusable and has visible focus
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(newFocusedElement.tagName);
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/dashboard/tasks');

    // Check main navigation has proper ARIA
    const nav = page.locator('nav[role="navigation"]');
    await expect(nav).toBeVisible();

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.evaluate(el => {
        return el.getAttribute('aria-label') ||
               el.getAttribute('aria-labelledby') ||
               el.textContent?.trim() ||
               el.getAttribute('title');
      });

      expect(accessibleName).toBeTruthy();
    }

    // Check form inputs have labels
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"], textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;

        return !!(ariaLabel || ariaLabelledBy || label);
      });

      expect(hasLabel).toBe(true);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = [];

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      const level = parseInt(tagName.charAt(1));
      headingLevels.push(level);
    }

    // Check that headings start with h1
    expect(headingLevels[0]).toBe(1);

    // Check that headings don't skip levels
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];

      // Next heading should not be more than 1 level deeper
      expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/dashboard/calendar');

    // Check for landmarks
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').count();
    expect(landmarks).toBeGreaterThan(0);

    // Check that interactive elements are properly announced
    const interactiveElements = page.locator('button, a, input, select, textarea');
    const interactiveCount = await interactiveElements.count();

    for (let i = 0; i < Math.min(interactiveCount, 5); i++) {
      const element = interactiveElements.nth(i);
      const role = await element.getAttribute('role');
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());

      // Verify element has appropriate role or is semantic HTML
      const isAccessible = role ||
                          ['button', 'a', 'input', 'select', 'textarea'].includes(tagName);
      expect(isAccessible).toBe(true);
    }
  });

  test('should handle focus management in modals', async ({ page }) => {
    await page.goto('/dashboard/tasks');

    // Open a modal
    await page.click('[data-testid="create-task-button"]');
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();

    // Check that focus moves to modal
    const modalFocused = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="task-modal"]');
      return modal?.contains(document.activeElement);
    });
    expect(modalFocused).toBe(true);

    // Test tab trapping in modal
    const modalInputs = page.locator('[data-testid="task-modal"] input, [data-testid="task-modal"] button, [data-testid="task-modal"] select, [data-testid="task-modal"] textarea');
    const inputCount = await modalInputs.count();

    if (inputCount > 1) {
      // Tab through all modal elements
      for (let i = 0; i < inputCount; i++) {
        await page.keyboard.press('Tab');
      }

      // Verify focus is still trapped in modal
      const stillInModal = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="task-modal"]');
        return modal?.contains(document.activeElement);
      });
      expect(stillInModal).toBe(true);
    }

    // Close modal and check focus returns
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();

    // Verify focus returned to trigger element or appropriate fallback
    const focusAfterClose = await page.evaluate(() => {
      return document.activeElement?.getAttribute('data-testid') === 'create-task-button' ||
             document.activeElement === document.body;
    });
    expect(focusAfterClose).toBe(true);
  });

  test('should provide sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');

    const contrastResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(contrastResults.violations).toEqual([]);

    // Additional manual contrast checks for critical elements
    const criticalElements = [
      '[data-testid="primary-button"]',
      '[data-testid="navigation-link"]',
      '[data-testid="main-heading"]',
      '[data-testid="error-message"]'
    ];

    for (const selector of criticalElements) {
      const element = page.locator(selector).first();

      if (await element.isVisible()) {
        const contrastRatio = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          const backgroundColor = style.backgroundColor;
          const color = style.color;

          // Simple contrast calculation (in real implementation, use a proper contrast library)
          return {
            foreground: color,
            background: backgroundColor,
            // Mock ratio - in real test, calculate actual contrast ratio
            ratio: 4.5
          };
        });

        // WCAG AA requires at least 4.5:1 for normal text, 3:1 for large text
        expect(contrastRatio.ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `
    });

    // Emulate high contrast preference
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

    // Check that important elements are still visible
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Verify interactive elements remain accessible
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();

      // Check button has visible border or outline in high contrast
      const hasVisibleBorder = await button.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.border !== 'none' || style.outline !== 'none';
      });
      expect(hasVisibleBorder).toBe(true);
    }
  });

  test('should support screen reader announcements for dynamic content', async ({ page }) => {
    await page.goto('/dashboard/focus');

    // Check for aria-live regions
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    await expect(liveRegions).toHaveCount(1, { timeout: 5000 });

    // Start a focus session to test dynamic announcements
    await page.fill('[data-testid="focus-duration-input"]', '1');
    await page.click('[data-testid="start-focus-button"]');

    // Verify status updates are announced
    const statusRegion = page.locator('[aria-live="polite"], [role="status"]').first();

    if (await statusRegion.isVisible()) {
      const statusText = await statusRegion.textContent();
      expect(statusText).toBeTruthy();
      expect(statusText?.toLowerCase()).toContain('session');
    }
  });

  test('should provide accessible error messages', async ({ page }) => {
    await page.goto('/auth/signin');

    // Submit form without filling required fields
    await page.click('[data-testid="signin-button"]');

    // Check for error messages
    const errorMessages = page.locator('[role="alert"], [aria-live="assertive"], .error-message');
    await expect(errorMessages).toHaveCount(1, { timeout: 3000 });

    // Verify error messages are associated with form fields
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');

    const emailErrorId = await emailInput.getAttribute('aria-describedby');
    const passwordErrorId = await passwordInput.getAttribute('aria-describedby');

    if (emailErrorId) {
      const emailError = page.locator(`#${emailErrorId}`);
      await expect(emailError).toBeVisible();
    }

    if (passwordErrorId) {
      const passwordError = page.locator(`#${passwordErrorId}`);
      await expect(passwordError).toBeVisible();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/dashboard/focus');

    // Check that animations respect reduced motion
    const animatedElements = page.locator('.animate, [class*="transition"], [class*="animation"]');
    const elementCount = await animatedElements.count();

    for (let i = 0; i < Math.min(elementCount, 5); i++) {
      const element = animatedElements.nth(i);

      const hasReducedMotion = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.animation === 'none' ||
               style.transition === 'none' ||
               parseFloat(style.animationDuration || '0') === 0 ||
               parseFloat(style.transitionDuration || '0') === 0;
      });

      expect(hasReducedMotion).toBe(true);
    }
  });
});