import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many email requests from this user, please try again later.',
};

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const EmailRateLimit = (options: Partial<RateLimitOptions> = {}) =>
  Reflect.metadata('emailRateLimit', { ...DEFAULT_RATE_LIMIT, ...options });

@Injectable()
export class EmailRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(EmailRateLimitGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      'emailRateLimit',
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(request, rateLimitOptions);

    const now = Date.now();
    const windowStart = now - rateLimitOptions.windowMs;

    // Clean up expired entries
    this.cleanupExpiredEntries(windowStart);

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + rateLimitOptions.windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= rateLimitOptions.maxRequests) {
      const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);

      this.logger.warn(`Rate limit exceeded for key: ${key}`, {
        count: entry.count,
        limit: rateLimitOptions.maxRequests,
        resetInSeconds: resetTimeSeconds,
      });

      throw new HttpException(
        {
          message: rateLimitOptions.message,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: resetTimeSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.maxRequests);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, rateLimitOptions.maxRequests - entry.count),
    );
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    this.logger.debug(`Rate limit check passed for key: ${key}`, {
      count: entry.count,
      limit: rateLimitOptions.maxRequests,
      remaining: rateLimitOptions.maxRequests - entry.count,
    });

    return true;
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    // Default key generation based on user ID or IP
    const userId = request.user?.['id'] || request.user?.['sub'];
    const ip = request.ip || request.connection.remoteAddress;

    return `email_rate_limit:${userId || ip}`;
  }

  private cleanupExpiredEntries(windowStart: number): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }
  }
}
