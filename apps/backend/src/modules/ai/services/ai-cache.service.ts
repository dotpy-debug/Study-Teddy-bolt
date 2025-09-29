import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../common/cache/cache.service';
import { AIActionType, AIResponse } from './ai-provider.service';
import { createHash } from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix: string;
  enabled: boolean;
}

export interface CachedResponse extends AIResponse {
  cached: true;
  cachedAt: Date;
  originalRequestId?: string;
}

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);

  // Cache configurations for different AI patterns
  private readonly cacheConfigs: Record<AIActionType, CacheConfig> = {
    [AIActionType.TASKIFY]: {
      ttl: 300, // 5 minutes - task generation can be cached for quick reuse
      keyPrefix: 'ai_taskify',
      enabled: true,
    },
    [AIActionType.BREAKDOWN]: {
      ttl: 120, // 2 minutes - breakdown results change more frequently
      keyPrefix: 'ai_breakdown',
      enabled: true,
    },
    [AIActionType.TUTOR]: {
      ttl: 60, // 1 minute - educational content should be fresh
      keyPrefix: 'ai_tutor',
      enabled: true,
    },
    [AIActionType.CHAT]: {
      ttl: 3600, // 1 hour - general chat can be cached longer
      keyPrefix: 'ai_chat',
      enabled: true,
    },
  };

  constructor(private cacheService: CacheService) {}

  /**
   * Generate a cache key for an AI request
   */
  generateCacheKey(
    actionType: AIActionType,
    prompt: string,
    systemPrompt?: string,
    userId?: string,
  ): string {
    const config = this.cacheConfigs[actionType];

    // Create a hash of the prompt content for deterministic caching
    const contentHash = this.hashContent(prompt, systemPrompt);

    // Include user ID for personalized caching (optional)
    const userPart = userId ? `_user_${userId}` : '';

    return `${config.keyPrefix}_${contentHash}${userPart}`;
  }

  /**
   * Get cached response if available and valid
   */
  async getCachedResponse(
    actionType: AIActionType,
    prompt: string,
    systemPrompt?: string,
    userId?: string,
  ): Promise<CachedResponse | null> {
    const config = this.cacheConfigs[actionType];

    if (!config.enabled) {
      this.logger.debug(`Caching disabled for action type: ${actionType}`);
      return null;
    }

    const cacheKey = this.generateCacheKey(
      actionType,
      prompt,
      systemPrompt,
      userId,
    );

    try {
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for ${actionType}: ${cacheKey}`);
        return {
          ...cached,
          cached: true,
          cachedAt: new Date(),
        };
      }

      this.logger.debug(`Cache miss for ${actionType}: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache retrieval error for ${actionType}:`, error);
      return null;
    }
  }

  /**
   * Cache an AI response
   */
  async cacheResponse(
    actionType: AIActionType,
    prompt: string,
    response: AIResponse,
    systemPrompt?: string,
    userId?: string,
  ): Promise<void> {
    const config = this.cacheConfigs[actionType];

    if (!config.enabled) {
      return;
    }

    const cacheKey = this.generateCacheKey(
      actionType,
      prompt,
      systemPrompt,
      userId,
    );

    try {
      // Don't cache responses that had errors or are incomplete
      if (!response.content || response.content.trim().length === 0) {
        this.logger.debug(`Skipping cache for empty response: ${actionType}`);
        return;
      }

      // Don't cache responses that are too expensive (might indicate errors)
      if (response.tokensUsed > 5000) {
        this.logger.debug(
          `Skipping cache for expensive response: ${response.tokensUsed} tokens`,
        );
        return;
      }

      await this.cacheService.set(cacheKey, response, config.ttl);

      this.logger.debug(
        `Cached response for ${actionType}: ${cacheKey} (TTL: ${config.ttl}s, tokens: ${response.tokensUsed})`,
      );
    } catch (error) {
      this.logger.error(`Cache storage error for ${actionType}:`, error);
      // Don't throw - caching failures shouldn't break AI requests
    }
  }

  /**
   * Invalidate cache for specific patterns or users
   */
  async invalidateCache(
    actionType?: AIActionType,
    userId?: string,
    pattern?: string,
  ): Promise<void> {
    try {
      if (actionType && userId) {
        // Invalidate all cache entries for a specific action type and user
        const config = this.cacheConfigs[actionType];
        const keyPattern = `${config.keyPrefix}_*_user_${userId}`;
        await this.cacheService.delPattern(keyPattern);
        this.logger.debug(
          `Invalidated cache for ${actionType} and user ${userId}`,
        );
      } else if (actionType) {
        // Invalidate all cache entries for a specific action type
        const config = this.cacheConfigs[actionType];
        const keyPattern = `${config.keyPrefix}_*`;
        await this.cacheService.delPattern(keyPattern);
        this.logger.debug(`Invalidated all cache for ${actionType}`);
      } else if (pattern) {
        // Invalidate using custom pattern
        await this.cacheService.delPattern(pattern);
        this.logger.debug(`Invalidated cache with pattern: ${pattern}`);
      } else {
        // Invalidate all AI cache
        for (const config of Object.values(this.cacheConfigs)) {
          await this.cacheService.delPattern(`${config.keyPrefix}_*`);
        }
        this.logger.debug('Invalidated all AI cache');
      }
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    configs: Record<AIActionType, CacheConfig>;
    estimatedEntries: Record<AIActionType, number>;
    totalEstimatedSize: number;
  }> {
    const estimatedEntries: Record<AIActionType, number> = {} as any;
    let totalEstimatedSize = 0;

    try {
      for (const [actionType, config] of Object.entries(this.cacheConfigs)) {
        const pattern = `${config.keyPrefix}_*`;
        const keys = await this.cacheService.getKeys(pattern);
        estimatedEntries[actionType as AIActionType] = keys.length;

        // Rough estimation of cache size (each entry ~1-5KB average)
        totalEstimatedSize += keys.length * 3000; // 3KB average per entry
      }
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
    }

    return {
      configs: this.cacheConfigs,
      estimatedEntries,
      totalEstimatedSize,
    };
  }

  /**
   * Update cache configuration at runtime
   */
  updateCacheConfig(
    actionType: AIActionType,
    updates: Partial<CacheConfig>,
  ): void {
    const currentConfig = this.cacheConfigs[actionType];
    this.cacheConfigs[actionType] = {
      ...currentConfig,
      ...updates,
    };

    this.logger.log(
      `Updated cache config for ${actionType}:`,
      this.cacheConfigs[actionType],
    );
  }

  /**
   * Warm up cache with common requests
   */
  async warmUpCache(
    commonRequests: Array<{
      actionType: AIActionType;
      prompt: string;
      systemPrompt?: string;
    }>,
  ): Promise<void> {
    this.logger.log(
      `Warming up cache with ${commonRequests.length} common requests`,
    );

    // This would typically be called during application startup
    // with pre-computed responses for common queries
    for (const request of commonRequests) {
      const cacheKey = this.generateCacheKey(
        request.actionType,
        request.prompt,
        request.systemPrompt,
      );

      this.logger.debug(`Cache key prepared for warmup: ${cacheKey}`);
    }
  }

  /**
   * Create a hash of content for cache key generation
   */
  private hashContent(prompt: string, systemPrompt?: string): string {
    const content = systemPrompt ? `${systemPrompt}|${prompt}` : prompt;
    return createHash('sha256')
      .update(content.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for shorter keys
  }

  /**
   * Check if caching is enabled for an action type
   */
  isCachingEnabled(actionType: AIActionType): boolean {
    return this.cacheConfigs[actionType]?.enabled ?? false;
  }

  /**
   * Get TTL for an action type
   */
  getTTL(actionType: AIActionType): number {
    return this.cacheConfigs[actionType]?.ttl ?? 3600;
  }
}
