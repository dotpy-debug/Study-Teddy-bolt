import {
  Injectable,
  ExecutionContext,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerStorage,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

export interface AIThrottlerOptions {
  limit: number;
  ttl: number;
  message?: string;
  errorMessage?: string;
}

export const AI_THROTTLE_KEY = 'ai_throttle';

/**
 * Custom AI Throttler Guard that provides enhanced error messaging
 * and user-based rate limiting for AI endpoints to prevent cost spikes
 */
@Injectable()
export class AIThrottlerGuard extends ThrottlerGuard {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly throttlerStorage: ThrottlerStorage,
  ) {
    super(
      {
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 10, // 10 requests per minute
          },
        ],
      },
      throttlerStorage,
      reflector,
    );
  }

  /**
   * Enhanced tracking with user-based rate limiting
   */
  protected async getTracker(req: any): Promise<string> {
    // Use user ID for authenticated users to enable per-user rate limiting
    const user = req.user;
    if (user?.userId || user?.sub) {
      return `ai_user_${user.userId || user.sub}`;
    }

    // Fallback to IP-based tracking for anonymous requests
    const ip = req.ips?.length
      ? req.ips[0]
      : req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent =
      req.get?.('user-agent') || req.headers?.['user-agent'] || 'unknown';
    const userAgentHash = Buffer.from(userAgent).toString('base64').slice(0, 8);

    return `ai_ip_${ip}_${userAgentHash}`;
  }

  /**
   * Skip throttling for admin users and health checks
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip for health checks
    if (request.url?.includes('/health') || request.url?.includes('/ping')) {
      return true;
    }

    // Skip for admin users if role is available
    const user = request.user;
    if (user?.role === 'admin' || user?.isAdmin) {
      return true;
    }

    return false;
  }
}
