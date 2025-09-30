import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      return result ?? null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || 300; // Default 5 minutes
      await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds

      // Store tags mapping if provided
      if (options?.tags) {
        for (const tag of options.tags) {
          await this.addKeyToTag(tag, key);
        }
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, compute the value
      const value = await factory();

      // Store in cache
      await this.set(key, value, options);

      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      // Fallback to factory function if cache fails
      return await factory();
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.get<string[]>(tagKey);

      if (keys && keys.length > 0) {
        // Delete all keys associated with this tag
        await Promise.all(keys.map((key) => this.del(key)));

        // Delete the tag mapping itself
        await this.del(tagKey);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate by tag error for tag ${tag}:`, error);
    }
  }

  /**
   * Invalidate multiple cache keys
   */
  async invalidateKeys(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.del(key)));
    } catch (error) {
      this.logger.error(`Cache invalidate keys error:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Use store's reset method if available, otherwise fall back to del
      if ('reset' in this.cacheManager) {
        await (this.cacheManager as any).reset();
      } else {
        // Fallback: this won't clear everything but better than crashing
        this.logger.warn('Cache store does not support reset operation');
      }
    } catch (error) {
      this.logger.error(`Cache clear error:`, error);
    }
  }

  /**
   * Get cache statistics (if supported by the store)
   */
  async getStats(): Promise<any> {
    try {
      // This would depend on the cache store implementation
      return {
        // Basic stats that most stores should support
        message: 'Cache is operational',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Cache stats error:`, error);
      return { error: 'Unable to retrieve cache stats' };
    }
  }

  /**
   * Add a key to a tag's key list
   */
  private async addKeyToTag(tag: string, key: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const existingKeys = (await this.get<string[]>(tagKey)) || [];

      if (!existingKeys.includes(key)) {
        existingKeys.push(key);
        await this.set(tagKey, existingKeys, { ttl: 3600 }); // Tags last 1 hour
      }
    } catch (error) {
      this.logger.error(`Error adding key ${key} to tag ${tag}:`, error);
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts].join(':');
  }

  /**
   * Cache decorator for methods
   */
  static CacheResult(keyPrefix: string, ttl: number = 300) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheService: CacheService = this.cacheService || this.cache;

        if (!cacheService) {
          return originalMethod.apply(this, args);
        }

        const cacheKey = cacheService.generateKey(keyPrefix, ...args);

        return cacheService.getOrSet(cacheKey, () => originalMethod.apply(this, args), { ttl });
      };
    };
  }
}

// Cache key constants
export const CACHE_KEYS = {
  USER: 'user',
  TASK: 'task',
  SUBJECT: 'subject',
  FOCUS_SESSION: 'focus_session',
  ANALYTICS: 'analytics',
  AI_RESPONSE: 'ai_response',
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;
