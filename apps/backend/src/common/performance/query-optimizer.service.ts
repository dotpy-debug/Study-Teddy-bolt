import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { sql } from 'drizzle-orm';

interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly performanceMetrics: QueryPerformanceMetrics[] = [];
  private readonly slowQueryThreshold = 1000; // 1 second

  constructor(private drizzleService: DrizzleService) {}

  /**
   * Execute a query with performance monitoring
   */
  async executeWithMetrics<T>(
    queryFn: () => Promise<T>,
    queryName: string,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await queryFn();
      const executionTime = performance.now() - startTime;

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        this.logger.warn(
          `Slow query detected: ${queryName} took ${executionTime.toFixed(2)}ms`,
        );
      }

      // Store metrics
      this.performanceMetrics.push({
        query: queryName,
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
      });

      // Keep only last 1000 metrics
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics.shift();
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error(
        `Query failed: ${queryName} after ${executionTime.toFixed(2)}ms`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentMetrics = this.performanceMetrics.filter(
      (metric) => metric.timestamp > oneHourAgo,
    );

    const averageExecutionTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, metric) => sum + metric.executionTime, 0) /
          recentMetrics.length
        : 0;

    const slowQueries = recentMetrics.filter(
      (metric) => metric.executionTime > this.slowQueryThreshold,
    );

    return {
      totalQueries: recentMetrics.length,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      slowQueries: slowQueries.length,
      slowQueryPercentage:
        recentMetrics.length > 0
          ? Math.round((slowQueries.length / recentMetrics.length) * 100)
          : 0,
      recentSlowQueries: slowQueries.slice(-10).map((metric) => ({
        query: metric.query,
        executionTime: Math.round(metric.executionTime * 100) / 100,
        timestamp: metric.timestamp,
      })),
    };
  }

  /**
   * Analyze database performance and suggest optimizations
   */
  async analyzeDatabasePerformance() {
    try {
      // Get table sizes
      const tableSizes = await this.drizzleService.db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `);

      // Get index usage statistics
      const indexStats = await this.drizzleService.db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC;
      `);

      // Get slow queries from pg_stat_statements if available
      let slowQueries = [];
      try {
        slowQueries = await this.drizzleService.db.execute(sql`
          SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            rows
          FROM pg_stat_statements
          WHERE mean_exec_time > 100
          ORDER BY mean_exec_time DESC
          LIMIT 10;
        `);
      } catch (error) {
        // pg_stat_statements extension might not be available
        this.logger.debug('pg_stat_statements not available');
      }

      // Get connection statistics
      const connectionStats = await this.drizzleService.db.execute(sql`
        SELECT 
          state,
          count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state;
      `);

      return {
        tableSizes: tableSizes,
        indexStats: indexStats,
        slowQueries: slowQueries,
        connectionStats: connectionStats,
        recommendations: this.generateRecommendations(tableSizes, indexStats),
      };
    } catch (error) {
      this.logger.error('Failed to analyze database performance', error);
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(tableSizes: any[], indexStats: any[]) {
    const recommendations: any[] = [];

    // Check for large tables without proper indexing
    tableSizes.forEach((table) => {
      const tableIndexes = indexStats.filter(
        (idx) => idx.tablename === table.tablename,
      );
      const totalScans = tableIndexes.reduce(
        (sum, idx) => sum + (idx.idx_scan || 0),
        0,
      );

      if (table.size_bytes > 1000000 && totalScans < 100) {
        // 1MB+ table with low index usage
        recommendations.push({
          type: 'indexing',
          table: table.tablename,
          message: `Consider adding indexes to ${table.tablename} (${table.size}) - low index usage detected`,
          priority: 'high',
        });
      }
    });

    // Check for unused indexes
    indexStats.forEach((index) => {
      if (index.idx_scan === 0) {
        recommendations.push({
          type: 'cleanup',
          table: index.tablename,
          index: index.indexname,
          message: `Index ${index.indexname} on ${index.tablename} is never used - consider dropping`,
          priority: 'medium',
        });
      }
    });

    // Check application-level metrics
    const metrics = this.getPerformanceMetrics();
    if (metrics.slowQueryPercentage > 10) {
      recommendations.push({
        type: 'performance',
        message: `${metrics.slowQueryPercentage}% of queries are slow (>${this.slowQueryThreshold}ms)`,
        priority: 'high',
      });
    }

    return recommendations;
  }

  /**
   * Optimize common query patterns
   */
  async optimizeCommonQueries() {
    const optimizations: any[] = [];

    try {
      // Check if we need composite indexes for common query patterns

      // 1. Tasks by user and completion status
      const tasksByUserAndStatus = await this.drizzleService.db.execute(sql`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM study_tasks 
        WHERE user_id = gen_random_uuid() AND completed = false
        ORDER BY due_date DESC
        LIMIT 10;
      `);

      // 2. AI chats by user ordered by date
      const chatsByUser = await this.drizzleService.db.execute(sql`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM ai_chats
        WHERE user_id = gen_random_uuid()
        ORDER BY created_at DESC
        LIMIT 20;
      `);

      // 3. Study sessions for dashboard analytics
      const sessionAnalytics = await this.drizzleService.db.execute(sql`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT 
          DATE(date) as study_date,
          SUM(duration_minutes) as total_minutes
        FROM study_sessions
        WHERE user_id = gen_random_uuid()
          AND date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(date)
        ORDER BY study_date;
      `);

      optimizations.push({
        query: 'tasks_by_user_and_status',
        analysis: tasksByUserAndStatus,
        suggestion:
          'Consider composite index on (user_id, completed, due_date)',
      });

      optimizations.push({
        query: 'chats_by_user',
        analysis: chatsByUser,
        suggestion: 'Index on (user_id, created_at) should be sufficient',
      });

      optimizations.push({
        query: 'session_analytics',
        analysis: sessionAnalytics,
        suggestion:
          'Consider composite index on (user_id, date) for dashboard queries',
      });

      return optimizations;
    } catch (error) {
      this.logger.error('Failed to analyze query optimizations', error);
      return [];
    }
  }

  /**
   * Create recommended indexes
   */
  async createRecommendedIndexes() {
    const indexes = [
      // Composite index for task queries
      {
        name: 'idx_study_tasks_user_completed_due_date',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_tasks_user_completed_due_date 
          ON study_tasks (user_id, completed, due_date DESC);
        `,
      },
      // Composite index for session analytics
      {
        name: 'idx_study_sessions_user_date',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_user_date 
          ON study_sessions (user_id, date DESC);
        `,
      },
      // Partial index for active tasks
      {
        name: 'idx_study_tasks_active',
        sql: sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_tasks_active 
          ON study_tasks (user_id, due_date) 
          WHERE completed = false;
        `,
      },
    ];

    const results: Array<{ name: string; status: string; error?: string }> = [];
    for (const index of indexes) {
      try {
        await this.drizzleService.db.execute(index.sql);
        results.push({ name: index.name, status: 'created' });
        this.logger.log(`Created index: ${index.name}`);
      } catch (error) {
        results.push({
          name: index.name,
          status: 'failed',
          error: error.message,
        });
        this.logger.error(`Failed to create index ${index.name}:`, error);
      }
    }

    return results;
  }
}
