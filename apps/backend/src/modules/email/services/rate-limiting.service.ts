import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RateLimitConfig,
  EmailError,
  EmailErrorCode,
} from '../types/email.types';

interface RateLimitData {
  count: number;
  resetTime: number;
  lastRequest: number;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly rateLimitConfig: RateLimitConfig;

  // Rate limiting storage
  private readonly hourlyLimits = new Map<string, RateLimitData>();
  private readonly dailyLimits = new Map<string, RateLimitData>();
  private readonly burstLimits = new Map<string, RateLimitData>();

  // Global rate limits
  private globalHourlyCount = 0;
  private globalDailyCount = 0;
  private lastGlobalReset = {
    hourly: Date.now(),
    daily: Date.now(),
  };

  constructor(private readonly configService: ConfigService) {
    this.rateLimitConfig = {
      hourlyLimit: this.configService.get<number>('EMAIL_HOURLY_LIMIT', 100),
      dailyLimit: this.configService.get<number>('EMAIL_DAILY_LIMIT', 1000),
      burstLimit: this.configService.get<number>('EMAIL_BURST_LIMIT', 10),
      burstWindowMs: this.configService.get<number>(
        'EMAIL_BURST_WINDOW_MS',
        60000,
      ), // 1 minute
    };

    this.logger.log(
      `Rate limiting initialized with config: ${JSON.stringify(this.rateLimitConfig)}`,
    );
  }

  /**
   * Check if email sending is allowed for a recipient
   */
  async checkRateLimit(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // Check global rate limits first
    await this.checkGlobalRateLimits();

    // Check per-email rate limits
    await this.checkEmailRateLimits(normalizedEmail);

    this.logger.debug(`Rate limit check passed for ${normalizedEmail}`);
  }

  /**
   * Increment counters after successful email send
   */
  async incrementCounter(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const now = Date.now();

    // Increment global counters
    this.globalHourlyCount++;
    this.globalDailyCount++;

    // Increment per-email counters
    this.incrementEmailCounter(normalizedEmail, 'hourly', now);
    this.incrementEmailCounter(normalizedEmail, 'daily', now);
    this.incrementEmailCounter(normalizedEmail, 'burst', now);

    this.logger.debug(`Counters incremented for ${normalizedEmail}`);
  }

  /**
   * Get rate limit status for an email
   */
  async getRateLimitStatus(email: string): Promise<{
    hourly: { current: number; limit: number; resetTime: number };
    daily: { current: number; limit: number; resetTime: number };
    burst: { current: number; limit: number; resetTime: number };
    global: { hourly: number; daily: number };
  }> {
    const normalizedEmail = email.toLowerCase();

    this.resetExpiredCounters();

    const hourlyData = this.hourlyLimits.get(normalizedEmail);
    const dailyData = this.dailyLimits.get(normalizedEmail);
    const burstData = this.burstLimits.get(normalizedEmail);

    return {
      hourly: {
        current: hourlyData?.count || 0,
        limit: this.rateLimitConfig.hourlyLimit,
        resetTime: hourlyData?.resetTime || Date.now() + 3600000,
      },
      daily: {
        current: dailyData?.count || 0,
        limit: this.rateLimitConfig.dailyLimit,
        resetTime: dailyData?.resetTime || Date.now() + 86400000,
      },
      burst: {
        current: burstData?.count || 0,
        limit: this.rateLimitConfig.burstLimit,
        resetTime:
          burstData?.resetTime ||
          Date.now() + this.rateLimitConfig.burstWindowMs,
      },
      global: {
        hourly: this.globalHourlyCount,
        daily: this.globalDailyCount,
      },
    };
  }

  /**
   * Reset rate limits for an email (admin function)
   */
  async resetRateLimits(email?: string): Promise<void> {
    if (email) {
      const normalizedEmail = email.toLowerCase();
      this.hourlyLimits.delete(normalizedEmail);
      this.dailyLimits.delete(normalizedEmail);
      this.burstLimits.delete(normalizedEmail);
      this.logger.log(`Rate limits reset for ${normalizedEmail}`);
    } else {
      // Reset global limits
      this.globalHourlyCount = 0;
      this.globalDailyCount = 0;
      this.lastGlobalReset.hourly = Date.now();
      this.lastGlobalReset.daily = Date.now();
      this.logger.log('Global rate limits reset');
    }
  }

  /**
   * Get rate limiting statistics
   */
  getRateLimitingStats(): {
    globalHourly: number;
    globalDaily: number;
    trackedEmails: number;
    memoryUsage: string;
  } {
    return {
      globalHourly: this.globalHourlyCount,
      globalDaily: this.globalDailyCount,
      trackedEmails: new Set([
        ...this.hourlyLimits.keys(),
        ...this.dailyLimits.keys(),
        ...this.burstLimits.keys(),
      ]).size,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    };
  }

