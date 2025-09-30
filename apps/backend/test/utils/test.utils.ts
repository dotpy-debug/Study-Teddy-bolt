import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MockDrizzleService } from '../mock-drizzle.service';
import { TestDataFactory } from '../factories';

/**
 * Comprehensive test utilities for common testing patterns
 */
export class TestUtils {
  /**
   * Create a mock testing module with common providers
   */
  static async createTestingModule(
    providers: any[] = [],
    imports: any[] = [],
    controllers: any[] = [],
  ): Promise<TestingModule> {
    const module = await Test.createTestingModule({
      imports,
      controllers,
      providers: [
        ...providers,
        {
          provide: ConfigService,
          useValue: TestUtils.createMockConfigService(),
        },
        {
          provide: JwtService,
          useValue: TestUtils.createMockJwtService(),
        },
        {
          provide: MockDrizzleService,
          useClass: MockDrizzleService,
        },
        {
          provide: 'DrizzleService',
          useClass: MockDrizzleService,
        },
        {
          provide: 'CacheService',
          useValue: TestUtils.createMockCacheService(),
        },
        {
          provide: 'EmailService',
          useValue: TestUtils.createMockEmailService(),
        },
        {
          provide: 'AIRouterService',
          useValue: TestUtils.createMockAIRouterService(),
        },
        {
          provide: 'AITokenTrackerService',
          useValue: TestUtils.createMockAITokenTrackerService(),
        },
      ],
    }).compile();

    return module;
  }

