import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CustomThrottlerGuard,
  APIThrottlerGuard,
  AIThrottlerGuard,
  AuthThrottlerGuard,
} from '../guards/throttle.guard';

/**
 * Apply default API rate limiting
 * 100 requests per minute
 */
export function APIThrottle() {
  return applyDecorators(
    Throttle({ default: { limit: 100, ttl: 60000 } }),
    UseGuards(APIThrottlerGuard),
  );
}

/**
 * Apply strict rate limiting for sensitive operations
 * 20 requests per minute
 */
export function StrictThrottle() {
  return applyDecorators(
    Throttle({ strict: { limit: 20, ttl: 60000 } }),
    UseGuards(CustomThrottlerGuard),
  );
}

/**
 * Apply authentication rate limiting
 * 5 attempts per 15 minutes
 */
export function AuthThrottle() {
  return applyDecorators(
    Throttle({ auth: { limit: 5, ttl: 900000 } }),
    UseGuards(AuthThrottlerGuard),
  );
}

/**
 * Apply AI endpoint rate limiting
 * 10 requests per minute for free users
 * 50 requests per minute for premium users
 */
export function AIThrottle() {
  return applyDecorators(Throttle({ ai: { limit: 10, ttl: 60000 } }), UseGuards(AIThrottlerGuard));
}

/**
 * Apply custom throttling with specific limits
 */
export function CustomThrottle(limit: number, ttl: number) {
  return applyDecorators(Throttle({ default: { limit, ttl } }), UseGuards(CustomThrottlerGuard));
}

/**
 * Apply high-frequency throttling for real-time endpoints
 * 300 requests per minute (5 per second)
 */
export function HighFrequencyThrottle() {
  return applyDecorators(
    Throttle({ default: { limit: 300, ttl: 60000 } }),
    UseGuards(APIThrottlerGuard),
  );
}

/**
 * Apply bulk operation throttling
 * 10 requests per 5 minutes
 */
export function BulkOperationThrottle() {
  return applyDecorators(
    Throttle({ default: { limit: 10, ttl: 300000 } }),
    UseGuards(CustomThrottlerGuard),
  );
}

/**
 * Apply upload throttling
 * 5 uploads per minute
 */
export function UploadThrottle() {
  return applyDecorators(
    Throttle({ default: { limit: 5, ttl: 60000 } }),
    UseGuards(CustomThrottlerGuard),
  );
}
