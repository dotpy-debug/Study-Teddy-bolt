// Use Jest/global testing hooks instead of bun:test
import { beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
import { TestDrizzleService } from './test/test-drizzle.service';

// Global test configuration for Bun
export const testConfig = {
  timeout: 30000,
  bail: false,
  verbose: true,
};

// Global setup
let testDrizzleService: TestDrizzleService;

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.SKIP_EMAIL_VERIFICATION = 'true';
  process.env.DISABLE_RATE_LIMITING = 'true';
  process.env.MOCK_EXTERNAL_SERVICES = 'true';

  // Initialize test database
  testDrizzleService = new TestDrizzleService();

  // Verify database connection
  const connected = await testDrizzleService.checkConnection();
  if (!connected) {
    throw new Error('Failed to connect to test database');
  }

  console.log('Test environment initialized');
});

beforeEach(async () => {
  // Clear all tables before each test
  if (testDrizzleService) {
    await testDrizzleService.clearAllTables();
  }
});

afterEach(async () => {
  // Clean up any remaining data
  if (testDrizzleService) {
    await testDrizzleService.clearAllTables();
  }
});

afterAll(async () => {
  // Close database connection
  if (testDrizzleService) {
    await testDrizzleService.closeConnection();
  }

  console.log('Test environment cleaned up');
});

// Export function to get test service for use in tests
export const getTestDrizzleService = () => testDrizzleService;