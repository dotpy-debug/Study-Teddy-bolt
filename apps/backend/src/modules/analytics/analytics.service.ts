import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  eq,
  and,
  sql,
  gte,
  lte,
  desc,
  asc,
  count,
  sum,
  avg,
} from 'drizzle-orm';
import {
  users,
  tasks,
  subjects,
  focusSessions,
  goals,
  aiChats,
} from '../../db/schema';
import {
  AnalyticsQueryDto,
  TimeRangeDto,
  PredefinedRange,
  ComprehensiveAnalyticsResponse,
  AnalyticsOverview,
  ProductivityMetric,
  SubjectAnalytic,
  TimeDistribution,
  CompletionRate,
  StreakAnalytic,
  GoalAnalytic,
  AIInsight,
  PeriodComparison,
} from './dto';

@Injectable()
export class AnalyticsService {
  constructor(private db: any) {} // Inject your database service here

  async getComprehensiveAnalytics(
    userId: string,
    query: TimeRangeDto,
  ): Promise<ComprehensiveAnalyticsResponse> {
    const { startDate, endDate } = this.getDateRange(query);

    const [
      overview,
      productivityMetrics,
      subjectAnalytics,
      timeDistribution,
      completionRates,
      streakAnalytics,
      goalAnalytics,
      insights,
    ] = await Promise.all([
      this.getOverview(userId),
      this.getProductivityMetrics(userId, startDate, endDate),
      this.getSubjectAnalytics(userId, query),
      this.getTimeDistribution(userId, query),
      this.getCompletionRates(userId, {
        startDate,
        endDate,
      } as AnalyticsQueryDto),
      this.getStreakAnalytics(userId),
      this.getGoalAnalytics(userId, query),
      this.getAIInsights(userId),
    ]);

    return {
      overview,
      productivityMetrics,
      subjectAnalytics,
      timeDistribution,
      completionRates,
      streakAnalytics,
      goalAnalytics,
      insights,
    };
  }

  async getOverview(userId: string): Promise<AnalyticsOverview> {
    // Get current week dates
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(weekStart.getDate() + 6));

    // Get previous week dates
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    // Current week stats
    const currentWeekSessions = await this.db
      .select({
        totalTime: sum(focusSessions.durationMinutes),
        sessionCount: count(focusSessions.id),
        avgFocusScore: avg(focusSessions.focusScore),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          gte(focusSessions.startTime, weekStart),
          lte(focusSessions.startTime, weekEnd),
        ),
      );

