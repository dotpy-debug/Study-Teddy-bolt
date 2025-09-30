import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required');
        }

        // Optimized connection configuration for performance
        const sql = postgres(databaseUrl, {
          // Connection pool settings
          max: 20, // Maximum connections
          min: 5, // Minimum connections
          idle_timeout: 20, // Close idle connections after 20 seconds
          max_lifetime: 60 * 30, // Close connections after 30 minutes

          // Performance optimizations
          prepare: true, // Use prepared statements
          transform: {
            // Optimize type transformations
            undefined: null,
          },

          // Connection options
          connect_timeout: 10, // 10 seconds timeout
          keepalive: true,
          keepalive_idle: 30,

          // SSL configuration for production
          ssl:
            process.env.NODE_ENV === 'production'
              ? {
                  rejectUnauthorized: false, // Adjust based on your SSL setup
                }
              : false,

          // Enable debugging in development
          debug: process.env.NODE_ENV === 'development',

          // Connection retry logic
          connection: {
            application_name: 'study-teddy-backend',
          },

          // Performance monitoring
          onnotice: process.env.NODE_ENV === 'development' ? console.log : undefined,
        });

        // Initialize Drizzle with performance optimizations
        const db = drizzle(sql, {
          schema,
          logger: process.env.NODE_ENV === 'development',
        });

        return { sql, db };
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ['DATABASE_CONNECTION', DatabaseService],
})
export class DatabaseModule {}
