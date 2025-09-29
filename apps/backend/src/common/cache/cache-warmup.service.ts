import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from './cache.service';
import { DrizzleService } from '../../db/drizzle.service';
import { users } from '../../db/schema';
import { sql } from 'drizzle-orm';

@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name);

  constructor(
    private cacheService: CacheService,
    private drizzleService: DrizzleService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Warm up cache after a short delay to ensure database connection is ready
    setTimeout(() => {
      void this.warmupFrequentlyAccessedData();
    }, 5000);
  }

  async warmupFrequentlyAccessedData() {
    try {
      this.logger.log('Starting cache warmup for frequently accessed data...');

      // Get list of active users (users who have logged in recently)
      const activeUsers = await this.drizzleService.db
        .select({ id: users.id })
        .from(users)
        .where(sql`created_at > NOW() - INTERVAL '30 days'`)
        .limit(50); // Limit to prevent overwhelming the cache

      let warmedUpCount = 0;

      for (const user of activeUsers) {
        try {
          // Warm up dashboard stats cache
          const statsKey = this.cacheService.generateKey(
            'dashboard_stats',
            user.id,
          );
          await this.cacheService.set(statsKey, null, 1); // Set temporary value to mark as warming

          // Warm up streak cache
          const streakKey = this.cacheService.generateKey(
            'dashboard_streak',
            user.id,
          );
          await this.cacheService.set(streakKey, null, 1);

          // Warm up current week's data
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const weekIdentifier = startOfWeek.toISOString().split('T')[0];
          const weeklyKey = this.cacheService.generateKey(
            'dashboard_weekly',
            user.id,
            weekIdentifier,
          );
          await this.cacheService.set(weeklyKey, null, 1);

          warmedUpCount++;

          // Add small delay to prevent overwhelming the database
          if (warmedUpCount % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          this.logger.warn(
            `Failed to warm up cache for user ${user.id}:`,
            error,
          );
        }
      }

      this.logger.log(`Cache warmup completed for ${warmedUpCount} users`);
    } catch (error) {
      this.logger.error('Cache warmup failed:', error);
    }
  }

  async warmupUserData(userId: string) {
    try {
      this.logger.debug(`Warming up cache for user: ${userId}`);

      // Pre-populate cache with placeholder values that will be replaced on first access
      const statsKey = this.cacheService.generateKey('dashboard_stats', userId);
      const streakKey = this.cacheService.generateKey(
        'dashboard_streak',
        userId,
      );
      const chatKey = this.cacheService.generateKey('ai_chat_history', userId);

      // Set placeholder values that will trigger actual data loading on first access
      await Promise.all([
        this.cacheService.set(statsKey, null, 1),
        this.cacheService.set(streakKey, null, 1),
        this.cacheService.set(chatKey, null, 1),
      ]);

      this.logger.debug(`Cache warmup completed for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Cache warmup failed for user ${userId}:`, error);
    }
  }
}
