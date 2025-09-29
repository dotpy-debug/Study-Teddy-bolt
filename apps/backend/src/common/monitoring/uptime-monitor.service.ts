import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface UptimeMetrics {
  uptime: number;
  startTime: Date;
  lastHealthCheck: Date;
  healthChecksPassed: number;
  healthChecksFailed: number;
  uptimePercentage: number;
  downtimeEvents: DowntimeEvent[];
}

export interface DowntimeEvent {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  reason: string;
  severity: 'minor' | 'major' | 'critical';
  resolved: boolean;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

@Injectable()
export class UptimeMonitorService {
  private readonly logger = new Logger(UptimeMonitorService.name);
  private readonly startTime = new Date();
  private healthChecksPassed = 0;
  private healthChecksFailed = 0;
  private lastHealthCheck = new Date();
  private downtimeEvents: DowntimeEvent[] = [];
  private currentDowntime: DowntimeEvent | null = null;
  private serviceStatuses: Map<string, ServiceStatus> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeServices();
  }

  // Initialize monitored services
  private initializeServices() {
    const services = [
      { name: 'database', url: null }, // Internal check
      { name: 'openai', url: null }, // Internal check
      { name: 'frontend', url: this.configService.get('FRONTEND_URL') },
    ];

    services.forEach((service) => {
      this.serviceStatuses.set(service.name, {
        name: service.name,
        status: 'healthy',
        lastCheck: new Date(),
      });
    });
  }

  // Periodic health check (every 5 minutes)
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck() {
    this.logger.debug('Performing scheduled health check');

    try {
      const isHealthy = await this.checkSystemHealth();

      if (isHealthy) {
        this.healthChecksPassed++;
        this.resolveDowntime();
      } else {
        this.healthChecksFailed++;
        this.recordDowntime('Health check failed', 'major');
      }

      this.lastHealthCheck = new Date();
    } catch (error) {
      this.logger.error('Health check failed', error);
      this.healthChecksFailed++;
      this.recordDowntime(`Health check error: ${error.message}`, 'critical');
    }
  }

  // Check overall system health
  async checkSystemHealth(): Promise<boolean> {
    const checks = [
      this.checkDatabaseHealth(),
      this.checkOpenAIHealth(),
      this.checkFrontendHealth(),
    ];

    const results = await Promise.allSettled(checks);

    let allHealthy = true;
    results.forEach((result, index) => {
      const serviceName = ['database', 'openai', 'frontend'][index];

      if (result.status === 'fulfilled' && result.value) {
        this.updateServiceStatus(serviceName, 'healthy');
      } else {
        this.updateServiceStatus(
          serviceName,
          'down',
          result.status === 'rejected'
            ? result.reason.message
            : 'Health check failed',
        );
        allHealthy = false;
      }
    });

    return allHealthy;
  }

  // Check database health
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      const startTime = Date.now();
      // Simple query to check database connectivity
      await this.executeHealthQuery();
      const responseTime = Date.now() - startTime;

