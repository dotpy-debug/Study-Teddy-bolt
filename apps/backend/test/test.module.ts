import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { TestDrizzleService } from './test-drizzle.service';
import { DrizzleService } from '../src/db/drizzle.service';

// Mock services for testing
export class MockCacheService {
  private cache = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    this.cache.set(key, value);
    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl * 1000);
    }
    return true;
  }

  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<boolean> {
    const keys = Array.from(this.cache.keys()).filter((key) =>
      key.includes(pattern.replace('*', '')),
    );
    keys.forEach((key) => this.cache.delete(key));
    return true;
  }

  generateKey(prefix: string, ...args: any[]): string {
    return `${prefix}:${args.join(':')}`;
  }

  async warm(key: string, factory: () => Promise<any>): Promise<any> {
    const cached = await this.get(key);
    if (cached) return cached;

    const value = await factory();
    await this.set(key, value);
    return value;
  }
}

export class MockEmailService {
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    console.log(`Mock: Sending welcome email to ${email} for ${name}`);
    return true;
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    console.log(`Mock: Sending password reset email to ${email} with token ${resetToken}`);
    return true;
  }

  async sendPasswordResetSuccessEmail(email: string): Promise<boolean> {
    console.log(`Mock: Sending password reset success email to ${email}`);
    return true;
  }

  async sendEmailVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    console.log(`Mock: Sending email verification to ${email} with token ${verificationToken}`);
    return true;
  }
}

export class MockAIRouterService {
  async routeRequest(prompt: string, options?: any): Promise<any> {
    return {
      content: `Mock AI response for: ${prompt}`,
      tokensUsed: 100,
      costInCents: 0.01,
      model: 'mock-model',
      provider: 'mock',
    };
  }
}

export class MockAITokenTrackerService {
  async checkBudget(userId: string): Promise<boolean> {
    return true;
  }

  async trackUsage(userId: string, tokensUsed: number, costInCents: number): Promise<boolean> {
    console.log(
      `Mock: Tracking ${tokensUsed} tokens for user ${userId}, cost: ${costInCents} cents`,
    );
    return true;
  }
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 1 minute
      max: 100,
    }),
  ],
  providers: [
    TestDrizzleService,
    {
      provide: DrizzleService,
      useClass: TestDrizzleService,
    },
    {
      provide: 'CacheService',
      useClass: MockCacheService,
    },
    {
      provide: 'EmailService',
      useClass: MockEmailService,
    },
    {
      provide: 'AIRouterService',
      useClass: MockAIRouterService,
    },
    {
      provide: 'AITokenTrackerService',
      useClass: MockAITokenTrackerService,
    },
  ],
  exports: [
    TestDrizzleService,
    DrizzleService,
    'CacheService',
    'EmailService',
    'AIRouterService',
    'AITokenTrackerService',
  ],
})
export class TestModule {}
