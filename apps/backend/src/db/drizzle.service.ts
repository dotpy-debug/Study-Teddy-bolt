import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit {
  private _db: ReturnType<typeof drizzle>;
  private sql: ReturnType<typeof postgres>;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    const connectionString = this.configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is required. ' +
          'Ensure it is properly configured in your .env file.',
      );
    }

    // Configure postgres connection with connection pooling and proper settings
    this.sql = postgres(connectionString, {
      max: this.configService.get<number>('DB_POOL_MAX', 20),
      idle_timeout: this.configService.get<number>('DB_IDLE_TIMEOUT', 20),
      connect_timeout: this.configService.get<number>('DB_CONNECT_TIMEOUT', 10),
      transform: {
        undefined: null,
      },
      onnotice:
        this.configService.get('NODE_ENV') === 'development'
          ? console.log
          : () => {},
      debug:
        this.configService.get('NODE_ENV') === 'development' &&
        this.configService.get('DB_DEBUG') === 'true',
    });

    // Create drizzle database instance with schema
    this._db = drizzle(this.sql, {
      schema,
      logger:
        this.configService.get('NODE_ENV') === 'development' &&
        this.configService.get('DB_LOGGING') === 'true',
    });

    // Test connection
    try {
      await this.sql`SELECT 1`;
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  get db() {
    if (!this._db) {
      throw new Error(
        'Database not initialized. Ensure DrizzleService is properly configured.',
      );
    }
    return this._db;
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.sql) {
      await this.sql.end();
      console.log('Database connections closed');
    }
  }
}
