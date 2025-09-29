import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '../../src/db/drizzle.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { EmailService } from '../../src/modules/email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class TestModuleHelper {
  /**
   * Creates a mock JWT service for testing
   */
  static createMockJwtService() {
    return {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest
        .fn()
        .mockReturnValue({ sub: 'user-id', email: 'test@example.com' }),
      decode: jest
        .fn()
        .mockReturnValue({ sub: 'user-id', email: 'test@example.com' }),
    };
  }

  /**
   * Creates a mock config service for testing
   */
  static createMockConfigService() {
    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '7d',
          AI_PROVIDER: 'router',
          AI_MODEL: 'gpt-4o-mini',
          AI_MAX_TOKENS: 500,
          AI_TEMPERATURE: 0.7,
          OPENAI_API_KEY: 'test-openai-key',
          DATABASE_URL: 'postgres://test:test@localhost:5432/test',
          REDIS_URL: 'redis://localhost:6379',
          EMAIL_FROM: 'test@studyteddy.com',
          APP_URL: 'http://localhost:3000',
        };
        return config[key] || defaultValue;
      }),
    };
  }

  /**
   * Creates a mock DrizzleService for testing
   */
  static createMockDrizzleService() {
    return {
      db: {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
        values: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      },
    };
  }

  /**
   * Creates a mock CacheService for testing
   */
  static createMockCacheService() {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(true),
      delPattern: jest.fn().mockResolvedValue(true),
      generateKey: jest.fn(
        (prefix: string, ...args: any[]) => `${prefix}:${args.join(':')}`,
      ),
      warm: jest
        .fn()
        .mockImplementation(async (key: string, factory: () => any) => {
          return await factory();
        }),
    };
  }

  /**
   * Creates a mock EmailService for testing
   */
  static createMockEmailService() {
    return {
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetSuccessEmail: jest.fn().mockResolvedValue(true),
      sendEmailVerificationEmail: jest.fn().mockResolvedValue(true),
    };
  }

  /**
   * Creates a mock EventEmitter2 for testing
   */
  static createMockEventEmitter() {
    return {
      emit: jest.fn().mockReturnValue(true),
      on: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  }

  /**
   * Creates a mock UsersService for testing
   */
  static createMockUsersService() {
    return {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByRefreshToken: jest.fn(),
      findByResetToken: jest.fn(),
      findByEmailVerificationToken: jest.fn(),
      createUser: jest.fn(),
      validatePassword: jest.fn(),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      updateRefreshToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      clearRefreshToken: jest.fn(),
      updatePasswordResetToken: jest.fn(),
      updatePassword: jest.fn(),
      clearPasswordResetToken: jest.fn(),
      verifyEmail: jest.fn(),
    };
  }

  /**
   * Creates a mock QueryOptimizerService for testing
   */
  static createMockQueryOptimizerService() {
    return {
      executeWithMetrics: jest
        .fn()
        .mockImplementation(async (queryFn: () => any) => {
          return await queryFn();
        }),
    };
  }

  /**
   * Creates a mock AIRouterService for testing
   */
  static createMockAIRouterService() {
    return {
      routeRequest: jest.fn().mockResolvedValue({
        content: 'Mock AI response',
        tokensUsed: 100,
        costInCents: 0.01,
        model: 'gpt-4o-mini',
        provider: 'openai',
      }),
    };
  }

  /**
   * Creates a mock AITokenTrackerService for testing
   */
  static createMockAITokenTrackerService() {
    return {
      checkBudget: jest.fn().mockResolvedValue(true),
      trackUsage: jest.fn().mockResolvedValue(true),
    };
  }

  /**
   * Creates a testing module with common providers mocked
   */
  static async createTestingModule(
    providers: any[] = [],
    imports: any[] = [],
  ): Promise<TestingModule> {
    const module = await Test.createTestingModule({
      imports,
      providers: [
        ...providers,
        {
          provide: JwtService,
          useValue: this.createMockJwtService(),
        },
        {
          provide: ConfigService,
          useValue: this.createMockConfigService(),
        },
        {
          provide: DrizzleService,
          useValue: this.createMockDrizzleService(),
        },
        {
          provide: CacheService,
          useValue: this.createMockCacheService(),
        },
        {
          provide: EmailService,
          useValue: this.createMockEmailService(),
        },
        {
          provide: EventEmitter2,
          useValue: this.createMockEventEmitter(),
        },
      ],
    }).compile();

    return module;
  }

  /**
   * Helper to setup database mocks for specific queries
   */
  static setupDatabaseMocks(drizzleService: any, mocks: Record<string, any>) {
    // Reset all mocks
    Object.values(drizzleService.db).forEach((fn: any) => {
      if (jest.isMockFunction(fn)) {
        fn.mockClear();
      }
    });

    // Apply specific mocks
    Object.entries(mocks).forEach(([method, returnValue]) => {
      if (drizzleService.db[method]) {
        if (method === 'returning') {
          drizzleService.db[method].mockResolvedValue(returnValue);
        } else {
          drizzleService.db[method].mockReturnValue(returnValue);
        }
      }
    });

    return drizzleService;
  }

  /**
   * Helper to create a chain of database method calls
   */
  static chainDatabaseMethods(drizzleService: any, finalResult: any) {
    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'from',
      'where',
      'orderBy',
      'limit',
      'offset',
      'leftJoin',
      'values',
      'set',
    ];

    methods.forEach((method) => {
      if (drizzleService.db[method]) {
        drizzleService.db[method].mockReturnValue(drizzleService.db);
      }
    });

    drizzleService.db.returning.mockResolvedValue(finalResult);

    return drizzleService;
  }
}
