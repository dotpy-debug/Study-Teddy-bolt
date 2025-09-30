import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../modules/redis/redis.service';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDuration?: number; // Block duration after limit exceeded (ms)
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  message?: string;
  headers?: boolean; // Include rate limit headers in response
}

export interface RateLimitRule {
  name: string;
  pattern: string | RegExp;
  config: RateLimitConfig;
  enabled: boolean;
  priority: number; // Higher priority rules are checked first
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
  message?: string;
}

export interface BurstProtectionConfig {
  enabled: boolean;
  burstSize: number; // Max requests in burst window
  burstWindowMs: number; // Burst time window
  penaltyMultiplier: number; // Penalty multiplier for burst violations
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly rules: Map<string, RateLimitRule> = new Map();
  private readonly defaultConfig: RateLimitConfig;
  private readonly burstProtection: BurstProtectionConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.defaultConfig = {
      windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
      maxRequests: this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
      blockDuration: this.configService.get<number>('RATE_LIMIT_BLOCK_DURATION_MS', 900000), // 15 minutes
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      headers: true,
      message: 'Too many requests, please try again later',
    };

    this.burstProtection = {
      enabled: this.configService.get<boolean>('BURST_PROTECTION_ENABLED', true),
      burstSize: this.configService.get<number>('BURST_SIZE', 10),
      burstWindowMs: this.configService.get<number>('BURST_WINDOW_MS', 10000), // 10 seconds
      penaltyMultiplier: this.configService.get<number>('BURST_PENALTY_MULTIPLIER', 2),
    };

