import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheTestService {
  private readonly logger = new Logger(CacheTestService.name);

  constructor(private cacheService: CacheService) {}

  async testCacheOperations(): Promise<{
    success: boolean;
    tests?: {
      basicSetGet: boolean;
      cacheMiss: boolean;
      cacheWarm: boolean;
      cacheDelete: boolean;
      cacheStats: boolean;
    };
    stats?: any;
    error?: string;
  }> {
    try {
      this.logger.log('Starting cache operations test...');

      // Test 1: Basic set and get
      const testKey = 'test:cache:basic';
      const testValue = { message: 'Hello Cache!', timestamp: Date.now() };

      await this.cacheService.set(testKey, testValue, 60); // 1 minute TTL
      const retrievedValue = await this.cacheService.get(testKey);

      const test1Passed =
        JSON.stringify(retrievedValue) === JSON.stringify(testValue);
      this.logger.log(
        `Test 1 (Basic Set/Get): ${test1Passed ? 'PASSED' : 'FAILED'}`,
      );

      // Test 2: Cache miss
      const missValue = await this.cacheService.get('nonexistent:key');
      const test2Passed = missValue === null;
      this.logger.log(
        `Test 2 (Cache Miss): ${test2Passed ? 'PASSED' : 'FAILED'}`,
      );

      // Test 3: Cache warm (should return cached value on second call)
      const warmKey = 'test:warm';
      let callCount = 0;

      const dataFunction = async (): Promise<{
        data: string;
        callNumber: number;
      }> => {
        callCount++;
        return { data: 'warm data', callNumber: callCount };
      };

      const result1 = await this.cacheService.warm(warmKey, dataFunction, 60);
      const result2 = await this.cacheService.warm(warmKey, dataFunction, 60);

      const test3Passed = result1.callNumber === 1 && result2.callNumber === 1;
      this.logger.log(
        `Test 3 (Cache Warm): ${test3Passed ? 'PASSED' : 'FAILED'}`,
      );

      // Test 4: Cache delete
      await this.cacheService.del(testKey);
      const deletedValue = await this.cacheService.get(testKey);
      const test4Passed = deletedValue === null;
      this.logger.log(
        `Test 4 (Cache Delete): ${test4Passed ? 'PASSED' : 'FAILED'}`,
      );

      // Test 5: Cache stats
      const stats = this.cacheService.getStats();
      const test5Passed =
        typeof stats.hits === 'number' && typeof stats.misses === 'number';
      this.logger.log(
        `Test 5 (Cache Stats): ${test5Passed ? 'PASSED' : 'FAILED'}`,
      );
      this.logger.log(`Cache Stats: ${JSON.stringify(stats)}`);

      const allTestsPassed =
        test1Passed && test2Passed && test3Passed && test4Passed && test5Passed;

      return {
        success: allTestsPassed,
        tests: {
          basicSetGet: test1Passed,
          cacheMiss: test2Passed,
          cacheWarm: test3Passed,
          cacheDelete: test4Passed,
          cacheStats: test5Passed,
        },
        stats: stats,
      };
    } catch (error) {
      this.logger.error('Cache test failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async simulateDashboardLoad(userId: string): Promise<any> {
    this.logger.log(`Simulating dashboard load for user: ${userId}`);

    const startTime = Date.now();

    // Simulate expensive database queries
    const simulateStatsQuery = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate 100ms query
      return {
        totalTasks: 42,
        completedTasks: 28,
        pendingTasks: 14,
        totalStudyHours: 156.5,
        totalAIChats: 89,
        completionRate: 67,
      };
    };

    const simulateStreakQuery = async () => {
      await new Promise((resolve) => setTimeout(resolve, 150)); // Simulate 150ms query
      return {
        currentStreak: 7,
        longestStreak: 21,
        lastStudyDate: new Date().toISOString(),
      };
    };

    const simulateWeeklyQuery = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate 200ms query
      return {
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        totalTasks: 12,
        completedTasks: 8,
        totalStudyHours: 25.5,
        dailyBreakdown: [],
      };
    };

    // Test without cache
    const noCacheStart = Date.now();
    await Promise.all([
      simulateStatsQuery(),
      simulateStreakQuery(),
      simulateWeeklyQuery(),
    ]);
    const noCacheTime = Date.now() - noCacheStart;

    // Test with cache
    const cacheStart = Date.now();
    const [stats, streak, weekly] = await Promise.all([
      this.cacheService.warm(
        `dashboard_stats:${userId}`,
        simulateStatsQuery,
        300,
      ),
      this.cacheService.warm(
        `dashboard_streak:${userId}`,
        simulateStreakQuery,
        600,
      ),
      this.cacheService.warm(
        `dashboard_weekly:${userId}:2024-01-01`,
        simulateWeeklyQuery,
        1800,
      ),
    ]);
    const cacheTime = Date.now() - cacheStart;

    // Test cached retrieval (should be much faster)
    const cachedStart = Date.now();
    await Promise.all([
      this.cacheService.get(`dashboard_stats:${userId}`),
      this.cacheService.get(`dashboard_streak:${userId}`),
      this.cacheService.get(`dashboard_weekly:${userId}:2024-01-01`),
    ]);
    const cachedTime = Date.now() - cachedStart;

    const totalTime = Date.now() - startTime;

    return {
      performance: {
        withoutCache: `${noCacheTime}ms`,
        withCacheFirstTime: `${cacheTime}ms`,
        withCacheCached: `${cachedTime}ms`,
        totalTestTime: `${totalTime}ms`,
        improvement: `${Math.round(((noCacheTime - cachedTime) / noCacheTime) * 100)}%`,
      },
      data: { stats, streak, weekly },
      cacheStats: this.cacheService.getStats(),
    };
  }
}
