import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import * as schema from './schema';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly connection: {
      sql: Sql;
      db: PostgresJsDatabase<typeof schema>;
    },
    private readonly cacheService: CacheService,
  ) {}

  get db() {
    return this.connection.db;
  }

  async onModuleDestroy() {
    try {
      await this.connection.sql.end();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection:', error);
    }
  }

  /**
   * Execute a paginated query with caching
   */
  async paginate<T>(
    queryBuilder: any,
    options: PaginationOptions = {},
    cacheKey?: string,
    cacheTTL: number = CACHE_TTL.MEDIUM,
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options;

    const offset = (page - 1) * limit;

    // Generate cache key if provided
    const finalCacheKey = cacheKey
      ? `${cacheKey}:page:${page}:limit:${limit}:sort:${sortBy}:${sortOrder}`
      : null;

    if (finalCacheKey) {
      const cached = await this.cacheService.get<PaginationResult<T>>(finalCacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Get total count
      const [totalResult] = await this.db
        .select({ count: count() })
        .from(queryBuilder._.selectedFields ? queryBuilder.getSQL().from : queryBuilder);

      const total = totalResult.count;

      // Apply sorting and pagination
      const sortColumn =
        sortBy === 'created_at'
          ? schema.tasks.createdAt
          : schema.tasks[sortBy as keyof typeof schema.tasks];
      const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      const data = await queryBuilder.orderBy(orderBy).limit(limit).offset(offset);

      const result: PaginationResult<T> = {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      // Cache the result
      if (finalCacheKey) {
        await this.cacheService.set(finalCacheKey, result, { ttl: cacheTTL });
      }

      return result;
    } catch (error) {
      this.logger.error('Pagination query failed:', error);
      throw error;
    }
  }

  /**
   * Get database health and performance metrics
   */
  async getHealthMetrics() {
    try {
      const [dbStats] = await this.connection.sql`
        SELECT
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT max_conn FROM (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') t) as max_connections,
          current_timestamp as timestamp
      `;

      return {
        database: 'healthy',
        connections: {
          active: dbStats.active_connections,
          total: dbStats.total_connections,
          max: dbStats.max_connections,
          utilization:
            ((dbStats.total_connections / dbStats.max_connections) * 100).toFixed(2) + '%',
        },
        timestamp: dbStats.timestamp,
      };
    } catch (error) {
      this.logger.error('Failed to get database health metrics:', error);
      return {
        database: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Optimize query performance with explain analysis
   */
  async analyzeQuery(query: string): Promise<any> {
    try {
      const result = await this.connection.sql.unsafe(`EXPLAIN (ANALYZE, BUFFERS) ${query}`);
      return result;
    } catch (error) {
      this.logger.error('Query analysis failed:', error);
      throw error;
    }
  }

  /**
   * Batch insert with conflict resolution
   */
  async batchInsert<T>(
    table: any,
    data: T[],
    batchSize: number = 100,
    onConflict?: any,
  ): Promise<void> {
    const batches = this.chunk(data, batchSize);

    for (const batch of batches) {
      try {
        let query = this.db.insert(table).values(batch);

        if (onConflict) {
          query = query.onConflictDoUpdate(onConflict);
        }

        await query;
      } catch (error) {
        this.logger.error(`Batch insert failed for batch:`, error);
        throw error;
      }
    }
  }

  /**
   * Cached query execution
   */
  async cachedQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey: string,
    ttl: number = CACHE_TTL.MEDIUM,
    tags?: string[],
  ): Promise<T> {
    return this.cacheService.getOrSet(cacheKey, queryFn, { ttl, tags });
  }

  /**
   * Transaction wrapper with retry logic
   */
  async transaction<T>(fn: (tx: any) => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.db.transaction(fn);
      } catch (error) {
        lastError = error;

        // Check if error is retryable (serialization failure, deadlock, etc.)
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Bulk update with optimized queries
   */
  async bulkUpdate<T>(
    table: any,
    updates: Array<{ where: any; data: Partial<T> }>,
    batchSize: number = 50,
  ): Promise<void> {
    const batches = this.chunk(updates, batchSize);

    for (const batch of batches) {
      await this.db.transaction(async (tx) => {
        for (const { where, data } of batch) {
          await tx.update(table).set(data).where(where);
        }
      });
    }
  }

  /**
   * Get table statistics for optimization
   */
  async getTableStats(tableName: string) {
    try {
      const [stats] = await this.connection.sql`
        SELECT
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation,
          most_common_vals,
          most_common_freqs
        FROM pg_stats
        WHERE tablename = ${tableName}
      `;

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get table stats for ${tableName}:`, error);
      return null;
    }
  }

  // Helper methods
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '53300', // too_many_connections
    ];

    return retryableCodes.includes(error.code);
  }
}
