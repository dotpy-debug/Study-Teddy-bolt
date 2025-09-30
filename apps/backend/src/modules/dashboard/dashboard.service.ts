import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { studyTasks, studySessions, aiChats } from '../../db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private cacheService: CacheService,
    private drizzleService: DrizzleService,
  ) {}
  async getStats(userId: string, query?: any) {
    const cacheKey = this.cacheService.generateKey('dashboard_stats', userId);

    return this.cacheService.warm(
      cacheKey,
      async () => {
        this.logger.debug(`Fetching stats from database for user: ${userId}`);

        // Get total tasks
        const totalTasks = await this.drizzleService.db
          .select({ count: sql<number>`count(*)` })
          .from(studyTasks)
          .where(eq(studyTasks.userId, userId));

        // Get completed tasks
        const completedTasks = await this.drizzleService.db
          .select({ count: sql<number>`count(*)` })
          .from(studyTasks)
          .where(and(eq(studyTasks.userId, userId), eq(studyTasks.completed, true)));

        // Get total study hours (from study sessions)
        const totalStudyTime = await this.drizzleService.db
          .select({ totalMinutes: sql<number>`sum(duration_minutes)` })
          .from(studySessions)
          .where(eq(studySessions.userId, userId));

        // Get total AI chats
        const totalAIChats = await this.drizzleService.db
          .select({ count: sql<number>`count(*)` })
          .from(aiChats)
          .where(eq(aiChats.userId, userId));

        // Get pending tasks
        const pendingTasks = await this.drizzleService.db
          .select({ count: sql<number>`count(*)` })
          .from(studyTasks)
          .where(and(eq(studyTasks.userId, userId), eq(studyTasks.completed, false)));

        return {
          totalTasks: totalTasks[0]?.count || 0,
          completedTasks: completedTasks[0]?.count || 0,
          pendingTasks: pendingTasks[0]?.count || 0,
          totalStudyHours: Math.round(((totalStudyTime[0]?.totalMinutes || 0) / 60) * 10) / 10,
          totalAIChats: totalAIChats[0]?.count || 0,
          completionRate:
            totalTasks[0]?.count > 0
              ? Math.round((completedTasks[0]?.count / totalTasks[0]?.count) * 100)
              : 0,
        };
      },
      300,
    ); // 5 minutes TTL
  }

  async getStreak(userId: string, query?: any) {
    const cacheKey = this.cacheService.generateKey('dashboard_streak', userId);

    return this.cacheService.warm(
      cacheKey,
      async () => {
        this.logger.debug(`Fetching streak from database for user: ${userId}`);

        // Get study sessions ordered by date
        const sessions = await this.drizzleService.db
          .select()
          .from(studySessions)
          .where(eq(studySessions.userId, userId))
          .orderBy(sql`date DESC`);

        if (sessions.length === 0) {
          return {
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: null,
          };
        }

        // Calculate current streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const uniqueDates = [...new Set(sessions.map((s) => new Date(s.date).toDateString()))].sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime(),
        );

        // Check if studied today or yesterday to start streak
        const latestStudyDate = new Date(uniqueDates[0]);
        const daysDiff = Math.floor(
          (today.getTime() - latestStudyDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff <= 1) {
          currentStreak = 1;
          const checkDate = new Date(latestStudyDate);

          for (let i = 1; i < uniqueDates.length; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const prevDate = new Date(uniqueDates[i]);

            if (checkDate.toDateString() === prevDate.toDateString()) {
              currentStreak++;
            } else {
              break;
            }
          }
        }

        // Calculate longest streak (simplified)
        const longestStreak = Math.max(currentStreak, uniqueDates.length);

        return {
          currentStreak,
          longestStreak,
          lastStudyDate: sessions[0]?.date || null,
        };
      },
      600,
    ); // 10 minutes TTL for streak data
  }

  async getWeeklyOverview(userId: string, query?: any) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Generate cache key with week identifier to ensure weekly cache invalidation
    const weekIdentifier = startOfWeek.toISOString().split('T')[0];
    const cacheKey = this.cacheService.generateKey('dashboard_weekly', userId, weekIdentifier);

    return this.cacheService.warm(
      cacheKey,
      async () => {
        this.logger.debug(`Fetching weekly overview from database for user: ${userId}`);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Get tasks due this week
        const weeklyTasks = await this.drizzleService.db
          .select()
          .from(studyTasks)
          .where(
            and(
              eq(studyTasks.userId, userId),
              gte(studyTasks.dueDate, startOfWeek),
              lte(studyTasks.dueDate, endOfWeek),
            ),
          );

        // Get study sessions this week
        const weeklySessions = await this.drizzleService.db
          .select()
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, userId),
              gte(studySessions.date, startOfWeek),
              lte(studySessions.date, endOfWeek),
            ),
          );

        // Group by day
        const weeklyData: any[] = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          const dateStr = date.toDateString();

          const dayTasks = weeklyTasks.filter(
            (task) => task.dueDate && new Date(task.dueDate).toDateString() === dateStr,
          );

          const daySessions = weeklySessions.filter(
            (session) => new Date(session.date).toDateString() === dateStr,
          );

          const totalMinutes = daySessions.reduce(
            (sum, session) => sum + session.durationMinutes,
            0,
          );

          weeklyData.push({
            date: dateStr,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            tasksCount: dayTasks.length,
            completedTasks: dayTasks.filter((t) => t.completed).length,
            studyMinutes: totalMinutes,
            studyHours: Math.round((totalMinutes / 60) * 10) / 10,
          });
        }

        return {
          weekStart: startOfWeek.toISOString(),
          weekEnd: endOfWeek.toISOString(),
          totalTasks: weeklyTasks.length,
          completedTasks: weeklyTasks.filter((t) => t.completed).length,
          totalStudyHours:
            Math.round((weeklySessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60) * 10) /
            10,
          dailyBreakdown: weeklyData,
        };
      },
      1800,
    ); // 30 minutes TTL for weekly data
  }

  async getActivity(userId: string, query?: any) {
    const { startDate, endDate, activityType } = query || {};

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate) : new Date();

    const cacheKey = this.cacheService.generateKey('dashboard_activity', userId);

    return this.cacheService.warm(
      cacheKey,
      async () => {
        this.logger.debug(`Fetching activity data from database for user: ${userId}`);

        // Get study sessions in date range
        const sessions = await this.drizzleService.db
          .select()
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, userId),
              gte(studySessions.date, start),
              lte(studySessions.date, end),
            ),
          );

        // Get tasks in date range
        const tasks = await this.drizzleService.db
          .select()
          .from(studyTasks)
          .where(
            and(
              eq(studyTasks.userId, userId),
              gte(studyTasks.createdAt, start),
              lte(studyTasks.createdAt, end),
            ),
          );

        // Get AI chats in date range
        const chats = await this.drizzleService.db
          .select()
          .from(aiChats)
          .where(
            and(
              eq(aiChats.userId, userId),
              gte(aiChats.createdAt, start),
              lte(aiChats.createdAt, end),
            ),
          );

        // Group by date
        const activities: any[] = [];
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toDateString();

          const dayTasks = tasks.filter((t) => new Date(t.createdAt).toDateString() === dateStr);
          const daySessions = sessions.filter((s) => new Date(s.date).toDateString() === dateStr);
          const dayChats = chats.filter((c) => new Date(c.createdAt).toDateString() === dateStr);

          const studyTime = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
          const completedTasks = dayTasks.filter((t) => t.completed).length;

          activities.push({
            date: current.toISOString().split('T')[0],
            value: studyTime + completedTasks * 10 + dayChats.length * 5, // Activity score
            activityType: 'mixed',
            details: {
              tasksCompleted: completedTasks,
              studyTime: studyTime,
              aiMessages: dayChats.length,
              streakDay: studyTime > 0 || completedTasks > 0,
            },
          });

          current.setDate(current.getDate() + 1);
        }

        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          activities,
          summary: {
            totalDays: activities.length,
            activeDays: activities.filter((a) => a.value > 0).length,
            averageActivity: activities.reduce((sum, a) => sum + a.value, 0) / activities.length,
          },
        };
      },
      1800,
    ); // 30 minutes TTL
  }

  async getGoals(userId: string) {
    const cacheKey = this.cacheService.generateKey('dashboard_goals', userId);

    return this.cacheService.warm(
      cacheKey,
      async () => {
        this.logger.debug(`Fetching goals data from database for user: ${userId}`);

        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Today's actual progress
        const todayTasks = await this.drizzleService.db
          .select()
          .from(studyTasks)
          .where(
            and(
              eq(studyTasks.userId, userId),
              gte(studyTasks.createdAt, today),
              lte(studyTasks.createdAt, tomorrow),
            ),
          );

        const todaySessions = await this.drizzleService.db
          .select()
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, userId),
              gte(studySessions.date, today),
              lte(studySessions.date, tomorrow),
            ),
          );

        const todayChats = await this.drizzleService.db
          .select()
          .from(aiChats)
          .where(
            and(
              eq(aiChats.userId, userId),
              gte(aiChats.createdAt, today),
              lte(aiChats.createdAt, tomorrow),
            ),
          );

        // Week stats
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const weekTasks = await this.drizzleService.db
          .select()
          .from(studyTasks)
          .where(and(eq(studyTasks.userId, userId), gte(studyTasks.createdAt, startOfWeek)));

        const weekSessions = await this.drizzleService.db
          .select()
          .from(studySessions)
          .where(and(eq(studySessions.userId, userId), gte(studySessions.date, startOfWeek)));

        return {
          dailyGoals: {
            tasks: 3,
            studyTime: 120, // minutes
            aiInteractions: 5,
          },
          weeklyGoals: {
            tasks: 15,
            studyTime: 600, // minutes
            subjectsStudied: 3,
          },
          progress: {
            daily: {
              tasks: todayTasks.filter((t) => t.completed).length,
              studyTime: todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
              aiInteractions: todayChats.length,
            },
            weekly: {
              tasks: weekTasks.filter((t) => t.completed).length,
              studyTime: weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
              subjectsStudied: new Set(weekTasks.map((t) => t.subject).filter(Boolean)).size,
            },
          },
        };
      },
      600,
    ); // 10 minutes TTL
  }

  // Cache invalidation methods
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.delPattern(userId);
    this.logger.debug(`Invalidated all cache for user: ${userId}`);
  }

  async invalidateStatsCache(userId: string): Promise<void> {
    const cacheKey = this.cacheService.generateKey('dashboard_stats', userId);
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Invalidated stats cache for user: ${userId}`);
  }

  async invalidateStreakCache(userId: string): Promise<void> {
    const cacheKey = this.cacheService.generateKey('dashboard_streak', userId);
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Invalidated streak cache for user: ${userId}`);
  }

  async invalidateWeeklyCache(userId: string): Promise<void> {
    await this.cacheService.delPattern(`dashboard_weekly:${userId}`);
    this.logger.debug(`Invalidated weekly cache for user: ${userId}`);
  }
}
