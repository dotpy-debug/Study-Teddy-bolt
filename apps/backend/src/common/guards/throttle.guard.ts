import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Request } from 'express';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Request & { user?: AuthenticatedUser },
  ): Promise<string> {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = req.user?.userId;
    if (userId) {
      return `user:${userId}`;
    }
    return req.ip ?? 'unknown';
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip throttling for health check endpoints
    if (request.url === '/health' || request.url === '/metrics') {
      return true;
    }

    // Skip throttling for trusted internal services
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    if (request.ip && trustedIPs.includes(request.ip)) {
      return true;
    }

    return false;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const userId = request.user?.userId || 'anonymous';

    console.warn(`Rate limit exceeded for ${userId} from IP ${request.ip}`);

    throw new ThrottlerException(
      'Rate limit exceeded. Please try again later.',
    );
  }
}

// Specific guards for different endpoints
@Injectable()
export class APIThrottlerGuard extends CustomThrottlerGuard {
  protected async getTracker(
    req: Request & { user?: AuthenticatedUser },
  ): Promise<string> {
    const userId = req.user?.userId;
    if (userId) {
      return `api:user:${userId}`;
    }
    return `api:ip:${req.ip ?? 'unknown'}`;
  }
}

@Injectable()
export class AIThrottlerGuard extends CustomThrottlerGuard {
  protected async getTracker(
    req: Request & { user?: AuthenticatedUser },
  ): Promise<string> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ThrottlerException('Authentication required for AI endpoints');
    }
    return `ai:user:${userId}`;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    // Check if user has premium plan (if implemented)
    const user = request.user;
    if (user?.planType === 'premium') {
      return true; // Premium users get higher limits
    }

    return super.shouldSkip(context);
  }
}

@Injectable()
export class AuthThrottlerGuard extends CustomThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // For auth endpoints, primarily use IP to prevent brute force
    return `auth:ip:${req.ip ?? 'unknown'}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();

    console.warn(
      `Auth rate limit exceeded from IP ${request.ip} for endpoint ${request.url}`,
    );

    throw new ThrottlerException(
      'Too many authentication attempts. Please try again later.',
    );
  }
}
