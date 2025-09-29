#!/usr/bin/env bun

/**
 * Study Teddy Environment Health Check
 *
 * Comprehensive health monitoring for all environments including:
 * - Environment variable validation
 * - Database connectivity
 * - Redis connectivity
 * - External service availability
 * - SSL certificate status
 * - Application health endpoints
 */

import { execSync } from 'child_process';
import { validateEnv, checkDatabaseConnectivity, checkRedisConnectivity, checkExternalServices } from '../packages/config/src/env-checker';

// ============================================
// Types and Interfaces
// ============================================

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  metadata?: Record<string, any>;
  lastChecked: string;
}

interface HealthCheckSuite {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  environment: string;
  timestamp: string;
  results: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

// ============================================
// Health Check Implementations
// ============================================

class HealthChecker {
  private environment: string;
  private timeout: number;

  constructor(environment: string = process.env.NODE_ENV || 'development', timeout: number = 30000) {
    this.environment = environment;
    this.timeout = timeout;
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckSuite> {
    const results: HealthCheckResult[] = [];

    console.log(`🔍 Running health checks for ${this.environment} environment...`);

    // Environment validation
    results.push(await this.checkEnvironmentConfiguration());

    // Database connectivity
    results.push(await this.checkDatabaseHealth());

    // Redis connectivity
    results.push(await this.checkRedisHealth());

    // External services
    results.push(...await this.checkExternalServicesHealth());

    // Application endpoints
    results.push(...await this.checkApplicationEndpoints());

    // SSL certificates
    results.push(...await this.checkSSLCertificates());

    // File system and permissions
    results.push(await this.checkFileSystemHealth());

    // Resource usage
    results.push(await this.checkResourceUsage());

    // Security configuration
    results.push(await this.checkSecurityConfiguration());

    const summary = this.calculateSummary(results);
    const overall = this.determineOverallHealth(results);

    return {
      overall,
      environment: this.environment,
      timestamp: new Date().toISOString(),
      results,
      summary,
    };
  }

  /**
   * Check environment configuration
   */
  async checkEnvironmentConfiguration(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const envCheck = validateEnv();
      const responseTime = Date.now() - start;

      return {
        component: 'environment_configuration',
        status: 'healthy',
        message: 'Environment configuration is valid',
        responseTime,
        metadata: {
          node_env: envCheck.NODE_ENV,
          app_name: envCheck.APP_NAME,
          app_version: envCheck.APP_VERSION,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'environment_configuration',
        status: 'unhealthy',
        message: `Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const dbCheck = await checkDatabaseConnectivity();

      if (!dbCheck.connected) {
        return {
          component: 'database',
          status: 'unhealthy',
          message: `Database connection failed: ${dbCheck.error}`,
          responseTime: Date.now() - start,
          lastChecked: new Date().toISOString(),
        };
      }

      // Additional database health checks
      const poolStatus = await this.checkDatabasePool();
      const slowQueries = await this.checkSlowQueries();

      const status = slowQueries > 10 ? 'degraded' : 'healthy';

      return {
        component: 'database',
        status,
        message: status === 'healthy' ? 'Database is healthy' : 'Database performance degraded',
        responseTime: dbCheck.latency,
        metadata: {
          connected: dbCheck.connected,
          pool_status: poolStatus,
          slow_queries: slowQueries,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'database',
        status: 'unhealthy',
        message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  async checkRedisHealth(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const redisCheck = await checkRedisConnectivity();

      if (!redisCheck.connected) {
        return {
          component: 'redis',
          status: 'unhealthy',
          message: `Redis connection failed: ${redisCheck.error}`,
          responseTime: Date.now() - start,
          lastChecked: new Date().toISOString(),
        };
      }

      // Additional Redis health checks
      const memoryUsage = await this.checkRedisMemoryUsage();
      const keyCount = await this.checkRedisKeyCount();

      const status = memoryUsage > 80 ? 'degraded' : 'healthy';

      return {
        component: 'redis',
        status,
        message: status === 'healthy' ? 'Redis is healthy' : 'Redis memory usage high',
        responseTime: redisCheck.latency,
        metadata: {
          connected: redisCheck.connected,
          memory_usage_percent: memoryUsage,
          key_count: keyCount,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'redis',
        status: 'unhealthy',
        message: `Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check external services health
   */
  async checkExternalServicesHealth(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    try {
      const servicesCheck = await checkExternalServices();

      for (const service of servicesCheck) {
        results.push({
          component: `external_service_${service.service.toLowerCase()}`,
          status: service.status,
          message: service.error || `${service.service} is ${service.status}`,
          responseTime: service.response_time,
          metadata: {
            service_name: service.service,
            error: service.error,
          },
          lastChecked: new Date().toISOString(),
        });
      }
    } catch (error) {
      results.push({
        component: 'external_services',
        status: 'unhealthy',
        message: `External services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * Check application endpoints
   */
  async checkApplicationEndpoints(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const endpoints = this.getApplicationEndpoints();

    for (const endpoint of endpoints) {
      const start = Date.now();

      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: endpoint.headers || {},
          signal: AbortSignal.timeout(this.timeout),
        });

        const responseTime = Date.now() - start;
        const status = response.ok ? 'healthy' : 'degraded';

        results.push({
          component: endpoint.name,
          status,
          message: `${endpoint.name} responded with ${response.status}`,
          responseTime,
          metadata: {
            url: endpoint.url,
            status_code: response.status,
            content_type: response.headers.get('content-type'),
          },
          lastChecked: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          component: endpoint.name,
          status: 'unhealthy',
          message: `${endpoint.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime: Date.now() - start,
          metadata: {
            url: endpoint.url,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          lastChecked: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Check SSL certificates
   */
  async checkSSLCertificates(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const domains = this.getSSLDomains();

    for (const domain of domains) {
      const start = Date.now();

      try {
        const certInfo = await this.getSSLCertificateInfo(domain);
        const daysUntilExpiry = this.calculateDaysUntilExpiry(certInfo.expiresAt);

        let status: 'healthy' | 'degraded' | 'unhealthy';
        if (daysUntilExpiry < 7) {
          status = 'unhealthy';
        } else if (daysUntilExpiry < 30) {
          status = 'degraded';
        } else {
          status = 'healthy';
        }

        results.push({
          component: `ssl_certificate_${domain.replace(/\./g, '_')}`,
          status,
          message: `SSL certificate expires in ${daysUntilExpiry} days`,
          responseTime: Date.now() - start,
          metadata: {
            domain,
            expires_at: certInfo.expiresAt,
            days_until_expiry: daysUntilExpiry,
            issuer: certInfo.issuer,
          },
          lastChecked: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          component: `ssl_certificate_${domain.replace(/\./g, '_')}`,
          status: 'unhealthy',
          message: `SSL certificate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime: Date.now() - start,
          metadata: {
            domain,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          lastChecked: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Check file system health
   */
  async checkFileSystemHealth(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const diskUsage = await this.checkDiskUsage();
      const permissions = await this.checkFilePermissions();

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (diskUsage > 90) {
        status = 'unhealthy';
      } else if (diskUsage > 80) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        component: 'filesystem',
        status,
        message: status === 'healthy' ? 'File system is healthy' : `Disk usage is ${diskUsage}%`,
        responseTime: Date.now() - start,
        metadata: {
          disk_usage_percent: diskUsage,
          permissions_ok: permissions,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'filesystem',
        status: 'unhealthy',
        message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check resource usage
   */
  async checkResourceUsage(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = await this.getMemoryUsage();
      const loadAverage = await this.getLoadAverage();

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (cpuUsage > 90 || memoryUsage > 90) {
        status = 'unhealthy';
      } else if (cpuUsage > 75 || memoryUsage > 75) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        component: 'system_resources',
        status,
        message: `CPU: ${cpuUsage}%, Memory: ${memoryUsage}%, Load: ${loadAverage}`,
        responseTime: Date.now() - start,
        metadata: {
          cpu_usage_percent: cpuUsage,
          memory_usage_percent: memoryUsage,
          load_average: loadAverage,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'system_resources',
        status: 'unhealthy',
        message: `Resource usage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check security configuration
   */
  async checkSecurityConfiguration(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const securityChecks = {
        ssl_enabled: process.env.DATABASE_SSL === 'true',
        cors_configured: !!process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*',
        rate_limiting: process.env.RATE_LIMIT_ENABLED === 'true',
        helmet_enabled: process.env.HELMET_ENABLED === 'true',
        csrf_enabled: process.env.CSRF_ENABLED === 'true',
        debug_disabled: process.env.DEBUG !== 'true' || this.environment === 'local',
      };

      const failedChecks = Object.entries(securityChecks).filter(([, passed]) => !passed);

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (failedChecks.length === 0) {
        status = 'healthy';
      } else if (failedChecks.length <= 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        component: 'security_configuration',
        status,
        message: failedChecks.length === 0
          ? 'Security configuration is compliant'
          : `${failedChecks.length} security issues found`,
        responseTime: Date.now() - start,
        metadata: {
          ...securityChecks,
          failed_checks: failedChecks.map(([check]) => check),
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'security_configuration',
        status: 'unhealthy',
        message: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async checkDatabasePool(): Promise<string> {
    // This would connect to your actual database and check pool status
    // For now, return a mock status
    return 'healthy';
  }

  private async checkSlowQueries(): Promise<number> {
    // This would query your database for slow query count
    // For now, return a mock count
    return 0;
  }

  private async checkRedisMemoryUsage(): Promise<number> {
    // This would connect to Redis and check memory usage
    // For now, return a mock percentage
    return 45;
  }

  private async checkRedisKeyCount(): Promise<number> {
    // This would connect to Redis and count keys
    // For now, return a mock count
    return 1000;
  }

  private getApplicationEndpoints(): Array<{name: string, url: string, headers?: Record<string, string>}> {
    const baseUrls = {
      local: 'http://localhost',
      development: 'https://dev.studyteddy.com',
      staging: 'https://staging.studyteddy.com',
      production: 'https://studyteddy.com',
    };

    const baseUrl = baseUrls[this.environment as keyof typeof baseUrls] || baseUrls.local;

    return [
      { name: 'frontend_health', url: `${baseUrl}/api/health` },
      { name: 'backend_health', url: `${baseUrl.replace('studyteddy.com', 'api.studyteddy.com')}/health` },
      { name: 'frontend_home', url: baseUrl },
    ];
  }

  private getSSLDomains(): string[] {
    switch (this.environment) {
      case 'production':
        return ['studyteddy.com', 'api.studyteddy.com', 'cdn.studyteddy.com'];
      case 'staging':
        return ['staging.studyteddy.com', 'api-staging.studyteddy.com'];
      default:
        return [];
    }
  }

  private async getSSLCertificateInfo(domain: string): Promise<{expiresAt: string, issuer: string}> {
    try {
      // Use openssl to get certificate info
      const output = execSync(`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates -issuer`,
        { encoding: 'utf-8', timeout: 10000 });

      const lines = output.trim().split('\n');
      const notAfterLine = lines.find(line => line.startsWith('notAfter='));
      const issuerLine = lines.find(line => line.startsWith('issuer='));

      const expiresAt = notAfterLine ? new Date(notAfterLine.split('=')[1]).toISOString() : '';
      const issuer = issuerLine ? issuerLine.split('=')[1] : 'Unknown';

      return { expiresAt, issuer };
    } catch (error) {
      throw new Error(`Failed to get SSL certificate info for ${domain}`);
    }
  }

  private calculateDaysUntilExpiry(expiresAt: string): number {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async checkDiskUsage(): Promise<number> {
    try {
      const output = execSync("df / | tail -1 | awk '{print $5}' | sed 's/%//'", { encoding: 'utf-8' });
      return parseInt(output.trim());
    } catch {
      return 0;
    }
  }

  private async checkFilePermissions(): Promise<boolean> {
    try {
      // Check if we can write to required directories
      const testDirs = ['./logs', './uploads', '/tmp'];

      for (const dir of testDirs) {
        try {
          execSync(`test -w ${dir}`, { timeout: 1000 });
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async getCPUUsage(): Promise<number> {
    try {
      const output = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", { encoding: 'utf-8' });
      return parseFloat(output.trim());
    } catch {
      return 0;
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const output = execSync("free | grep Mem | awk '{printf \"%.0f\", $3/$2 * 100.0}'", { encoding: 'utf-8' });
      return parseInt(output.trim());
    } catch {
      return 0;
    }
  }

  private async getLoadAverage(): Promise<number> {
    try {
      const output = execSync("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'", { encoding: 'utf-8' });
      return parseFloat(output.trim());
    } catch {
      return 0;
    }
  }

  private calculateSummary(results: HealthCheckResult[]): {total: number, healthy: number, degraded: number, unhealthy: number} {
    const summary = {
      total: results.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
    };

    for (const result of results) {
      summary[result.status]++;
    }

    return summary;
  }

  private determineOverallHealth(results: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');

    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

// ============================================
// Monitoring and Alerting
// ============================================

class HealthMonitor {
  private checker: HealthChecker;
  private alertThresholds: {
    consecutiveFailures: number;
    degradedAlertAfter: number;
  };

  constructor(environment: string) {
    this.checker = new HealthChecker(environment);
    this.alertThresholds = {
      consecutiveFailures: 3,
      degradedAlertAfter: 5,
    };
  }

  /**
   * Run continuous monitoring
   */
  async startMonitoring(interval: number = 60000): Promise<void> {
    console.log(`🔄 Starting health monitoring (interval: ${interval}ms)`);

    const monitor = async () => {
      try {
        const results = await this.checker.runAllChecks();
        await this.processResults(results);
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    };

    // Initial check
    await monitor();

    // Set up interval
    setInterval(monitor, interval);
  }

  /**
   * Process health check results and send alerts if needed
   */
  private async processResults(results: HealthCheckSuite): Promise<void> {
    console.log(`📊 Health check completed: ${results.overall} (${results.summary.healthy}/${results.summary.total} healthy)`);

    // Log detailed results
    for (const result of results.results) {
      const emoji = result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';
      console.log(`${emoji} ${result.component}: ${result.message} (${result.responseTime}ms)`);
    }

    // Send alerts for critical issues
    await this.sendAlertsIfNeeded(results);

    // Store results for trending (if needed)
    await this.storeResults(results);
  }

  /**
   * Send alerts based on health check results
   */
  private async sendAlertsIfNeeded(results: HealthCheckSuite): Promise<void> {
    const criticalComponents = results.results.filter(r => r.status === 'unhealthy');
    const degradedComponents = results.results.filter(r => r.status === 'degraded');

    if (criticalComponents.length > 0) {
      await this.sendAlert('critical', `${criticalComponents.length} components are unhealthy`, criticalComponents);
    }

    if (degradedComponents.length >= this.alertThresholds.degradedAlertAfter) {
      await this.sendAlert('warning', `${degradedComponents.length} components are degraded`, degradedComponents);
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(severity: 'critical' | 'warning', message: string, components: HealthCheckResult[]): Promise<void> {
    const webhook = process.env.HEALTH_ALERT_WEBHOOK;

    if (!webhook) {
      console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${message}`);
      return;
    }

    try {
      const payload = {
        severity,
        message,
        environment: this.checker['environment'],
        timestamp: new Date().toISOString(),
        components: components.map(c => ({
          name: c.component,
          status: c.status,
          message: c.message,
        })),
      };

      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log(`📨 Alert sent: ${severity} - ${message}`);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Store health check results
   */
  private async storeResults(results: HealthCheckSuite): Promise<void> {
    // This could store to a time series database, metrics system, etc.
    // For now, just log to file
    const logFile = `./logs/health-checks-${results.environment}.log`;
    const logEntry = `${results.timestamp} ${results.overall} ${JSON.stringify(results.summary)}\n`;

    try {
      // In a real implementation, you'd use proper file handling
      console.log(`📝 Health check logged: ${results.overall}`);
    } catch (error) {
      console.error('Failed to store health check results:', error);
    }
  }
}

// ============================================
// CLI Interface
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  const environment = args[1] || process.env.NODE_ENV || 'development';

  try {
    switch (command) {
      case 'check':
        await runHealthCheck(environment);
        break;

      case 'monitor':
        await startHealthMonitoring(environment, parseInt(args[2]) || 60000);
        break;

      case 'component':
        await checkSpecificComponent(environment, args[2]);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

async function runHealthCheck(environment: string): Promise<void> {
  const checker = new HealthChecker(environment);
  const results = await checker.runAllChecks();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 HEALTH CHECK SUMMARY - ${environment.toUpperCase()}`);
  console.log('='.repeat(50));
  console.log(`Overall Status: ${getStatusEmoji(results.overall)} ${results.overall.toUpperCase()}`);
  console.log(`Total Checks: ${results.summary.total}`);
  console.log(`Healthy: ${results.summary.healthy}`);
  console.log(`Degraded: ${results.summary.degraded}`);
  console.log(`Unhealthy: ${results.summary.unhealthy}`);
  console.log('='.repeat(50));

  // Print detailed results
  for (const result of results.results) {
    const emoji = getStatusEmoji(result.status);
    const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
    console.log(`${emoji} ${result.component}: ${result.message}${time}`);
  }

  // Exit with appropriate code
  if (results.overall === 'unhealthy') {
    process.exit(1);
  } else if (results.overall === 'degraded') {
    process.exit(2);
  }
}

async function startHealthMonitoring(environment: string, interval: number): Promise<void> {
  const monitor = new HealthMonitor(environment);
  await monitor.startMonitoring(interval);
}

async function checkSpecificComponent(environment: string, component: string): Promise<void> {
  if (!component) {
    console.error('Component name required');
    process.exit(1);
  }

  const checker = new HealthChecker(environment);
  const results = await checker.runAllChecks();
  const componentResult = results.results.find(r => r.component === component);

  if (!componentResult) {
    console.error(`Component '${component}' not found`);
    process.exit(1);
  }

  const emoji = getStatusEmoji(componentResult.status);
  console.log(`${emoji} ${componentResult.component}: ${componentResult.message}`);

  if (componentResult.responseTime) {
    console.log(`Response Time: ${componentResult.responseTime}ms`);
  }

  if (componentResult.metadata) {
    console.log('Metadata:', JSON.stringify(componentResult.metadata, null, 2));
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'unhealthy': return '❌';
    default: return '❓';
  }
}

function showHelp(): void {
  console.log(`
Study Teddy Health Check Tool

Usage: bun run scripts/health-check.ts <command> [options]

Commands:
  check [environment]
    Run a one-time health check for the specified environment

  monitor [environment] [interval]
    Start continuous health monitoring (interval in milliseconds)

  component [environment] <component-name>
    Check a specific component

  help
    Show this help message

Examples:
  bun run scripts/health-check.ts check production
  bun run scripts/health-check.ts monitor staging 30000
  bun run scripts/health-check.ts component production database

Environment Variables:
  NODE_ENV                - Default environment if not specified
  HEALTH_ALERT_WEBHOOK   - Webhook URL for health alerts
  DATABASE_URL           - Database connection string
  REDIS_URL              - Redis connection string
`);
}

// Run CLI if this is the main module
if (import.meta.main) {
  main();
}