import { Throttle } from '@nestjs/throttler';

// Sensible defaults for AI rate limiting to prevent cost spikes
const DEFAULT_AI_LIMITS = {
  chat: { limit: 10, ttl: 60000 },
  practiceQuestions: { limit: 5, ttl: 60000 },
  studyPlan: { limit: 3, ttl: 60000 },
  heavy: { limit: 2, ttl: 60000 },
  light: { limit: 20, ttl: 60000 },
};

/**
 * Enhanced throttling decorator for AI endpoints with user-based rate limiting
 * Uses the standard @Throttle decorator but with AI-specific limits
 */
export const AIThrottle = (limit: number, ttl: number) =>
  Throttle({ default: { limit, ttl } });

/**
 * Pre-configured throttling decorators for common AI operations
 */

/**
 * Standard chat throttling: 10 requests per minute
 * Suitable for general AI conversations
 */
export const AIChat = () =>
  AIThrottle(DEFAULT_AI_LIMITS.chat.limit, DEFAULT_AI_LIMITS.chat.ttl);

/**
 * Practice questions throttling: 5 requests per minute
 * More restrictive due to higher computational cost
 */
export const AIPracticeQuestions = () =>
  AIThrottle(
    DEFAULT_AI_LIMITS.practiceQuestions.limit,
    DEFAULT_AI_LIMITS.practiceQuestions.ttl,
  );

/**
 * Study plan throttling: 3 requests per minute
 * Most restrictive due to complex generation process
 */
export const AIStudyPlan = () =>
  AIThrottle(
    DEFAULT_AI_LIMITS.studyPlan.limit,
    DEFAULT_AI_LIMITS.studyPlan.ttl,
  );

/**
 * Heavy AI operations throttling: 2 requests per minute
 * For operations that consume significant AI resources
 */
export const AIHeavy = () =>
  AIThrottle(DEFAULT_AI_LIMITS.heavy.limit, DEFAULT_AI_LIMITS.heavy.ttl);

/**
 * Light AI operations throttling: 20 requests per minute
 * For simple AI operations like stats or history
 */
export const AILight = () =>
  AIThrottle(DEFAULT_AI_LIMITS.light.limit, DEFAULT_AI_LIMITS.light.ttl);
