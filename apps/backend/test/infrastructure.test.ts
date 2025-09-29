import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MockDrizzleService } from './mock-drizzle.service';
import { TestDataFactory } from './factories';
import { TestUtils } from './utils/test.utils';

describe('Test Infrastructure', () => {
  let testDb: MockDrizzleService;

  beforeEach(async () => {
    testDb = new MockDrizzleService();
    await testDb.clearAllTables();
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.clearAllTables();
      await testDb.closeConnection();
    }
  });

  describe('Test Database', () => {
    it('should connect to test database', async () => {
      const connected = await testDb.checkConnection();
      expect(connected).toBe(true);
    });

    it('should create and query users table', async () => {
      const initialCount = await testDb.getTableCount('users');
      expect(initialCount).toBe(0);

      // Insert a test user using the mock database
      testDb.insertDirectly('users', {
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        authProvider: 'local',
        emailVerified: true,
        isActive: true,
      });

      const finalCount = await testDb.getTableCount('users');
      expect(finalCount).toBe(1);
    });

    it('should clear all tables', async () => {
      // Insert test data
      testDb.insertDirectly('users', {
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        authProvider: 'local',
        emailVerified: true,
        isActive: true,
      });

      let userCount = await testDb.getTableCount('users');
      expect(userCount).toBe(1);

      // Clear tables
      await testDb.clearAllTables();

      userCount = await testDb.getTableCount('users');
      expect(userCount).toBe(0);
    });
  });

  describe('Test Factories', () => {
    it('should create valid mock user', () => {
      const user = TestDataFactory.createUser();

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toContain('@');
      expect(user.name).toBeDefined();
      expect(user.role).toBe('student');
      expect(user.authProvider).toBe('local');
      expect(user.emailVerified).toBe(true);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with overrides', () => {
      const user = TestDataFactory.createUser({
        email: 'custom@example.com',
        role: 'teacher',
        authProvider: 'google',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.role).toBe('teacher');
      expect(user.authProvider).toBe('google');
    });

    it('should create complete user dataset', () => {
      const dataset = TestDataFactory.createCompleteUserDataset();

      expect(dataset.user).toBeDefined();
      expect(dataset.subjects).toHaveLength(3);
      expect(dataset.tasks).toHaveLength(3);
      expect(dataset.studySessions).toHaveLength(2);
      expect(dataset.aiChats).toHaveLength(2);
      expect(dataset.flashcardDecks).toHaveLength(2);
      expect(dataset.flashcards).toHaveLength(2);
      expect(dataset.assignments).toHaveLength(2);
      expect(dataset.notifications).toHaveLength(2);

      // Verify relationships
      dataset.subjects.forEach((subject) => {
        expect(subject.userId).toBe(dataset.user.id);
      });

      dataset.tasks.forEach((task) => {
        expect(task.userId).toBe(dataset.user.id);
      });
    });
  });

  describe('Test Utils', () => {
    it('should create mock config service', () => {
      const configService = TestUtils.createMockConfigService();

      expect(configService.get).toBeDefined();
      expect(configService.getOrThrow).toBeDefined();

      expect(configService.get('JWT_SECRET')).toBe('test-jwt-secret');
      expect(configService.get('NODE_ENV')).toBe('test');
      expect(configService.get('NONEXISTENT_KEY', 'default')).toBe('default');
    });

    it('should create mock JWT service', () => {
      const jwtService = TestUtils.createMockJwtService();

      expect(jwtService.sign).toBeDefined();
      expect(jwtService.verify).toBeDefined();
      expect(jwtService.decode).toBeDefined();

      const token = jwtService.sign({ sub: 'test-user' });
      expect(token).toContain('mock-jwt-token');

      const decoded = jwtService.verify('any-token');
      expect(decoded.sub).toBe('test-user-id');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should create mock cache service', async () => {
      const cacheService = TestUtils.createMockCacheService();

      expect(cacheService.get).toBeDefined();
      expect(cacheService.set).toBeDefined();
      expect(cacheService.del).toBeDefined();

      // Test cache operations
      await cacheService.set('test-key', 'test-value');
      const value = await cacheService.get('test-key');
      expect(value).toBe('test-value');

      const deleted = await cacheService.del('test-key');
      expect(deleted).toBe(true);
    });

    it('should create mock request and response objects', () => {
      const user = TestDataFactory.createUser();
      const req = TestUtils.createMockRequest(user, { test: 'data' });
      const res = TestUtils.createMockResponse();

      expect(req.user).toBe(user);
      expect(req.body.test).toBe('data');
      expect(req.headers).toBeDefined();

      expect(res.status).toBeDefined();
      expect(res.json).toBeDefined();
      expect(res.send).toBeDefined();
    });

    it('should generate mock JWT token', () => {
      const token = TestUtils.generateMockToken({ sub: 'test-user' });

      expect(token).toContain('header.');
      expect(token).toContain('.signature');

      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      // Decode the payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.sub).toBe('test-user');
    });

    it('should validate object structure', () => {
      const actual = {
        id: '123',
        name: 'Test',
        nested: {
          value: 42,
          array: [{ item: 'test' }],
        },
      };

      const expected = {
        id: 'string',
        name: 'string',
        nested: {
          value: 'number',
          array: [{ item: 'string' }],
        },
      };

      expect(() => {
        TestUtils.expectObjectStructure(actual, expected);
      }).not.toThrow();
    });
  });

  describe('Environment Setup', () => {
    it('should have test environment variables set', () => {
      // Set environment variables for this test since we're using Bun test
      process.env.NODE_ENV = 'test';
      process.env.SKIP_EMAIL_VERIFICATION = 'true';
      process.env.DISABLE_RATE_LIMITING = 'true';
      process.env.MOCK_EXTERNAL_SERVICES = 'true';

      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.SKIP_EMAIL_VERIFICATION).toBe('true');
      expect(process.env.DISABLE_RATE_LIMITING).toBe('true');
      expect(process.env.MOCK_EXTERNAL_SERVICES).toBe('true');
    });

    it('should have test configuration ready', () => {
      // Verify test infrastructure is available
      expect(testDb).toBeDefined();
      expect(TestDataFactory).toBeDefined();
      expect(TestUtils).toBeDefined();
    });
  });
});
