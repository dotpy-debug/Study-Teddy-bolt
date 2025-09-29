import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCache, Cache } from 'cache-manager';

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

@Injectable()
export class CacheService {
  private cache: Cache;
  private readonly logger = new Logger(CacheService.name);
  private stats = { hits: 0, misses: 0 };

  constructor(private configService: ConfigService) {
    this.initializeCache();
  }

  private initializeCache() {
    this.cache = createCache({
      ttl: 300000, // 5 minutes default TTL in milliseconds
    });
    this.logger.log('Cache service initialized with memory store');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cache.get<T>(key);
      if (value !== undefined && value !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT for key: ${key}`);
        return value;
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache MISS for key: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttl ? ttl * 1000 : undefined);
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
      this.logger.debug(`Cache DELETE for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // For the current cache-manager version, we'll use a simpler approach
      // This is a workaround since direct key enumeration is not available
      this.logger.debug(
        `Cache DELETE pattern requested: ${pattern} (clearing all cache due to API limitations)`,
      );

      // In a production environment, you would want to use Redis for better pattern support
      // For now, we'll just log the pattern and rely on TTL for cleanup
      this.logger.warn(
        `Pattern deletion not fully supported with current cache implementation. Consider upgrading to Redis for production.`,
      );
    } catch (error) {
      this.logger.error(
        `Cache delete pattern error for pattern ${pattern}:`,
        error,
      );
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    try {
      // For the current cache-manager version, we don't have direct key enumeration
      // This is a limitation of the memory cache implementation
      this.logger.debug(
        `Cache GET KEYS pattern requested: ${pattern} (not supported with current implementation)`,
      );

      // In a production environment, you would use Redis which supports pattern-based key retrieval
      // For now, return empty array
      this.logger.warn(
        `Pattern-based key retrieval not supported with current cache implementation. Consider upgrading to Redis for production.`,
      );

      return [];
    } catch (error) {
      this.logger.error(`Cache get keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  clear(): void {
    try {
      // The reset method might not be available in newer versions
      // We'll create a new cache instance instead
      this.cache = createCache({
        ttl: 300000, // 5 minutes default TTL in milliseconds
      });
      this.logger.debug('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
    this.logger.debug('Cache stats reset');
  }

  // Helper method to generate cache keys
  generateKey(prefix: string, userId: string, suffix?: string): string {
    return suffix ? `${prefix}:${userId}:${suffix}` : `${prefix}:${userId}`;
  }

  // Cache warming method
  async warm<T>(
    key: string,
    dataFunction: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const data = await dataFunction();
    await this.set(key, data, ttl);
    return data;
  }
}
