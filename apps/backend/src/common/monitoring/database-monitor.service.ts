import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '../../db/drizzle.service';

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
    waiting: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
    averageTime: number;
  };
  tables: {
    name: string;
    rowCount: number;
    size: string;
  }[];
  performance: {
    cacheHitRatio: number;
    indexUsage: number;
    lockWaits: number;
  };
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
}

@Injectable()
export class DatabaseMonitorService {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private queryMetrics: {
    total: number;
    slow: number;
    failed: number;
    times: number[];
  } = {
    total: 0,
    slow: 0,
    failed: 0,
    times: [],
  };
  private slowQueries: SlowQuery[] = [];
  private readonly slowQueryThreshold = 1000; // 1 second
  private readonly maxSlowQueries = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly drizzleService: DrizzleService,
  ) {}

  // Record query execution
  recordQuery(
    query: string,
    duration: number,
    success: boolean,
    parameters?: any[],
  ) {
    this.queryMetrics.total++;
    this.queryMetrics.times.push(duration);

    if (!success) {
      this.queryMetrics.failed++;
    }

    if (duration > this.slowQueryThreshold) {
      this.queryMetrics.slow++;

      // Store slow query details
      this.slowQueries.push({
        query: this.sanitizeQuery(query),
        duration,
        timestamp: new Date(),
        parameters: parameters
          ? this.sanitizeParameters(parameters)
          : undefined,
      });

      // Keep only recent slow queries
      if (this.slowQueries.length > this.maxSlowQueries) {
        this.slowQueries = this.slowQueries.slice(-this.maxSlowQueries);
      }

      this.logger.warn(`Slow query detected: ${duration}ms`, {
        query: query.substring(0, 100) + '...',
        duration,
      });
    }

    // Keep only last 1000 query times for memory efficiency
    if (this.queryMetrics.times.length > 1000) {
      this.queryMetrics.times = this.queryMetrics.times.slice(-1000);
    }
  }

  // Get database metrics
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const [connectionStats, tableStats, performanceStats] =
        await Promise.allSettled([
          this.getConnectionStats(),
          this.getTableStats(),
          this.getPerformanceStats(),
        ]);

      const averageTime =
        this.queryMetrics.times.length > 0
          ? this.queryMetrics.times.reduce((sum, time) => sum + time, 0) /
            this.queryMetrics.times.length
          : 0;

      return {
        connectionPool:
          connectionStats.status === 'fulfilled'
            ? connectionStats.value
            : { active: 0, idle: 0, total: 0, waiting: 0 },
        queries: {
          total: this.queryMetrics.total,
          slow: this.queryMetrics.slow,
          failed: this.queryMetrics.failed,
          averageTime: Math.round(averageTime),
        },
        tables: tableStats.status === 'fulfilled' ? tableStats.value : [],
        performance:
          performanceStats.status === 'fulfilled'
            ? performanceStats.value
            : { cacheHitRatio: 0, indexUsage: 0, lockWaits: 0 },
      };
    } catch (error) {
      this.logger.error('Failed to get database metrics', error);
      throw error;
    }
  }

  // Get slow queries
  getSlowQueries(limit: number = 10): SlowQuery[] {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Check database health
  async isDatabaseHealthy(): Promise<boolean> {
    try {
      const metrics = await this.getDatabaseMetrics();

      // Define health thresholds
      const maxSlowQueryRate = 0.1; // 10% of queries
      const maxFailureRate = 0.05; // 5% of queries
      const maxAverageTime = 500; // 500ms
      const maxActiveConnections = 80; // 80% of pool

      const slowQueryRate =
        metrics.queries.total > 0
          ? metrics.queries.slow / metrics.queries.total
          : 0;

      const failureRate =
        metrics.queries.total > 0
          ? metrics.queries.failed / metrics.queries.total
          : 0;

      const connectionUsage =
        metrics.connectionPool.total > 0
          ? metrics.connectionPool.active / metrics.connectionPool.total
          : 0;

      const isHealthy =
        slowQueryRate < maxSlowQueryRate &&
        failureRate < maxFailureRate &&
        metrics.queries.averageTime < maxAverageTime &&
        connectionUsage < maxActiveConnections;

      if (!isHealthy) {
        this.logger.warn('Database health check failed', {
          slowQueryRate,
          failureRate,
          averageTime: metrics.queries.averageTime,
          connectionUsage,
        });
      }

      return isHealthy;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  // Get connection pool statistics
  private async getConnectionStats() {
    try {
      // This would integrate with your actual connection pool
      // For now, returning mock data
      return {
        active: 5,
        idle: 15,
        total: 20,
        waiting: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get connection stats', error);
      throw error;
    }
  }

  // Get table statistics
  private async getTableStats() {
    try {
      const tables = await this.drizzleService.db.execute(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables 
        ORDER BY total_operations DESC
        LIMIT 10
      `);

      return tables.map((table: any) => ({
        name: table.tablename,
        rowCount: parseInt(table.total_operations) || 0,
        size: table.size || '0 bytes',
      }));
    } catch (error) {
      this.logger.error('Failed to get table stats', error);
      return [];
    }
  }

  // Get performance statistics
  private async getPerformanceStats() {
    try {
      // Get cache hit ratio
      const cacheStats = await this.drizzleService.db.execute(`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      `);

      // Get index usage
      const indexStats = await this.drizzleService.db.execute(`
        SELECT 
          sum(idx_scan) / (sum(seq_scan) + sum(idx_scan)) * 100 as index_usage
        FROM pg_stat_user_tables
        WHERE seq_scan + idx_scan > 0
      `);

      return {
        cacheHitRatio:
          parseFloat(String(cacheStats[0]?.cache_hit_ratio || 0)) || 0,
        indexUsage: parseFloat(String(indexStats[0]?.index_usage || 0)) || 0,
        lockWaits: 0, // Would get from pg_stat_database
      };
    } catch (error) {
      this.logger.error('Failed to get performance stats', error);
      return {
        cacheHitRatio: 0,
        indexUsage: 0,
        lockWaits: 0,
      };
    }
  }

  // Sanitize query for logging (remove sensitive data)
  private sanitizeQuery(query: string): string {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }

  // Sanitize parameters for logging
  private sanitizeParameters(parameters: any[]): any[] {
    return parameters.map((param) => {
      if (typeof param === 'string' && param.length > 50) {
        return param.substring(0, 50) + '...';
      }
      return param;
    });
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.queryMetrics = {
      total: 0,
      slow: 0,
      failed: 0,
      times: [],
    };
    this.slowQueries = [];
  }

  // Get database size information
  async getDatabaseSize(): Promise<{
    totalSize: string;
    tablesSizes: { name: string; size: string }[];
  }> {
    try {
      const sizeQuery = await this.drizzleService.db.execute(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as total_size
      `);

      const tableSizes = await this.drizzleService.db.execute(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

      return {
        totalSize: String(sizeQuery[0]?.total_size || '0 bytes'),
        tablesSizes: tableSizes.map((table: any) => ({
          name: table.tablename,
          size: table.size,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get database size', error);
      return {
        totalSize: '0 bytes',
        tablesSizes: [],
      };
    }
  }
}
