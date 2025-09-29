// Global test setup for E2E tests
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global variables for E2E tests
declare global {
  var app: INestApplication;
  var moduleFixture: TestingModule;
}

// Test database helper
export class TestDatabase {
  static async truncateAll(): Promise<void> {
    // Implementation depends on your database setup
    // This would typically truncate all tables or reset the test database
  }

  static async seedTestData(): Promise<void> {
    // Seed test data if needed
  }
}

// Common test utilities
export const createTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  ...overrides,
});

export const createTestSubject = (overrides = {}) => ({
  name: 'Test Subject',
  description: 'Test subject description',
  color: '#FF5733',
  ...overrides,
});

export const createTestStudySession = (overrides = {}) => ({
  title: 'Test Study Session',
  duration: 1800, // 30 minutes
  subjectId: 1,
  ...overrides,
});

// Mock external services for E2E tests
beforeAll(async () => {
  // Additional E2E setup if needed
});

afterAll(async () => {
  // Cleanup after all E2E tests
  if (global.app) {
    await global.app.close();
  }
});

beforeEach(async () => {
  // Reset database state before each test
  await TestDatabase.truncateAll();
});

afterEach(async () => {
  // Cleanup after each test if needed
});