    const currentWeekTasks = await this.db
      .select({ count: count(tasks.id) })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, weekStart),
          lte(tasks.completedAt, weekEnd),
        ),
      );

    // Previous week stats for comparison
    const prevWeekSessions = await this.db
      .select({ totalTime: sum(focusSessions.durationMinutes) })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          gte(focusSessions.startTime, prevWeekStart),
          lte(focusSessions.startTime, prevWeekEnd),
        ),
      );

    const activeGoalsCount = await this.db
      .select({ count: count(goals.id) })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

    // Calculate week over week change
    const currentTime = currentWeekSessions[0]?.totalTime || 0;
    const prevTime = prevWeekSessions[0]?.totalTime || 0;
    const weekOverWeekChange =
      prevTime > 0 ? ((currentTime - prevTime) / prevTime) * 100 : 0;

    // Get current streak (simplified)
    const currentStreak = await this.calculateCurrentStreak(userId);

    return {
      totalStudyTime: currentTime,
      totalTasksCompleted: currentWeekTasks[0]?.count || 0,
      totalStudySessions: currentWeekSessions[0]?.sessionCount || 0,
      averageFocusScore: currentWeekSessions[0]?.avgFocusScore || 0,
      currentStreak,
      activeGoals: activeGoalsCount[0]?.count || 0,
      weekOverWeekChange,
    };
  }

  async getProductivityAnalytics(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<ProductivityMetric[]> {
    const { startDate, endDate } = this.getDateRange(query);
    return this.getProductivityMetrics(userId, startDate, endDate);
  }

  async getSubjectAnalytics(
    userId: string,
    query: TimeRangeDto,
  ): Promise<SubjectAnalytic[]> {
    const { startDate, endDate } = this.getDateRange(query);

    const subjectStats = await this.db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        totalStudyTime: sum(focusSessions.durationMinutes),
        sessionCount: count(focusSessions.id),
        avgFocusScore: avg(focusSessions.focusScore),
      })
      .from(subjects)
      .leftJoin(focusSessions, eq(subjects.id, focusSessions.subjectId))
      .where(
        and(
          eq(subjects.userId, userId),
          startDate
            ? gte(focusSessions.startTime, new Date(startDate))
            : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(subjects.id, subjects.name);

    // Get task completion stats per subject
    const taskStats = await this.db
      .select({
        subjectId: subjects.id,
        completedTasks: count(tasks.id),
      })
      .from(subjects)
      .leftJoin(tasks, eq(subjects.id, tasks.subjectId))
      .where(
        and(
          eq(subjects.userId, userId),
          eq(tasks.status, 'completed'),
          startDate ? gte(tasks.completedAt, new Date(startDate)) : undefined,
          endDate ? lte(tasks.completedAt, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(subjects.id);

    const taskStatsMap = new Map(
      taskStats.map((t) => [t.subjectId, t.completedTasks]),
    );

    return subjectStats.map((stat) => ({
      subjectId: stat.subjectId,
      subjectName: stat.subjectName,
      totalStudyTime: stat.totalStudyTime || 0,
      tasksCompleted: taskStatsMap.get(stat.subjectId) || 0,
      studySessions: stat.sessionCount || 0,
      averageFocusScore: stat.avgFocusScore || 0,
      progressPercentage: this.calculateSubjectProgress(
        stat.totalStudyTime || 0,
      ),
    }));
  }

  async getSpecificSubjectAnalytics(
    userId: string,
    subjectId: string,
    query: TimeRangeDto,
  ): Promise<SubjectAnalytic> {
    const analytics = await this.getSubjectAnalytics(userId, query);
    return (
      analytics.find((a) => a.subjectId === subjectId) || {
        subjectId,
        subjectName: 'Unknown',
        totalStudyTime: 0,
        tasksCompleted: 0,
        studySessions: 0,
        averageFocusScore: 0,
        progressPercentage: 0,
      }
    );
  }

  async getTimeDistribution(
    userId: string,
    query: TimeRangeDto,
  ): Promise<TimeDistribution[]> {
    const { startDate, endDate } = this.getDateRange(query);

    const timeStats = await this.db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${focusSessions.startTime})`,
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${focusSessions.startTime})`,
        totalMinutes: sum(focusSessions.durationMinutes),
        sessionCount: count(focusSessions.id),
        avgFocusScore: avg(focusSessions.focusScore),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          startDate
            ? gte(focusSessions.startTime, new Date(startDate))
            : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(
        sql`EXTRACT(HOUR FROM ${focusSessions.startTime})`,
        sql`EXTRACT(DOW FROM ${focusSessions.startTime})`,
      );

    return timeStats.map((stat) => ({
      hour: stat.hour,
      dayOfWeek: stat.dayOfWeek,
      totalMinutes: stat.totalMinutes || 0,
      sessionCount: stat.sessionCount || 0,
      averageFocusScore: stat.avgFocusScore || 0,
    }));
  }

  async getFocusPatterns(
    userId: string,
    query: TimeRangeDto,
  ): Promise<TimeDistribution[]> {
    return this.getTimeDistribution(userId, query);
  }

  async getCompletionRates(
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<CompletionRate[]> {
    const { startDate, endDate } = this.getDateRange(query);

    const completionStats = await this.db
      .select({
        date: sql<string>`DATE(${tasks.createdAt})`,
        totalTasks: count(tasks.id),
        completedTasks: count(
          sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`,
        ),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          startDate ? gte(tasks.createdAt, new Date(startDate)) : undefined,
          endDate ? lte(tasks.createdAt, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(sql`DATE(${tasks.createdAt})`)
      .orderBy(sql`DATE(${tasks.createdAt})`);

    return completionStats.map((stat) => ({
      date: stat.date,
      totalTasks: stat.totalTasks,
      completedTasks: stat.completedTasks,
      completionPercentage:
        stat.totalTasks > 0 ? (stat.completedTasks / stat.totalTasks) * 100 : 0,
    }));
  }

  async getStreakAnalytics(userId: string): Promise<StreakAnalytic> {
    const currentStreak = await this.calculateCurrentStreak(userId);
    const longestStreak = await this.calculateLongestStreak(userId);

    const totalStudyDaysResult = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT DATE(${focusSessions.startTime}))`,
      })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId));

    const lastSessionResult = await this.db
      .select({ startTime: focusSessions.startTime })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .orderBy(desc(focusSessions.startTime))
      .limit(1);

    return {
      currentStreak,
      longestStreak,
      totalStudyDays: totalStudyDaysResult[0]?.count || 0,
      streakStartDate: null, // Implement if needed
      lastStudyDate: lastSessionResult[0]?.startTime?.toISOString() || null,
    };
  }

  async getGoalAnalytics(
    userId: string,
    query: TimeRangeDto,
  ): Promise<GoalAnalytic[]> {
    const { startDate, endDate } = this.getDateRange(query);

    const goalStats = await this.db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, userId),
          startDate ? gte(goals.createdAt, new Date(startDate)) : undefined,
          endDate ? lte(goals.createdAt, new Date(endDate)) : undefined,
        ),
      );

    return goalStats.map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      type: goal.type,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progressPercentage: goal.progressPercentage,
      status: goal.status,
      daysUntilDeadline: goal.endDate
        ? Math.ceil(
            (goal.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
        : null,
    }));
  }

  async getAIInsights(userId: string): Promise<AIInsight[]> {
    // This is a simplified implementation
    // In a real application, you would analyze user data and generate insights
    const insights: AIInsight[] = [];

    // Example insights based on user activity
    const recentActivity = await this.getOverview(userId);

    if (recentActivity.currentStreak > 7) {
      insights.push({
        title: 'Great streak!',
        description: `You've maintained a ${recentActivity.currentStreak}-day study streak. Keep it up!`,
        type: 'achievement',
        priority: 'high',
      });
    }

    if (recentActivity.averageFocusScore < 50) {
      insights.push({
        title: 'Focus improvement needed',
        description:
          'Your focus score has been below average. Consider shorter study sessions or eliminating distractions.',
        type: 'suggestion',
        priority: 'medium',
      });
    }

    return insights;
  }

  async exportAnalytics(
    userId: string,
    format: string,
    query: TimeRangeDto,
  ): Promise<any> {
    const analytics = await this.getComprehensiveAnalytics(userId, query);

    switch (format) {
      case 'csv':
        return this.convertToCSV(analytics);
      case 'pdf':
        return this.convertToPDF(analytics);
      default:
        return analytics;
    }
  }

  async comparePerformance(
    userId: string,
    period1: { start: string; end: string },
    period2: { start: string; end: string },
  ): Promise<PeriodComparison> {
    const period1Stats = await this.getOverview(userId); // Simplified - would need period-specific implementation
    const period2Stats = await this.getOverview(userId); // Simplified - would need period-specific implementation

    return {
      period1: period1Stats,
      period2: period2Stats,
      changes: {
        studyTime: this.calculatePercentageChange(
          period1Stats.totalStudyTime,
          period2Stats.totalStudyTime,
        ),
        tasksCompleted: this.calculatePercentageChange(
          period1Stats.totalTasksCompleted,
          period2Stats.totalTasksCompleted,
        ),
        studySessions: this.calculatePercentageChange(
          period1Stats.totalStudySessions,
          period2Stats.totalStudySessions,
        ),
        focusScore: this.calculatePercentageChange(
          period1Stats.averageFocusScore,
          period2Stats.averageFocusScore,
        ),
      },
    };
  }

  // Helper methods

  private getDateRange(query: TimeRangeDto): {
    startDate: string | null;
    endDate: string | null;
  } {
    if (query.startDate && query.endDate) {
      return { startDate: query.startDate, endDate: query.endDate };
    }

    const now = new Date();
    const ranges = {
      [PredefinedRange.TODAY]: {
        startDate: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString(),
        endDate: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        ).toISOString(),
      },
      [PredefinedRange.YESTERDAY]: {
        startDate: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        ).toISOString(),
        endDate: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString(),
      },
      [PredefinedRange.THIS_WEEK]: {
        startDate: new Date(
          now.setDate(now.getDate() - now.getDay()),
        ).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.LAST_7_DAYS]: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.LAST_30_DAYS]: {
        startDate: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.LAST_90_DAYS]: {
        startDate: new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.ALL_TIME]: {
        startDate: null,
        endDate: null,
      },
    };

    return ranges[query.range] || ranges[PredefinedRange.LAST_30_DAYS];
  }

  private async getProductivityMetrics(
    userId: string,
    startDate: string | null,
    endDate: string | null,
  ): Promise<ProductivityMetric[]> {
    const metrics = await this.db
      .select({
        date: sql<string>`DATE(${focusSessions.startTime})`,
        focusTime: sum(focusSessions.durationMinutes),
        studySessions: count(focusSessions.id),
        averageFocusScore: avg(focusSessions.focusScore),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          startDate
            ? gte(focusSessions.startTime, new Date(startDate))
            : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(sql`DATE(${focusSessions.startTime})`)
      .orderBy(sql`DATE(${focusSessions.startTime})`);

    // Get tasks completed per day
    const taskMetrics = await this.db
      .select({
        date: sql<string>`DATE(${tasks.completedAt})`,
        tasksCompleted: count(tasks.id),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          startDate ? gte(tasks.completedAt, new Date(startDate)) : undefined,
          endDate ? lte(tasks.completedAt, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(sql`DATE(${tasks.completedAt})`);

    const taskMetricsMap = new Map(
      taskMetrics.map((t) => [t.date, t.tasksCompleted]),
    );

    return metrics.map((metric) => ({
      date: metric.date,
      focusTime: metric.focusTime || 0,
      tasksCompleted: taskMetricsMap.get(metric.date) || 0,
      studySessions: metric.studySessions || 0,
      averageFocusScore: metric.averageFocusScore || 0,
    }));
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
    // Simplified implementation - would need more complex logic for actual streak calculation
    const recentSessions = await this.db
      .select({ date: sql<string>`DATE(${focusSessions.startTime})` })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .groupBy(sql`DATE(${focusSessions.startTime})`)
      .orderBy(desc(sql`DATE(${focusSessions.startTime})`))
      .limit(30);

    let streak = 0;
    const today = new Date();

    for (const session of recentSessions) {
      const sessionDate = new Date(session.date);
      const daysDiff = Math.floor(
        (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async calculateLongestStreak(userId: string): Promise<number> {
    // Simplified implementation
    return 10; // Would implement proper streak calculation
  }

  private calculateSubjectProgress(studyTime: number): number {
    // Simple progress calculation based on study time
    // Could be enhanced with goals or other metrics
    return Math.min(100, (studyTime / 60) * 10); // 10% per hour
  }

  private calculatePercentageChange(
    oldValue: number,
    newValue: number,
  ): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would implement proper CSV generation
    return JSON.stringify(data);
  }

  private convertToPDF(data: any): Buffer {
    // Would implement PDF generation
    return Buffer.from(JSON.stringify(data));
  }
}
