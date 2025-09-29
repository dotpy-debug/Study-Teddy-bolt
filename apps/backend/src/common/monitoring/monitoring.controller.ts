import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PerformanceService } from './performance.service';
import { ErrorTrackingService } from './error-tracking.service';
import { DatabaseMonitorService } from './database-monitor.service';
import { UptimeMonitorService } from './uptime-monitor.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly errorTrackingService: ErrorTrackingService,
    private readonly databaseMonitorService: DatabaseMonitorService,
    private readonly uptimeMonitorService: UptimeMonitorService,
  ) {}

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Get application metrics in Prometheus format' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: 'studyteddy_requests_total 1234\nstudyteddy_errors_total 5',
        },
      },
    },
  })
  getPrometheusMetrics() {
    return this.performanceService.getPrometheusMetrics();
  }

  @Get('performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed performance metrics (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics',
    schema: {
      type: 'object',
      properties: {
        application: {
          type: 'object',
          properties: {
            uptime: { type: 'number' },
            memoryUsage: { type: 'object' },
            requestCount: { type: 'number' },
            errorCount: { type: 'number' },
            averageResponseTime: { type: 'number' },
          },
        },
        database: {
          type: 'object',
          properties: {
            activeConnections: { type: 'number' },
            queryCount: { type: 'number' },
            averageQueryTime: { type: 'number' },
          },
        },
      },
    },
  })
  getPerformanceMetrics() {
    return this.performanceService.getPerformanceSummary();
  }

  @Get('health/performance')
  @Public()
  @ApiOperation({ summary: 'Check performance health status' })
  @ApiResponse({
    status: 200,
    description: 'Performance health status',
    schema: {
      type: 'object',
      properties: {
        healthy: { type: 'boolean' },
        timestamp: { type: 'string' },
        metrics: { type: 'object' },
      },
    },
  })
  getPerformanceHealth() {
    const healthy = this.performanceService.isPerformanceHealthy();
    const metrics = this.performanceService.getApplicationMetrics();

    return {
      healthy,
      timestamp: new Date().toISOString(),
      metrics: {
        memoryUsageMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        errorRate:
          metrics.requestCount > 0
            ? metrics.errorCount / metrics.requestCount
            : 0,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        uptime: Math.round(metrics.uptime / 1000),
      },
    };
  }

  @Get('errors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get error statistics' })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Time window in milliseconds',
  })
  @ApiResponse({ status: 200, description: 'Error statistics' })
  getErrorStats(@Query('timeWindow') timeWindow?: string) {
    const window = timeWindow ? parseInt(timeWindow) : 3600000; // 1 hour default
    return this.errorTrackingService.getErrorStats(window);
  }

  @Get('errors/critical')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get critical errors' })
  @ApiResponse({ status: 200, description: 'Critical errors' })
  getCriticalErrors() {
    return this.errorTrackingService.getCriticalErrors();
  }

  @Get('database')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get database metrics' })
  @ApiResponse({ status: 200, description: 'Database metrics' })
  async getDatabaseMetrics() {
    return this.databaseMonitorService.getDatabaseMetrics();
  }

  @Get('database/slow-queries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of queries to return',
  })
  @ApiResponse({ status: 200, description: 'Slow queries' })
  getSlowQueries(@Query('limit') limit?: string) {
    const queryLimit = limit ? parseInt(limit) : 10;
    return this.databaseMonitorService.getSlowQueries(queryLimit);
  }

  @Get('uptime')
  @Public()
  @ApiOperation({ summary: 'Get uptime metrics' })
  @ApiResponse({ status: 200, description: 'Uptime metrics' })
  getUptimeMetrics() {
    return this.uptimeMonitorService.getUptimeMetrics();
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Get system status' })
  @ApiResponse({ status: 200, description: 'System status' })
  getSystemStatus() {
    return this.uptimeMonitorService.getSystemStatus();
  }

  @Get('services')
  @Public()
  @ApiOperation({ summary: 'Get service statuses' })
  @ApiResponse({ status: 200, description: 'Service statuses' })
  getServiceStatuses() {
    return this.uptimeMonitorService.getServiceStatuses();
  }
}
