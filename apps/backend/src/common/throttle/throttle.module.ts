import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nestjs/throttler/dist/storages';
import * as Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        return {
          // Default throttle settings
          throttlers: [
            {
              name: 'default',
              ttl: 60 * 1000, // 1 minute
              limit: 100, // 100 requests per minute
            },
            {
              name: 'strict',
              ttl: 60 * 1000, // 1 minute
              limit: 20, // 20 requests per minute for sensitive endpoints
            },
            {
              name: 'auth',
              ttl: 15 * 60 * 1000, // 15 minutes
              limit: 5, // 5 login attempts per 15 minutes
            },
            {
              name: 'ai',
              ttl: 60 * 1000, // 1 minute
              limit: 10, // 10 AI requests per minute for free users
            },
            {
              name: 'premium_ai',
              ttl: 60 * 1000, // 1 minute
              limit: 50, // 50 AI requests per minute for premium users
            },
          ],
          // Use Redis for distributed rate limiting if available
          storage: redisUrl
            ? new ThrottlerStorageRedisService(
                new Redis.Redis({
                  host: redisUrl.includes('://')
                    ? new URL(redisUrl).hostname
                    : redisUrl,
                  port: redisUrl.includes('://')
                    ? Number(new URL(redisUrl).port) || 6379
                    : 6379,
                  password: redisUrl.includes('://')
                    ? new URL(redisUrl).password
                    : undefined,
                  retryAttempts: 3,
                  retryDelayMs: 1000,
                  keyPrefix: 'throttle:',
                }),
              )
            : undefined,
          // Skip successful responses for better UX
          skipSuccessfulRequests: false,
          // Skip failed requests to allow retries
          skipFailedRequests: true,
          // Ignore user agents (bots, etc.)
          ignoreUserAgents: [
            /Googlebot/gi,
            /Bingbot/gi,
            /Slackbot/gi,
            /TwitterBot/gi,
            /facebookexternalhit/gi,
            /LinkedInBot/gi,
          ],
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class CustomThrottleModule {}
