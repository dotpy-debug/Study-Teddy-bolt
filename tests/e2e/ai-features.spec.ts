import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should generate study plan with AI', async ({ page }) => {
    // Navigate to AI study planner
    await page.click('[data-testid="ai-study-planner"]');

    // Fill study preferences
    await page.fill('[data-testid="study-subject-input"]', 'Mathematics');
    await page.fill('[data-testid="study-duration-input"]', '2'); // 2 hours
    await page.selectOption('[data-testid="difficulty-level-select"]', 'intermediate');
    await page.selectOption('[data-testid="learning-style-select"]', 'visual');

    // Add specific topics
    await page.fill('[data-testid="topics-input"]', 'algebra, geometry, calculus');

    // Generate study plan
    await page.click('[data-testid="generate-plan-button"]');

    // Wait for AI generation
    await expect(page.locator('[data-testid="generating-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="generated-study-plan"]')).toBeVisible({ timeout: 30000 });

    // Verify study plan contains expected elements
    await expect(page.locator('[data-testid="study-plan-title"]')).toContainText('Mathematics');
    await expect(page.locator('[data-testid="study-plan-session"]')).toHaveCount(3, { timeout: 5000 });
  });

  test('should provide AI-powered task suggestions', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/dashboard/tasks');

    // Click AI suggestions button
    await page.click('[data-testid="ai-suggestions-button"]');

    // Wait for suggestions to load
    await expect(page.locator('[data-testid="ai-suggestions-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-task"]')).toHaveCount(3, { timeout: 15000 });

    // Accept a suggestion
    await page.click('[data-testid="suggested-task"]:first-child [data-testid="accept-suggestion-button"]');

    // Verify task was added
    await expect(page.locator('[data-testid="task-item"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('should analyze study patterns with AI', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/dashboard/analytics');

    // Click AI insights button
    await page.click('[data-testid="ai-insights-button"]');

    // Wait for AI analysis
    await expect(page.locator('[data-testid="ai-insights-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-insights"]')).toBeVisible();
    await expect(page.locator('[data-testid="insight-card"]')).toHaveCount(4, { timeout: 20000 });

    // Verify different types of insights
    await expect(page.locator('[data-testid="productivity-insight"]')).toBeVisible();
    await expect(page.locator('[data-testid="focus-pattern-insight"]')).toBeVisible();
    await expect(page.locator('[data-testid="improvement-suggestion"]')).toBeVisible();
  });

  test('should use AI for smart scheduling', async ({ page }) => {
    // Navigate to calendar
    await page.goto('/dashboard/calendar');

    // Click smart scheduling button
    await page.click('[data-testid="smart-schedule-button"]');

    // Fill scheduling preferences
    await page.selectOption('[data-testid="preferred-time-select"]', 'morning');
    await page.fill('[data-testid="session-length-input"]', '45');
    await page.selectOption('[data-testid="break-frequency-select"]', '15');

    // Add subjects to schedule
    await page.fill('[data-testid="subjects-input"]', 'Math, Physics, Chemistry');

    // Generate smart schedule
    await page.click('[data-testid="generate-schedule-button"]');

    // Wait for AI scheduling
    await expect(page.locator('[data-testid="generating-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-schedule-result"]')).toBeVisible({ timeout: 25000 });

    // Verify schedule was generated
    await expect(page.locator('[data-testid="scheduled-session"]')).toHaveCount(3, { timeout: 5000 });

    // Apply schedule to calendar
    await page.click('[data-testid="apply-schedule-button"]');
    await expect(page.locator('[data-testid="calendar-event"]')).toHaveCount(3, { timeout: 5000 });
  });

  test('should provide AI-powered study recommendations', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Verify AI recommendations widget is visible
    await expect(page.locator('[data-testid="ai-recommendations-widget"]')).toBeVisible();

    // Click to view all recommendations
    await page.click('[data-testid="view-all-recommendations"]');

    // Verify recommendations page
    await expect(page).toHaveURL('/dashboard/recommendations');
    await expect(page.locator('[data-testid="recommendation-card"]')).toHaveCount(5, { timeout: 10000 });

    // Filter recommendations by type
    await page.selectOption('[data-testid="recommendation-filter"]', 'study-methods');
    await expect(page.locator('[data-testid="recommendation-card"][data-type="study-methods"]')).toHaveCount(2, { timeout: 5000 });
  });

  test('should handle AI chat assistant', async ({ page }) => {
    // Open AI chat
    await page.click('[data-testid="ai-chat-button"]');

    // Verify chat interface opens
    await expect(page.locator('[data-testid="ai-chat-panel"]')).toBeVisible();

    // Send a message
    await page.fill('[data-testid="chat-input"]', 'How can I improve my study efficiency?');
    await page.click('[data-testid="send-message-button"]');

    // Verify message was sent
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('improve my study efficiency');

    // Wait for AI response
    await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="ai-response"]').last()).not.toBeEmpty();

    // Test follow-up question
    await page.fill('[data-testid="chat-input"]', 'Can you create a study plan for calculus?');
    await page.click('[data-testid="send-message-button"]');

    // Verify AI can handle specific requests
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('calculus', { timeout: 15000 });
  });

  test('should provide AI-generated quiz questions', async ({ page }) => {
    // Navigate to quiz section
    await page.goto('/dashboard/quiz');

    // Select topic for quiz generation
    await page.fill('[data-testid="quiz-topic-input"]', 'Linear Algebra');
    await page.selectOption('[data-testid="quiz-difficulty-select"]', 'medium');
    await page.selectOption('[data-testid="question-count-select"]', '5');

    // Generate quiz with AI
    await page.click('[data-testid="generate-quiz-button"]');

    // Wait for quiz generation
    await expect(page.locator('[data-testid="generating-quiz"]')).toBeVisible();
    await expect(page.locator('[data-testid="quiz-questions"]')).toBeVisible({ timeout: 20000 });

    // Verify quiz has correct number of questions
    await expect(page.locator('[data-testid="quiz-question"]')).toHaveCount(5);

    // Answer first question
    await page.click('[data-testid="quiz-question"]:first-child [data-testid="answer-option"]:first-child');

    // Submit quiz
    await page.click('[data-testid="submit-quiz-button"]');

    // Verify results
    await expect(page.locator('[data-testid="quiz-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="quiz-score"]')).toBeVisible();
  });

  test('should handle AI content summarization', async ({ page }) => {
    // Navigate to notes section
    await page.goto('/dashboard/notes');

    // Create a note with content
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-title-input"]', 'Complex Physics Concepts');
    await page.fill('[data-testid="note-content-input"]', `
      Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.

      Classical physics, the collection of theories that existed before the advent of quantum mechanics, describes many aspects of nature at an ordinary (macroscopic) scale, but is not sufficient for describing them at small (atomic and subatomic) scales.
    `);

    // Save note
    await page.click('[data-testid="save-note-button"]');

    // Use AI summarization
    await page.click('[data-testid="ai-summarize-button"]');

    // Wait for summary
    await expect(page.locator('[data-testid="ai-summary"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="ai-summary"]')).not.toBeEmpty();

    // Verify summary is shorter than original content
    const originalLength = await page.locator('[data-testid="note-content-input"]').inputValue();
    const summaryLength = await page.locator('[data-testid="ai-summary"]').textContent();

    expect(summaryLength!.length).toBeLessThan(originalLength.length);
  });
});