  /**
   * Check if rate limit would be exceeded for a batch send
   */
  async checkBatchRateLimit(
    emails: string[],
    estimatedSendTime?: number,
  ): Promise<{
    allowed: boolean;
    maxAllowed: number;
    deniedEmails: string[];
  }> {
    const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase()))];
    const sendTime = estimatedSendTime || Date.now();
    const deniedEmails: string[] = [];
    let maxAllowed = 0;

    for (const email of uniqueEmails) {
      try {
        await this.checkRateLimit(email);
        maxAllowed++;
      } catch (error) {
        deniedEmails.push(email);
      }
    }

    return {
      allowed: deniedEmails.length === 0,
      maxAllowed,
      deniedEmails,
    };
  }

  /**
   * Private helper methods
   */
  private async checkGlobalRateLimits(): Promise<void> {
    this.resetGlobalCountersIfNeeded();

    const globalHourlyLimit = this.configService.get<number>(
      'EMAIL_GLOBAL_HOURLY_LIMIT',
      10000,
    );
    const globalDailyLimit = this.configService.get<number>(
      'EMAIL_GLOBAL_DAILY_LIMIT',
      50000,
    );

    if (this.globalHourlyCount >= globalHourlyLimit) {
      throw this.createRateLimitError(
        'Global hourly rate limit exceeded',
        'hourly',
        this.lastGlobalReset.hourly + 3600000,
      );
    }

    if (this.globalDailyCount >= globalDailyLimit) {
      throw this.createRateLimitError(
        'Global daily rate limit exceeded',
        'daily',
        this.lastGlobalReset.daily + 86400000,
      );
    }
  }

  private async checkEmailRateLimits(email: string): Promise<void> {
    this.resetExpiredCounters();

    const hourlyData = this.hourlyLimits.get(email);
    const dailyData = this.dailyLimits.get(email);
    const burstData = this.burstLimits.get(email);

    // Check hourly limit
    if (hourlyData && hourlyData.count >= this.rateLimitConfig.hourlyLimit) {
      throw this.createRateLimitError(
        `Hourly rate limit exceeded for ${email}`,
        'hourly',
        hourlyData.resetTime,
      );
    }

    // Check daily limit
    if (dailyData && dailyData.count >= this.rateLimitConfig.dailyLimit) {
      throw this.createRateLimitError(
        `Daily rate limit exceeded for ${email}`,
        'daily',
        dailyData.resetTime,
      );
    }

    // Check burst limit
    if (burstData && burstData.count >= this.rateLimitConfig.burstLimit) {
      throw this.createRateLimitError(
        `Burst rate limit exceeded for ${email}`,
        'burst',
        burstData.resetTime,
      );
    }
  }

  private incrementEmailCounter(
    email: string,
    type: 'hourly' | 'daily' | 'burst',
    now: number,
  ): void {
    const storage = this.getStorageForType(type);
    const windowMs = this.getWindowMsForType(type);

    let data = storage.get(email);

    if (!data || now >= data.resetTime) {
      data = {
        count: 1,
        resetTime: now + windowMs,
        lastRequest: now,
      };
    } else {
      data.count++;
      data.lastRequest = now;
    }

    storage.set(email, data);
  }

  private resetExpiredCounters(): void {
    const now = Date.now();

    this.resetExpiredCountersForStorage(this.hourlyLimits, now);
    this.resetExpiredCountersForStorage(this.dailyLimits, now);
    this.resetExpiredCountersForStorage(this.burstLimits, now);

    this.resetGlobalCountersIfNeeded();
  }

  private resetExpiredCountersForStorage(
    storage: Map<string, RateLimitData>,
    now: number,
  ): void {
    for (const [email, data] of storage.entries()) {
      if (now >= data.resetTime) {
        storage.delete(email);
      }
    }
  }

  private resetGlobalCountersIfNeeded(): void {
    const now = Date.now();

    // Reset hourly counter
    if (now - this.lastGlobalReset.hourly >= 3600000) {
      this.globalHourlyCount = 0;
      this.lastGlobalReset.hourly = now;
    }

    // Reset daily counter
    if (now - this.lastGlobalReset.daily >= 86400000) {
      this.globalDailyCount = 0;
      this.lastGlobalReset.daily = now;
    }
  }

  private getStorageForType(
    type: 'hourly' | 'daily' | 'burst',
  ): Map<string, RateLimitData> {
    switch (type) {
      case 'hourly':
        return this.hourlyLimits;
      case 'daily':
        return this.dailyLimits;
      case 'burst':
        return this.burstLimits;
    }
  }

  private getWindowMsForType(type: 'hourly' | 'daily' | 'burst'): number {
    switch (type) {
      case 'hourly':
        return 3600000; // 1 hour
      case 'daily':
        return 86400000; // 24 hours
      case 'burst':
        return this.rateLimitConfig.burstWindowMs;
    }
  }

  private createRateLimitError(
    message: string,
    type: 'hourly' | 'daily' | 'burst',
    resetTime: number,
  ): EmailError {
    return {
      code: EmailErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      details: {
        type,
        resetTime,
        resetIn: Math.max(0, resetTime - Date.now()),
      },
      retryable: true,
    };
  }

  /**
   * Cleanup old data to prevent memory leaks
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean up hourly limits older than 2 hours
      for (const [email, data] of this.hourlyLimits.entries()) {
        if (now - data.lastRequest > 7200000) {
          // 2 hours
          this.hourlyLimits.delete(email);
          cleanedCount++;
        }
      }

      // Clean up daily limits older than 2 days
      for (const [email, data] of this.dailyLimits.entries()) {
        if (now - data.lastRequest > 172800000) {
          // 2 days
          this.dailyLimits.delete(email);
          cleanedCount++;
        }
      }

      // Clean up burst limits older than 1 hour
      for (const [email, data] of this.burstLimits.entries()) {
        if (now - data.lastRequest > 3600000) {
          // 1 hour
          this.burstLimits.delete(email);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old rate limit records`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup rate limiting data', error);
    }
  }

  /**
   * Schedule periodic cleanup
   */
  onModuleInit(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanup();
    }, 3600000); // 1 hour

    this.logger.log('Rate limiting service initialized');
  }
}
