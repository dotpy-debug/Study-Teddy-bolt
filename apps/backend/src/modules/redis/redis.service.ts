import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisStats {
  connected: boolean;
  memoryUsage: number;
  keyCount: number;
  hitRate: number;
  clients: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private stats = { hits: 0, misses: 0 };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    };

    try {
      // Create main Redis client
      this.client = new Redis(redisConfig);
      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
      });
      this.client.on('error', (err) => {
        this.logger.error('Redis client error:', err);
      });

      // Create subscriber client for pub/sub
      this.subscriber = new Redis(redisConfig);
      this.subscriber.on('connect', () => {
        this.logger.log('Redis subscriber connected');
      });

      // Create publisher client for pub/sub
      this.publisher = new Redis(redisConfig);
      this.publisher.on('connect', () => {
        this.logger.log('Redis publisher connected');
      });

      // Test connection
      await this.client.ping();
      this.logger.log('Redis service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      // Fallback to in-memory cache if Redis is not available
      this.logger.warn('Redis connection failed, operations will be limited');
    }
  }

  private async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.publisher) {
      await this.publisher.quit();
    }
    this.logger.log('Redis connections closed');
  }

  // Basic Cache Operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(value);
      }
      this.stats.misses++;
      this.logger.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl || 'none'}`);
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      const deleted = await this.client.del(...keys);
      this.logger.debug(
        `Cache DELETE for keys: ${keys.join(', ')}, deleted: ${deleted}`,
      );
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting keys ${keys.join(', ')}:`, error);
      return 0;
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.debug(
          `Deleted ${keys.length} keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
      this.logger.debug(`Set expiration for key ${key}: ${ttl} seconds`);
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
    }
  }

  // List Operations
  async lpush(key: string, value: any): Promise<void> {
    try {
      await this.client.lpush(key, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Error pushing to list ${key}:`, error);
    }
  }

  async rpop<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error popping from list ${key}:`, error);
      return null;
    }
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.client.lrange(key, start, stop);
      return values.map((v) => JSON.parse(v));
    } catch (error) {
      this.logger.error(`Error getting list range for ${key}:`, error);
      return [];
    }
  }

  // Set Operations
  async sadd(key: string, member: string): Promise<void> {
    try {
      await this.client.sadd(key, member);
    } catch (error) {
      this.logger.error(`Error adding to set ${key}:`, error);
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.error(`Error getting set members for ${key}:`, error);
      return [];
    }
  }

  async srem(key: string, member: string): Promise<void> {
    try {
      await this.client.srem(key, member);
    } catch (error) {
      this.logger.error(`Error removing from set ${key}:`, error);
    }
  }

  // Hash Operations
  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      await this.client.hset(key, field, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Error setting hash field ${key}:${field}:`, error);
    }
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting hash field ${key}:${field}:`, error);
      return null;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await this.client.hgetall(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      this.logger.error(`Error getting all hash fields for ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.client.hdel(key, field);
    } catch (error) {
      this.logger.error(`Error deleting hash field ${key}:${field}:`, error);
    }
  }

  // Pub/Sub Operations
  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      this.logger.debug(`Published message to channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Error publishing to channel ${channel}:`, error);
    }
  }

  async subscribe(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            this.logger.error(
              `Error parsing message from channel ${channel}:`,
              error,
            );
          }
        }
      });
      this.logger.debug(`Subscribed to channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Error subscribing to channel ${channel}:`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
      this.logger.debug(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Error unsubscribing from channel ${channel}:`, error);
    }
  }

  // Atomic Operations
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      this.logger.error(`Error decrementing key ${key}:`, error);
      return 0;
    }
  }

  async incrby(key: string, increment: number): Promise<number> {
    try {
      return await this.client.incrby(key, increment);
    } catch (error) {
      this.logger.error(
        `Error incrementing key ${key} by ${increment}:`,
        error,
      );
      return 0;
    }
  }

  // Utility Methods
  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
      this.logger.debug('Cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  async getStats(): Promise<RedisStats> {
    try {
      const info = await this.client.info();
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const keysMatch = info.match(/db0:keys=(\d+)/);
      const clientsMatch = info.match(/connected_clients:(\d+)/);

      const total = this.stats.hits + this.stats.misses;
      const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

      return {
        connected: this.client.status === 'ready',
        memoryUsage: memoryMatch ? parseInt(memoryMatch[1]) : 0,
        keyCount: keysMatch ? parseInt(keysMatch[1]) : 0,
        hitRate: Math.round(hitRate * 100) / 100,
        clients: clientsMatch ? parseInt(clientsMatch[1]) : 0,
      };
    } catch (error) {
      this.logger.error('Error getting Redis stats:', error);
      return {
        connected: false,
        memoryUsage: 0,
        keyCount: 0,
        hitRate: 0,
        clients: 0,
      };
    }
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
    this.logger.debug('Redis stats reset');
  }

  // Cache warming helper
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

  // Lock mechanism for distributed systems
  async acquireLock(key: string, ttl = 30): Promise<boolean> {
    try {
      const lockKey = `lock:${key}`;
      const result = await this.client.set(lockKey, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Error acquiring lock for ${key}:`, error);
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      const lockKey = `lock:${key}`;
      await this.client.del(lockKey);
    } catch (error) {
      this.logger.error(`Error releasing lock for ${key}:`, error);
    }
  }

  // Helper to generate cache keys
  generateKey(prefix: string, ...parts: string[]): string {
    return [prefix, ...parts].join(':');
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Create a Redis pipeline
   */
  pipeline() {
    return this.client.pipeline();
  }

  /**
   * Set key with expiration time
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    try {
      await this.client.setex(key, seconds, value);
      this.logger.debug(`Set key ${key} with expiration ${seconds}s`);
    } catch (error) {
      this.logger.error(`Error setting key ${key} with expiration:`, error);
    }
  }

  /**
   * Count sorted set members between scores
   */
  async zcount(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<number> {
    try {
      return await this.client.zcount(key, min, max);
    } catch (error) {
      this.logger.error(`Error counting sorted set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment hash field by amount
   */
  async hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    try {
      return await this.client.hincrby(key, field, increment);
    } catch (error) {
      this.logger.error(
        `Error incrementing hash field ${key}:${field}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      this.logger.error(`Error adding to sorted set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment by amount
   */
  async incrby(key: string, increment: number): Promise<number> {
    try {
      return await this.client.incrby(key, increment);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get sorted set members by score range
   */
  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
  ): Promise<string[]> {
    try {
      return await this.client.zrangebyscore(key, min, max);
    } catch (error) {
      this.logger.error(`Error getting sorted set range ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove sorted set members by score range
   */
  async zremrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
  ): Promise<number> {
    try {
      return await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      this.logger.error(`Error removing sorted set range ${key}:`, error);
      return 0;
    }
  }
}