    this.initializeDefaultRules();
  }

  /**
   * Initialize default rate limiting rules
   */
  private initializeDefaultRules(): void {
    // General API endpoints
    this.addRule({
      name: 'general_api',
      pattern: '/api/*',
      config: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        headers: true,
      },
      enabled: true,
      priority: 1,
    });

    // Authentication endpoints
    this.addRule({
      name: 'auth_login',
      pattern: /^\/api\/auth\/(login|register)$/,
      config: {
        windowMs: 300000, // 5 minutes
        maxRequests: 5,
        blockDuration: 900000, // 15 minutes
        message: 'Too many authentication attempts, please try again in 15 minutes',
        headers: true,
      },
      enabled: true,
      priority: 10,
    });

    // Password reset endpoints
    this.addRule({
      name: 'password_reset',
      pattern: /^\/api\/auth\/(forgot-password|reset-password)$/,
      config: {
        windowMs: 3600000, // 1 hour
        maxRequests: 3,
        blockDuration: 3600000, // 1 hour
        message: 'Too many password reset attempts, please try again in 1 hour',
        headers: true,
      },
      enabled: true,
      priority: 10,
    });

    // AI endpoints - tiered limits
    this.addRule({
      name: 'ai_chat',
      pattern: /^\/api\/ai\/chat$/,
      config: {
        windowMs: 60000, // 1 minute
        maxRequests: 10,
        message: 'AI chat rate limit exceeded, please slow down',
        headers: true,
      },
      enabled: true,
      priority: 8,
    });

    this.addRule({
      name: 'ai_practice',
      pattern: /^\/api\/ai\/practice$/,
      config: {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        message: 'AI practice questions rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 8,
    });

    this.addRule({
      name: 'ai_study_plans',
      pattern: /^\/api\/ai\/study-plans$/,
      config: {
        windowMs: 300000, // 5 minutes
        maxRequests: 3,
        message: 'AI study plan generation rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 8,
    });

    this.addRule({
      name: 'ai_heavy_operations',
      pattern: /^\/api\/ai\/(analyze|generate)$/,
      config: {
        windowMs: 300000, // 5 minutes
        maxRequests: 2,
        message: 'AI heavy operations rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 9,
    });

    // File upload endpoints
    this.addRule({
      name: 'file_upload',
      pattern: /^\/api\/.*\/upload$/,
      config: {
        windowMs: 300000, // 5 minutes
        maxRequests: 10,
        message: 'File upload rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 7,
    });

    // Search endpoints
    this.addRule({
      name: 'search',
      pattern: /^\/api\/.*\/search$/,
      config: {
        windowMs: 60000, // 1 minute
        maxRequests: 30,
        message: 'Search rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 5,
    });

    // Admin endpoints
    this.addRule({
      name: 'admin_endpoints',
      pattern: /^\/api\/admin\/.*$/,
      config: {
        windowMs: 60000, // 1 minute
        maxRequests: 50,
        message: 'Admin endpoint rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 9,
    });

    // Email endpoints
    this.addRule({
      name: 'email_endpoints',
      pattern: /^\/api\/.*\/email$/,
      config: {
        windowMs: 3600000, // 1 hour
        maxRequests: 5,
        message: 'Email sending rate limit exceeded',
        headers: true,
      },
      enabled: true,
      priority: 8,
    });

    this.logger.log('Rate limiting rules initialized', {
      ruleCount: this.rules.size,
      rules: Array.from(this.rules.keys()),
    });
  }

  /**
   * Add a rate limiting rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.name, rule);
    this.logger.log('Rate limiting rule added', {
      name: rule.name,
      pattern: rule.pattern.toString(),
      enabled: rule.enabled,
    });
  }

  /**
   * Remove a rate limiting rule
   */
  removeRule(ruleName: string): boolean {
    const removed = this.rules.delete(ruleName);
    if (removed) {
      this.logger.log('Rate limiting rule removed', { name: ruleName });
    }
    return removed;
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(path: string, identifier: string, req?: any): Promise<RateLimitResult> {
    try {
      // Find matching rule with highest priority
      const matchingRule = this.findMatchingRule(path);
      const config = matchingRule ? matchingRule.config : this.defaultConfig;

      // Generate cache key
      const key = this.generateKey(matchingRule?.name || 'default', identifier, config, req);

      // Check burst protection first
      if (this.burstProtection.enabled) {
        const burstResult = await this.checkBurstProtection(key, config);
        if (!burstResult.allowed) {
          return burstResult;
        }
      }

      // Check main rate limit
      const result = await this.checkLimit(key, config);

      // Log rate limit violations
      if (!result.allowed) {
        this.logger.warn('Rate limit exceeded', {
          rule: matchingRule?.name || 'default',
          path,
          identifier,
          limit: result.limit,
          remaining: result.remaining,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Rate limit check failed', {
        path,
        identifier,
        error: error.message,
      });

      // Fail open - allow request if rate limiting service fails
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetTime: new Date(),
      };
    }
  }

  /**
   * Check rate limit and throw exception if exceeded
   */
  async enforceRateLimit(path: string, identifier: string, req?: any): Promise<void> {
    const result = await this.checkRateLimit(path, identifier, req);

    if (!result.allowed) {
      throw new HttpException(
        {
          message: result.message || 'Rate limit exceeded',
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string, ruleName?: string): Promise<void> {
    try {
      if (ruleName) {
        const key = this.generateKey(ruleName, identifier);
        await this.redisService.del(key);
        await this.redisService.del(`${key}:burst`);
      } else {
        // Reset all rate limits for identifier
        const pattern = `ratelimit:*:${identifier}`;
        const keys = await this.redisService.keys(pattern);

        if (keys.length > 0) {
          await this.redisService.del(...keys);
        }
      }

      this.logger.log('Rate limit reset', { identifier, ruleName });
    } catch (error) {
      this.logger.error('Rate limit reset failed', {
        identifier,
        ruleName,
        error: error.message,
      });
    }
  }

  /**
   * Get rate limit status for identifier
   */
  async getRateLimitStatus(identifier: string): Promise<{
    [ruleName: string]: RateLimitResult;
  }> {
    const status: { [ruleName: string]: RateLimitResult } = {};

    for (const [name, rule] of this.rules) {
      if (!rule.enabled) continue;

      const key = this.generateKey(name, identifier, rule.config);
      const result = await this.getCurrentLimit(key, rule.config);
      status[name] = result;
    }

    return status;
  }

  /**
   * Private methods
   */
  private findMatchingRule(path: string): RateLimitRule | null {
    const matchingRules = Array.from(this.rules.values())
      .filter((rule) => rule.enabled && this.pathMatches(path, rule.pattern))
      .sort((a, b) => b.priority - a.priority);

    return matchingRules.length > 0 ? matchingRules[0] : null;
  }

  private pathMatches(path: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return path.startsWith(pattern.replace('*', ''));
    }
    return pattern.test(path);
  }

  private generateKey(
    ruleName: string,
    identifier: string,
    config?: RateLimitConfig,
    req?: any,
  ): string {
    let key = `ratelimit:${ruleName}:${identifier}`;

    if (config?.keyGenerator && req) {
      try {
        const customKey = config.keyGenerator(req);
        key = `ratelimit:${ruleName}:${customKey}`;
      } catch (error) {
        this.logger.warn('Custom key generator failed, using default', {
          error: error.message,
        });
      }
    }

    return key;
  }

  private async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis sorted set for sliding window
    const pipeline = this.redisService.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Count current requests
    pipeline.zcard(key);

    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    const currentCount = results[2][1] as number;

    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTime = new Date(now + config.windowMs);

    let allowed = currentCount <= config.maxRequests;
    let retryAfter: number | undefined;

    // Check if blocked due to previous violation
    if (config.blockDuration && !allowed) {
      const blockKey = `${key}:blocked`;
      const isBlocked = await this.redisService.get(blockKey);

      if (isBlocked) {
        const blockUntil = parseInt(isBlocked);
        if (now < blockUntil) {
          allowed = false;
          retryAfter = Math.ceil((blockUntil - now) / 1000);
        } else {
          await this.redisService.del(blockKey);
        }
      } else if (!allowed && config.blockDuration) {
        // Set block
        const blockUntil = now + config.blockDuration;
        await this.redisService.setex(
          blockKey,
          Math.ceil(config.blockDuration / 1000),
          blockUntil.toString(),
        );
        retryAfter = Math.ceil(config.blockDuration / 1000);
      }
    }

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter,
      message: config.message,
    };
  }

  private async checkBurstProtection(
    baseKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const burstKey = `${baseKey}:burst`;
    const now = Date.now();
    const burstWindowStart = now - this.burstProtection.burstWindowMs;

    // Use Redis sorted set for burst window
    const pipeline = this.redisService.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(burstKey, 0, burstWindowStart);

    // Add current request
    pipeline.zadd(burstKey, now, `${now}-${Math.random()}`);

    // Count current requests in burst window
    pipeline.zcard(burstKey);

    // Set expiration
    pipeline.expire(burstKey, Math.ceil(this.burstProtection.burstWindowMs / 1000));

    const results = await pipeline.exec();
    const burstCount = results[2][1] as number;

    const allowed = burstCount <= this.burstProtection.burstSize;

    if (!allowed) {
      const penaltyDuration = config.windowMs * this.burstProtection.penaltyMultiplier;
      const retryAfter = Math.ceil(penaltyDuration / 1000);

      this.logger.warn('Burst protection triggered', {
        burstCount,
        burstSize: this.burstProtection.burstSize,
        penaltyDuration,
      });

      return {
        allowed: false,
        limit: this.burstProtection.burstSize,
        remaining: 0,
        resetTime: new Date(now + penaltyDuration),
        retryAfter,
        message: 'Burst protection: too many requests in short time',
      };
    }

    return {
      allowed: true,
      limit: this.burstProtection.burstSize,
      remaining: this.burstProtection.burstSize - burstCount,
      resetTime: new Date(now + this.burstProtection.burstWindowMs),
    };
  }

  private async getCurrentLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Count current requests
    const currentCount = await this.redisService.zcount(key, windowStart, now);
    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTime = new Date(now + config.windowMs);

    return {
      allowed: currentCount <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetTime,
    };
  }

  /**
   * Get all rules
   */
  getAllRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update rule configuration
   */
  updateRule(ruleName: string, updates: Partial<RateLimitRule>): boolean {
    const rule = this.rules.get(ruleName);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.rules.set(ruleName, rule);

    this.logger.log('Rate limiting rule updated', {
      name: ruleName,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * Get configuration
   */
  getConfiguration(): {
    defaultConfig: RateLimitConfig;
    burstProtection: BurstProtectionConfig;
    ruleCount: number;
  } {
    return {
      defaultConfig: { ...this.defaultConfig },
      burstProtection: { ...this.burstProtection },
      ruleCount: this.rules.size,
    };
  }
}
