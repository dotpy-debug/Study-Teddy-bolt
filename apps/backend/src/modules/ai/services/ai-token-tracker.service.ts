import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DrizzleService } from '../../../db/drizzle.service';
import { aiChats, users } from '../../../db/schema';
import { eq, and, gte, sum, sql } from 'drizzle-orm';
import { CacheService } from '../../../common/cache/cache.service';

export interface TokenBudget {
  dailyLimit: number;
  perRequestLimit: number;
  currentDailyUsage: number;
  remainingDaily: number;
  resetTime: Date;
}

export interface TokenUsage {
  userId: string;
  actionType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costInCents: number;
  model: string;
  provider: string;
  timestamp: Date;
}

export interface UsageStats {
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
  totalCostCents: number;
  averageRequestTokens: number;
  mostUsedAction: string;
  costBreakdown: Record<string, number>;
}

@Injectable()
export class AITokenTrackerService {
  private readonly logger = new Logger(AITokenTrackerService.name);

  // Budget limits
  private readonly DAILY_TOKEN_LIMIT = 30000; // 30k tokens per day
  private readonly PER_REQUEST_LIMIT = 3000; // 3k tokens per request
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private drizzleService: DrizzleService,
    private cacheService: CacheService,
  ) {}

  /**
   * Check if user can make a request within budget limits
   */
  async checkBudget(
    userId: string,
    estimatedTokens?: number,
  ): Promise<TokenBudget> {
    const cacheKey = this.cacheService.generateKey('token_budget', userId);

    // Try to get from cache first
    const cachedBudget = await this.cacheService.get(cacheKey);
    if (cachedBudget && this.isBudgetValid(cachedBudget)) {
      return cachedBudget;
    }

    // Calculate fresh budget
    const budget = await this.calculateBudget(userId);

    // Cache the result
    await this.cacheService.set(cacheKey, budget, this.CACHE_TTL);

    // Check if estimated tokens would exceed limits
    if (estimatedTokens) {
      if (estimatedTokens > this.PER_REQUEST_LIMIT) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Request estimated to use ${estimatedTokens} tokens, which exceeds the ${this.PER_REQUEST_LIMIT} token per request limit`,
            error: 'REQUEST_TOKEN_LIMIT_EXCEEDED',
            budget,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (budget.currentDailyUsage + estimatedTokens > this.DAILY_TOKEN_LIMIT) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Daily token limit would be exceeded. Current usage: ${budget.currentDailyUsage}, Estimated request: ${estimatedTokens}, Daily limit: ${this.DAILY_TOKEN_LIMIT}`,
            error: 'DAILY_TOKEN_LIMIT_EXCEEDED',
            budget,
            resetTime: budget.resetTime,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return budget;
  }

  /**
   * Track token usage after AI request completion
   */
  async trackUsage(usage: TokenUsage): Promise<void> {
    try {
      // Validate token usage against limits
      if (usage.totalTokens > this.PER_REQUEST_LIMIT) {
        this.logger.warn(
          `Request exceeded per-request limit: ${usage.totalTokens} > ${this.PER_REQUEST_LIMIT} for user ${usage.userId}`,
        );
      }

      // Record usage in database
      await this.drizzleService.db.insert(aiChats).values({
        userId: usage.userId,
        actionType: usage.actionType as any,
        prompt: '', // Will be filled by caller
        response: '', // Will be filled by caller
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        costInCents: usage.costInCents.toString(),
        createdAt: usage.timestamp,
      });

      // Invalidate budget cache
      const cacheKey = this.cacheService.generateKey(
        'token_budget',
        usage.userId,
      );
      await this.cacheService.del(cacheKey);

      // Check if daily limit was exceeded
      const newBudget = await this.calculateBudget(usage.userId);
      if (newBudget.currentDailyUsage > this.DAILY_TOKEN_LIMIT) {
        this.logger.warn(
          `User ${usage.userId} exceeded daily token limit: ${newBudget.currentDailyUsage} > ${this.DAILY_TOKEN_LIMIT}`,
        );
      }

      this.logger.debug(
        `Tracked usage for user ${usage.userId}: ${usage.totalTokens} tokens, $${(usage.costInCents / 100).toFixed(4)}`,
      );
    } catch (error) {
      this.logger.error('Failed to track token usage:', error);
      // Don't throw - tracking failures shouldn't break AI requests
    }
  }

  /**
   * Get comprehensive usage statistics for a user
   */
  async getUsageStats(userId: string): Promise<UsageStats> {
    const cacheKey = this.cacheService.generateKey('usage_stats', userId);

    const cachedStats = await this.cacheService.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      // Get usage data
      const [dailyUsage, weeklyUsage, monthlyUsage, actionStats] =
        await Promise.all([
          this.getUserUsageSince(userId, todayStart),
          this.getUserUsageSince(userId, weekStart),
          this.getUserUsageSince(userId, monthStart),
          this.getActionBreakdown(userId, monthStart),
        ]);

      const stats: UsageStats = {
        dailyUsage: dailyUsage.tokens,
        weeklyUsage: weeklyUsage.tokens,
        monthlyUsage: monthlyUsage.tokens,
        totalCostCents: monthlyUsage.cost,
        averageRequestTokens: actionStats.averageTokens,
        mostUsedAction: actionStats.mostUsed,
        costBreakdown: actionStats.costBreakdown,
      };

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, stats, this.CACHE_TTL);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get usage stats:', error);
      throw new HttpException(
        'Failed to retrieve usage statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get budget information for multiple users (admin function)
   */
  async getBudgetOverview(): Promise<{
    totalUsers: number;
    usersOverLimit: number;
    averageUsage: number;
    totalTokensToday: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const result = await this.drizzleService.db
        .select({
          totalUsers: sql<number>`count(distinct ${aiChats.userId})`,
          totalTokens: sql<number>`coalesce(sum(${aiChats.totalTokens}), 0)`,
        })
        .from(aiChats)
        .where(gte(aiChats.createdAt, todayStart));

      const stats = result[0];

      // Get users over limit
      const usersOverLimit = await this.getUsersOverDailyLimit();

      return {
        totalUsers: stats.totalUsers,
        usersOverLimit: usersOverLimit.length,
        averageUsage:
          stats.totalUsers > 0 ? stats.totalTokens / stats.totalUsers : 0,
        totalTokensToday: stats.totalTokens,
      };
    } catch (error) {
      this.logger.error('Failed to get budget overview:', error);
      throw new HttpException(
        'Failed to retrieve budget overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reset budget for a user (admin function)
   */
  async resetUserBudget(userId: string): Promise<void> {
    const cacheKey = this.cacheService.generateKey('token_budget', userId);
    await this.cacheService.del(cacheKey);
    this.logger.log(`Reset budget cache for user: ${userId}`);
  }

  private async calculateBudget(userId: string): Promise<TokenBudget> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const usage = await this.getUserUsageSince(userId, todayStart);

    return {
      dailyLimit: this.DAILY_TOKEN_LIMIT,
      perRequestLimit: this.PER_REQUEST_LIMIT,
      currentDailyUsage: usage.tokens,
      remainingDaily: Math.max(0, this.DAILY_TOKEN_LIMIT - usage.tokens),
      resetTime: tomorrowStart,
    };
  }

  private async getUserUsageSince(
    userId: string,
    since: Date,
  ): Promise<{ tokens: number; cost: number }> {
    const result = await this.drizzleService.db
      .select({
        totalTokens: sql<number>`coalesce(sum(${aiChats.totalTokens}), 0)`,
        totalCost: sql<number>`coalesce(sum(${aiChats.costInCents}), 0)`,
      })
      .from(aiChats)
      .where(and(eq(aiChats.userId, userId), gte(aiChats.createdAt, since)));

    const stats = result[0];
    return {
      tokens: stats.totalTokens,
      cost: Number(stats.totalCost),
    };
  }

  private async getActionBreakdown(
    userId: string,
    since: Date,
  ): Promise<{
    averageTokens: number;
    mostUsed: string;
    costBreakdown: Record<string, number>;
  }> {
    const result = await this.drizzleService.db
      .select({
        actionType: aiChats.actionType,
        totalTokens: sql<number>`sum(${aiChats.totalTokens})`,
        totalCost: sql<number>`sum(${aiChats.costInCents})`,
        requestCount: sql<number>`count(*)`,
      })
      .from(aiChats)
      .where(and(eq(aiChats.userId, userId), gte(aiChats.createdAt, since)))
      .groupBy(aiChats.actionType);

    if (result.length === 0) {
      return {
        averageTokens: 0,
        mostUsed: 'none',
        costBreakdown: {},
      };
    }

    const totalTokens = result.reduce((sum, row) => sum + row.totalTokens, 0);
    const totalRequests = result.reduce(
      (sum, row) => sum + row.requestCount,
      0,
    );

    const mostUsed = result.reduce((max, row) =>
      row.requestCount > max.requestCount ? row : max,
    );

    const costBreakdown: Record<string, number> = {};
    result.forEach((row) => {
      costBreakdown[row.actionType] = Number(row.totalCost);
    });

    return {
      averageTokens: totalRequests > 0 ? totalTokens / totalRequests : 0,
      mostUsed: mostUsed.actionType,
      costBreakdown,
    };
  }

  private async getUsersOverDailyLimit(): Promise<string[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await this.drizzleService.db
      .select({
        userId: aiChats.userId,
        totalTokens: sql<number>`sum(${aiChats.totalTokens})`,
      })
      .from(aiChats)
      .where(gte(aiChats.createdAt, todayStart))
      .groupBy(aiChats.userId)
      .having(sql`sum(${aiChats.totalTokens}) > ${this.DAILY_TOKEN_LIMIT}`);

    return result.map((row) => row.userId);
  }

  private isBudgetValid(budget: TokenBudget): boolean {
    return budget.resetTime > new Date();
  }
}