  /**
   * Create mock ConfigService
   */
  static createMockConfigService() {
    const config = {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRES_IN: '1h',
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-4o-mini',
      AI_MAX_TOKENS: 1000,
      AI_TEMPERATURE: 0.7,
      OPENAI_API_KEY: 'test-openai-key',
      DATABASE_URL: 'test://localhost/test',
      REDIS_URL: 'redis://localhost:6379',
      EMAIL_FROM: 'test@studyteddy.com',
      APP_URL: 'http://localhost:3000',
      FRONTEND_URL: 'http://localhost:3000',
      CORS_ORIGINS: 'http://localhost:3000',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '1000',
      SKIP_EMAIL_VERIFICATION: 'true',
      DISABLE_RATE_LIMITING: 'true',
      MOCK_EXTERNAL_SERVICES: 'true',
    };

    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return config[key] || defaultValue;
      }),
      getOrThrow: jest.fn((key: string) => {
        const value = config[key];
        if (value === undefined) {
          throw new Error(`Configuration key "${key}" is not defined`);
        }
        return value;
      }),
    };
  }

  /**
   * Create mock JwtService
   */
  static createMockJwtService() {
    return {
      sign: jest.fn((payload: any) => `mock-jwt-token-${JSON.stringify(payload)}`),
      verify: jest.fn((token: string) => ({
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })),
      decode: jest.fn((token: string) => ({
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'student',
      })),
    };
  }

  /**
   * Create mock CacheService
   */
  static createMockCacheService() {
    const cache = new Map<string, any>();

    return {
      get: jest.fn((key: string) => Promise.resolve(cache.get(key) || null)),
      set: jest.fn((key: string, value: any, ttl?: number) => {
        cache.set(key, value);
        return Promise.resolve(true);
      }),
      del: jest.fn((key: string) => {
        const deleted = cache.delete(key);
        return Promise.resolve(deleted);
      }),
      delPattern: jest.fn((pattern: string) => {
        const keys = Array.from(cache.keys()).filter((key) =>
          key.includes(pattern.replace('*', '')),
        );
        keys.forEach((key) => cache.delete(key));
        return Promise.resolve(true);
      }),
      generateKey: jest.fn((prefix: string, ...args: any[]) => `${prefix}:${args.join(':')}`),
      warm: jest.fn(async (key: string, factory: () => Promise<any>) => {
        const cached = cache.get(key);
        if (cached) return cached;

        const value = await factory();
        cache.set(key, value);
        return value;
      }),
    };
  }

  /**
   * Create mock EmailService
   */
  static createMockEmailService() {
    return {
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetSuccessEmail: jest.fn().mockResolvedValue(true),
      sendEmailVerificationEmail: jest.fn().mockResolvedValue(true),
      sendTaskReminderEmail: jest.fn().mockResolvedValue(true),
      sendStudySessionSummaryEmail: jest.fn().mockResolvedValue(true),
    };
  }

  /**
   * Create mock AIRouterService
   */
  static createMockAIRouterService() {
    return {
      routeRequest: jest.fn().mockImplementation(async (prompt: string, options: any = {}) => {
        return {
          content: `Mock AI response for: ${prompt}`,
          tokensUsed: 100,
          costInCents: 0.01,
          model: options.model || 'gpt-4o-mini',
          provider: 'openai',
        };
      }),
      generateStudyPlan: jest.fn().mockResolvedValue({
        content: 'Mock study plan content',
        tokensUsed: 150,
        costInCents: 0.015,
      }),
      generateQuiz: jest.fn().mockResolvedValue({
        content: JSON.stringify([
          {
            question: 'Mock question 1',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
          },
        ]),
        tokensUsed: 120,
        costInCents: 0.012,
      }),
    };
  }

  /**
   * Create mock AITokenTrackerService
   */
  static createMockAITokenTrackerService() {
    return {
      checkBudget: jest.fn().mockResolvedValue(true),
      trackUsage: jest.fn().mockResolvedValue(true),
      getUserUsage: jest.fn().mockResolvedValue({
        dailyTokens: 100,
        monthlyTokens: 1000,
        dailyCost: 0.1,
        monthlyCost: 1.0,
      }),
      resetUserUsage: jest.fn().mockResolvedValue(true),
    };
  }

  /**
   * Create a mock request object for controllers
   */
  static createMockRequest(user?: any, body?: any, params?: any, query?: any) {
    return {
      user: user || TestDataFactory.createUser(),
      body: body || {},
      params: params || {},
      query: query || {},
      headers: {
        'user-agent': 'test-agent',
        accept: 'application/json',
        'content-type': 'application/json',
      },
      ip: '127.0.0.1',
      method: 'POST',
      url: '/test',
    };
  }

  /**
   * Create a mock response object for controllers
   */
  static createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
    };

    return res;
  }

  /**
   * Wait for async operations to complete
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Suppress console output during tests
   */
  static suppressConsole() {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  }

  /**
   * Restore console output
   */
  static restoreConsole() {
    jest.restoreAllMocks();
  }

  /**
   * Generate a mock JWT token for testing
   */
  static generateMockToken(payload: any = {}): string {
    const defaultPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'student',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    };

    return `header.${Buffer.from(JSON.stringify(defaultPayload)).toString('base64')}.signature`;
  }

  /**
   * Mock environment variables for testing
   */
  static mockEnvironment(envVars: Record<string, string>) {
    const originalEnv = { ...process.env };

    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });

    return () => {
      // Restore original environment
      process.env = originalEnv;
    };
  }

  /**
   * Create a spy on a method that preserves the original implementation
   */
  static spyOn<T extends object, K extends keyof T>(
    object: T,
    method: K,
  ): jest.SpyInstance<any, any> {
    return jest.spyOn(object, method as any);
  }

  /**
   * Create a deep clone of an object for test isolation
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Validate that an object matches expected structure
   */
  static expectObjectStructure(actual: any, expected: any) {
    expect(actual).toBeDefined();
    expect(typeof actual).toBe(typeof expected);

    if (Array.isArray(expected)) {
      expect(Array.isArray(actual)).toBe(true);
      if (expected.length > 0) {
        expect(actual.length).toBeGreaterThan(0);
        this.expectObjectStructure(actual[0], expected[0]);
      }
    } else if (typeof expected === 'object' && expected !== null) {
      Object.keys(expected).forEach((key) => {
        expect(actual).toHaveProperty(key);
        if (expected[key] !== null && typeof expected[key] === 'object') {
          this.expectObjectStructure(actual[key], expected[key]);
        }
      });
    }
  }

  /**
   * Assert that a promise rejects with a specific error
   */
  static async expectToThrow(
    promiseOrFunction: Promise<any> | (() => Promise<any>),
    expectedError?: string | RegExp | Error,
  ) {
    try {
      if (typeof promiseOrFunction === 'function') {
        await promiseOrFunction();
      } else {
        await promiseOrFunction;
      }
      throw new Error('Expected promise to reject but it resolved');
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === 'string') {
          expect(error.message).toContain(expectedError);
        } else if (expectedError instanceof RegExp) {
          expect(error.message).toMatch(expectedError);
        } else if (expectedError instanceof Error) {
          expect(error.message).toBe(expectedError.message);
        }
      }
      return error;
    }
  }
}