      this.updateServiceStatus('database', 'healthy', undefined, responseTime);
      return true;
    } catch (error) {
      this.updateServiceStatus('database', 'down', error.message);
      return false;
    }
  }

  // Check OpenAI service health
  private async checkOpenAIHealth(): Promise<boolean> {
    try {
      const apiKey = this.configService.get('OPENAI_API_KEY');
      if (!apiKey || !apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key');
      }

      this.updateServiceStatus('openai', 'healthy');
      return true;
    } catch (error) {
      this.updateServiceStatus('openai', 'down', error.message);
      return false;
    }
  }

  // Check frontend health
  private async checkFrontendHealth(): Promise<boolean> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      if (!frontendUrl) {
        this.updateServiceStatus('frontend', 'healthy'); // Skip if not configured
        return true;
      }

      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${frontendUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.updateServiceStatus(
          'frontend',
          'healthy',
          undefined,
          responseTime,
        );
        return true;
      } else {
        this.updateServiceStatus(
          'frontend',
          'degraded',
          `HTTP ${response.status}`,
        );
        return false;
      }
    } catch (error) {
      this.updateServiceStatus('frontend', 'down', error.message);
      return false;
    }
  }

  // Update service status
  private updateServiceStatus(
    serviceName: string,
    status: ServiceStatus['status'],
    error?: string,
    responseTime?: number,
  ) {
    this.serviceStatuses.set(serviceName, {
      name: serviceName,
      status,
      responseTime,
      lastCheck: new Date(),
      error,
    });
  }

  // Record downtime event
  private recordDowntime(reason: string, severity: DowntimeEvent['severity']) {
    if (!this.currentDowntime) {
      this.currentDowntime = {
        id: this.generateEventId(),
        startTime: new Date(),
        reason,
        severity,
        resolved: false,
      };

      this.downtimeEvents.push(this.currentDowntime);

      this.logger.warn(`Downtime event started: ${reason}`, {
        eventId: this.currentDowntime.id,
        severity,
      });
    }
  }

  // Resolve current downtime
  private resolveDowntime() {
    if (this.currentDowntime && !this.currentDowntime.resolved) {
      this.currentDowntime.endTime = new Date();
      this.currentDowntime.duration =
        this.currentDowntime.endTime.getTime() -
        this.currentDowntime.startTime.getTime();
      this.currentDowntime.resolved = true;

      this.logger.log(`Downtime event resolved: ${this.currentDowntime.id}`, {
        duration: this.currentDowntime.duration,
      });

      this.currentDowntime = null;
    }
  }

  // Get uptime metrics
  getUptimeMetrics(): UptimeMetrics {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();

    // Calculate uptime percentage
    const totalChecks = this.healthChecksPassed + this.healthChecksFailed;
    const uptimePercentage =
      totalChecks > 0 ? (this.healthChecksPassed / totalChecks) * 100 : 100;

    return {
      uptime,
      startTime: this.startTime,
      lastHealthCheck: this.lastHealthCheck,
      healthChecksPassed: this.healthChecksPassed,
      healthChecksFailed: this.healthChecksFailed,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      downtimeEvents: this.downtimeEvents.slice(-10), // Last 10 events
    };
  }

  // Get service statuses
  getServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  // Get current system status
  getSystemStatus(): {
    status: 'operational' | 'degraded' | 'down';
    message: string;
    services: ServiceStatus[];
    uptime: UptimeMetrics;
  } {
    const services = this.getServiceStatuses();
    const uptime = this.getUptimeMetrics();

    const downServices = services.filter((s) => s.status === 'down');
    const degradedServices = services.filter((s) => s.status === 'degraded');

    let status: 'operational' | 'degraded' | 'down';
    let message: string;

    if (downServices.length > 0) {
      status = 'down';
      message = `${downServices.length} service(s) are down`;
    } else if (degradedServices.length > 0) {
      status = 'degraded';
      message = `${degradedServices.length} service(s) are degraded`;
    } else {
      status = 'operational';
      message = 'All systems operational';
    }

    return {
      status,
      message,
      services,
      uptime,
    };
  }

  // Execute health query (mock implementation)
  private async executeHealthQuery(): Promise<void> {
    // In a real implementation, this would use your database service
    // For now, we'll simulate a database check
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional database issues
        if (Math.random() < 0.05) {
          // 5% chance of failure
          reject(new Error('Database connection timeout'));
        } else {
          resolve();
        }
      }, 100);
    });
  }

  // Generate unique event ID
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get uptime percentage for a specific time period
  getUptimePercentage(hours: number = 24): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const relevantEvents = this.downtimeEvents.filter(
      (event) => event.startTime > cutoff,
    );

    const totalDowntime = relevantEvents.reduce((total, event) => {
      const duration =
        event.duration ||
        (event.endTime
          ? event.endTime.getTime() - event.startTime.getTime()
          : 0);
      return total + duration;
    }, 0);

    const totalTime = hours * 60 * 60 * 1000;
    const uptime = totalTime - totalDowntime;

    return Math.max(0, Math.min(100, (uptime / totalTime) * 100));
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.healthChecksPassed = 0;
    this.healthChecksFailed = 0;
    this.downtimeEvents = [];
    this.currentDowntime = null;
    this.lastHealthCheck = new Date();
  }
}
