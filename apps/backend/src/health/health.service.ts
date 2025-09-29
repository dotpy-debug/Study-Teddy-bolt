import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '../db/drizzle.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly drizzleService: DrizzleService,
  ) {}

  async getHealthStatus() {
    try {
      const [databaseStatus, openaiStatus] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkOpenAI(),
      ]);

      const isHealthy =
        databaseStatus.status === 'fulfilled' &&
        openaiStatus.status === 'fulfilled';

      const response = {
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: this.configService.get('NODE_ENV', 'development'),
        services: {
          database:
            databaseStatus.status === 'fulfilled'
              ? 'connected'
              : 'disconnected',
          openai:
            openaiStatus.status === 'fulfilled' ? 'available' : 'unavailable',
        },
      };

      if (!isHealthy) {
        const errors: string[] = [];
        if (databaseStatus.status === 'rejected') {
          errors.push(`Database: ${databaseStatus.reason.message}`);
        }
        if (openaiStatus.status === 'rejected') {
          errors.push(`OpenAI: ${openaiStatus.reason.message}`);
        }
        response['errors'] = errors;
      }

      return response;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  async getReadinessStatus() {
    try {
      // Check if all critical services are ready
      await this.checkDatabase();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        message: 'Service is ready to accept requests',
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      throw new Error('Service not ready');
    }
  }

  async getLivenessStatus() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      message: 'Service is alive',
    };
  }

  private async checkDatabase(): Promise<void> {
    try {
      // Simple query to check database connectivity
      await this.drizzleService.db.execute('SELECT 1');
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new Error('Database connection failed');
    }
  }

  private async checkOpenAI(): Promise<void> {
    try {
      const apiKey = this.configService.get('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // We don't make an actual API call to avoid costs
      // Just check if the key is configured
      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }
    } catch (error) {
      this.logger.error('OpenAI health check failed', error);
      throw new Error('OpenAI service check failed');
    }
  }
}
