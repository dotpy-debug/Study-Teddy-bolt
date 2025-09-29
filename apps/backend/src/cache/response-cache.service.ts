import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  tags?: string[]; // For cache invalidation
}

export interface ResponseCacheMetadata {
  timestamp: number;
  ttl: number;
  tags: string[];
  userId?: string;
}

@Injectable()
export class ResponseCacheService {
  private readonly logger = new Logger(ResponseCacheService.name);
  private readonly defaultTTL = 300; // 5 minutes

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Generate cache key with proper prefixing and user isolation
   */
  private generateCacheKey(
    baseKey: string,
    userId?: string,
    params?: Record<string, any>,
  ): string {
    const userPrefix = userId ? `user:${userId}` : 'global';
    const paramString = params ? this.serializeParams(params) : '';
    return `cache:${userPrefix}:${baseKey}${paramString ? `:${paramString}` : ''}`;
  }

  /**
   * Serialize parameters for consistent cache keys
   */
  private serializeParams(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          if (params[key] !== undefined && params[key] !== null) {
            result[key] = params[key];
          }
          return result;
        },
        {} as Record<string, any>,
      );

    return Buffer.from(JSON.stringify(sortedParams)).toString('base64');
  }

  /**
   * Get cached response with metadata validation
   */
  async get<T>(
    key: string,
    userId?: string,
    params?: Record<string, any>,
  ): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(key, userId, params);
      const startTime = Date.now();

      const cachedData = await this.cacheManager.get<{
        data: T;
        metadata: ResponseCacheMetadata;
      }>(cacheKey);

      const duration = Date.now() - startTime;

      if (cachedData) {
        // Validate cache freshness
        const now = Date.now();
        const expiresAt =
          cachedData.metadata.timestamp + cachedData.metadata.ttl * 1000;

        if (now > expiresAt) {
          // Cache expired, remove it
          await this.cacheManager.del(cacheKey);
          this.logger.debug(`Cache expired and removed: ${cacheKey}`);
          return null;
        }

        this.logger.debug(
          `Cache HIT in ${duration}ms: ${cacheKey} (${cachedData.metadata.tags.join(', ')})`,
        );
        return cachedData.data;
      }

      this.logger.debug(`Cache MISS in ${duration}ms: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error.stack);
      return null;
    }
  }

  /**
   * Set cached response with metadata and tagging
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
    userId?: string,
    params?: Record<string, any>,
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(key, userId, params);
      const ttl = options.ttl || this.defaultTTL;
      const tags = options.tags || [];

      const cacheData = {
        data,
        metadata: {
          timestamp: Date.now(),
          ttl,
          tags,
          userId,
        } as ResponseCacheMetadata,
      };

      const startTime = Date.now();
      await this.cacheManager.set(cacheKey, cacheData, ttl * 1000);
      const duration = Date.now() - startTime;

      // Store cache key in tag indexes for invalidation
      await this.addToTagIndexes(cacheKey, tags, ttl);

      this.logger.debug(
        `Cache SET in ${duration}ms: ${cacheKey} (TTL: ${ttl}s, Tags: ${tags.join(', ')})`,
      );
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error.stack);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const startTime = Date.now();
      let invalidatedCount = 0;

      for (const tag of tags) {
        const tagIndexKey = `tag:${tag}`;
        const cacheKeys = await this.cacheManager.get<string[]>(tagIndexKey);

        if (cacheKeys && cacheKeys.length > 0) {
          // Delete all keys associated with this tag
          await Promise.all(
            cacheKeys.map(async (cacheKey) => {
              await this.cacheManager.del(cacheKey);
              invalidatedCount++;
            }),
          );

          // Clear the tag index
          await this.cacheManager.del(tagIndexKey);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cache invalidated ${invalidatedCount} entries in ${duration}ms for tags: ${tags.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Cache invalidation error for tags ${tags.join(', ')}:`,
        error.stack,
      );
    }
  }

  /**
   * Invalidate all cache entries for a specific user
   */
  async invalidateByUser(userId: string): Promise<void> {
    try {
      await this.invalidateByTags([`user:${userId}`]);
    } catch (error) {
      this.logger.error(
        `Cache invalidation error for user ${userId}:`,
        error.stack,
      );
    }
  }

  /**
   * Add cache key to tag indexes for efficient invalidation
   */
  private async addToTagIndexes(
    cacheKey: string,
    tags: string[],
    ttl: number,
  ): Promise<void> {
    try {
      for (const tag of tags) {
        const tagIndexKey = `tag:${tag}`;
        const existingKeys =
          (await this.cacheManager.get<string[]>(tagIndexKey)) || [];

        if (!existingKeys.includes(cacheKey)) {
          existingKeys.push(cacheKey);
          // Tag indexes have longer TTL to ensure proper cleanup
          await this.cacheManager.set(
            tagIndexKey,
            existingKeys,
            (ttl + 60) * 1000,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error adding to tag indexes:`, error.stack);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const startTime = Date.now();
      // Use store's reset method if available, otherwise fall back to del
      if ('reset' in this.cacheManager) {
        await (this.cacheManager as any).reset();
      } else {
        // Fallback: this won't clear everything but better than crashing
        this.logger.warn('Cache store does not support reset operation');
      }
      const duration = Date.now() - startTime;
      this.logger.log(`Cache cleared in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Cache clear error:`, error.stack);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hitRate: number;
    size: number;
    keyCount: number;
  }> {
    try {
      // This would require custom implementation based on cache provider
      // For now, return basic stats
      return {
        hitRate: 0, // Would need hit/miss tracking
        size: 0, // Would need size tracking
        keyCount: 0, // Would need key counting
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats:`, error.stack);
      return { hitRate: 0, size: 0, keyCount: 0 };
    }
  }
}

/**
 * Decorator for automatic response caching
 */
export function CacheResponse(options: CacheOptions & { key: string }) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: ResponseCacheService =
        this.cacheService || this.responseCache;

      if (!cacheService) {
        // Fallback to original method if cache service not available
        return method.apply(this, args);
      }

      // Extract userId from context/args if available
      const userId =
        this.extractUserId?.(args) || args.find((arg) => arg?.userId)?.userId;
      const params = this.extractCacheParams?.(args) || {};

      // Try to get from cache first
      const cached = await cacheService.get(options.key, userId, params);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);

      // Cache the result
      await cacheService.set(options.key, result, options, userId, params);

      return result;
    };

    return descriptor;
  };
}
