import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface DatabaseMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
}

export interface ApplicationMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private queryTimes: number[] = [];
  private slowQueryThreshold = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {}

  // Track request metrics
  recordRequest(responseTime: number, isError: boolean = false) {
    this.requestCount++;
    this.responseTimes.push(responseTime);

    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Log slow requests
    if (responseTime > 2000) {
      // 2 seconds
      this.logger.warn(`Slow request detected: ${responseTime}ms`);
    }
  }

  // Track database query metrics
  recordQuery(queryTime: number, query?: string) {
    this.queryTimes.push(queryTime);

    // Keep only last 1000 query times
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }

    // Log slow queries
    if (queryTime > this.slowQueryThreshold) {
      this.logger.warn(`Slow query detected: ${queryTime}ms`, {
        query: query?.substring(0, 100) + '...',
        duration: queryTime,
      });
    }
  }

  // Get application metrics
  getApplicationMetrics(): ApplicationMetrics {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.responseTimes.length
        : 0;

    return {
      uptime,
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageResponseTime,
    };
  }

  // Get database metrics (mock implementation - would integrate with actual DB monitoring)
  getDatabaseMetrics(): DatabaseMetrics {
    const averageQueryTime =
      this.queryTimes.length > 0
        ? this.queryTimes.reduce((sum, time) => sum + time, 0) /
          this.queryTimes.length
        : 0;

    const slowQueries = this.queryTimes.filter(
      (time) => time > this.slowQueryThreshold,
    ).length;

    return {
      activeConnections: 5, // Would get from actual connection pool
      idleConnections: 15,
      totalConnections: 20,
      queryCount: this.queryTimes.length,
      averageQueryTime,
      slowQueries,
    };
  }

  // Get performance summary
  getPerformanceSummary() {
    const appMetrics = this.getApplicationMetrics();
    const dbMetrics = this.getDatabaseMetrics();

    return {
      application: appMetrics,
      database: dbMetrics,
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV'),
    };
  }

  // Check if performance is healthy
  isPerformanceHealthy(): boolean {
    const metrics = this.getApplicationMetrics();

    // Define health thresholds
    const maxMemoryMB = 512; // 512MB
    const maxErrorRate = 0.05; // 5%
    const maxResponseTime = 2000; // 2 seconds

    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    const errorRate =
      this.requestCount > 0 ? this.errorCount / this.requestCount : 0;

    const isHealthy =
      memoryMB < maxMemoryMB &&
      errorRate < maxErrorRate &&
      metrics.averageResponseTime < maxResponseTime;

    if (!isHealthy) {
      this.logger.warn('Performance health check failed', {
        memoryMB,
        errorRate,
        averageResponseTime: metrics.averageResponseTime,
      });
    }

    return isHealthy;
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.queryTimes = [];
  }

  // Export metrics in Prometheus format (for external monitoring)
  getPrometheusMetrics(): string {
    const metrics = this.getApplicationMetrics();
    const dbMetrics = this.getDatabaseMetrics();

    return `
# HELP studyteddy_requests_total Total number of requests
# TYPE studyteddy_requests_total counter
studyteddy_requests_total ${metrics.requestCount}

# HELP studyteddy_errors_total Total number of errors
# TYPE studyteddy_errors_total counter
studyteddy_errors_total ${metrics.errorCount}

# HELP studyteddy_response_time_avg Average response time in milliseconds
# TYPE studyteddy_response_time_avg gauge
studyteddy_response_time_avg ${metrics.averageResponseTime}

# HELP studyteddy_memory_usage Memory usage in bytes
# TYPE studyteddy_memory_usage gauge
studyteddy_memory_usage ${metrics.memoryUsage.heapUsed}

# HELP studyteddy_uptime_seconds Application uptime in seconds
# TYPE studyteddy_uptime_seconds gauge
studyteddy_uptime_seconds ${metrics.uptime / 1000}

# HELP studyteddy_db_connections Database connections
# TYPE studyteddy_db_connections gauge
studyteddy_db_connections{state="active"} ${dbMetrics.activeConnections}
studyteddy_db_connections{state="idle"} ${dbMetrics.idleConnections}

# HELP studyteddy_db_query_time_avg Average database query time in milliseconds
# TYPE studyteddy_db_query_time_avg gauge
studyteddy_db_query_time_avg ${dbMetrics.averageQueryTime}
    `.trim();
  }
}
