import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '../../db/drizzle.provider';
import { DrizzleDB } from '../../db/drizzle.types';
import { eq, and, sql, gte, lte, desc, asc, count, sum, avg, between, or } from 'drizzle-orm';
import { users, tasks, subjects, focusSessions, goals, aiChats } from '../../db/schema';
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
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface DashboardTile {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  sparklineData?: { date: string; value: number }[];
  icon?: string;
  color?: string;
}

export interface SubjectMixData {
  subjectId: string;
  subjectName: string;
  totalMinutes: number;
  percentage: number;
  color?: string;
}

export interface OnTimeRateData {
  onTimeRate: number;
  totalTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  trend: number;
}

@Injectable()
export class EnhancedAnalyticsService {
  private readonly logger = new Logger(EnhancedAnalyticsService.name);

  constructor(
    @InjectDrizzle() private db: DrizzleDB,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Main dashboard tiles data
  async getDashboardTiles(userId: string, timeRange: TimeRangeDto): Promise<DashboardTile[]> {
    const cacheKey = `dashboard-tiles-${userId}-${JSON.stringify(timeRange)}`;
    const cached = await this.cacheManager.get<DashboardTile[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const tiles = await Promise.all([
      this.getFocusedMinutesTile(userId, timeRange),
      this.getTasksCompletedTile(userId, timeRange),
      this.getOnTimeRateTile(userId, timeRange),
      this.getSubjectMixTile(userId, timeRange),
    ]);

    await this.cacheManager.set(cacheKey, tiles, 300000); // Cache for 5 minutes
    return tiles;
  }

  // Focused minutes tile with trend
  private async getFocusedMinutesTile(
    userId: string,
    timeRange: TimeRangeDto,
  ): Promise<DashboardTile> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    // Current period
    const currentPeriodMinutes = await this.db
      .select({
        totalMinutes: sum(focusSessions.effectiveMinutes),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          startDate ? gte(focusSessions.startTime, new Date(startDate)) : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      );

    // Previous period for comparison
    const previousPeriod = this.getPreviousPeriod(timeRange);
    const previousPeriodMinutes = await this.db
      .select({
        totalMinutes: sum(focusSessions.effectiveMinutes),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          previousPeriod.startDate
            ? gte(focusSessions.startTime, new Date(previousPeriod.startDate))
            : undefined,
          previousPeriod.endDate
            ? lte(focusSessions.startTime, new Date(previousPeriod.endDate))
            : undefined,
        ),
      );

    // Get sparkline data for the last 7 days
    const sparklineData = await this.getTrendData(userId, 'studyTime', 7);

    const currentMinutes = Number(currentPeriodMinutes[0]?.totalMinutes) || 0;
    const previousMinutes = Number(previousPeriodMinutes[0]?.totalMinutes) || 0;
    const trend = this.calculatePercentageChange(previousMinutes, currentMinutes);

    return {
      id: 'focused-minutes',
      title: 'Focused minutes (week)',
      value: Math.round(currentMinutes),
      unit: 'min',
      trend,
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral',
      sparklineData,
      icon: 'clock',
      color: '#3B82F6',
    };
  }

  // Tasks completed tile
  private async getTasksCompletedTile(
    userId: string,
    timeRange: TimeRangeDto,
  ): Promise<DashboardTile> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const currentPeriodTasks = await this.db
      .select({
        count: count(tasks.id),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          startDate ? gte(tasks.completedAt, new Date(startDate)) : undefined,
          endDate ? lte(tasks.completedAt, new Date(endDate)) : undefined,
        ),
      );

    const previousPeriod = this.getPreviousPeriod(timeRange);
    const previousPeriodTasks = await this.db
      .select({
        count: count(tasks.id),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          previousPeriod.startDate
            ? gte(tasks.completedAt, new Date(previousPeriod.startDate))
            : undefined,
          previousPeriod.endDate
            ? lte(tasks.completedAt, new Date(previousPeriod.endDate))
            : undefined,
        ),
      );

    const sparklineData = await this.getTrendData(userId, 'tasksCompleted', 7);

    const currentCount = Number(currentPeriodTasks[0]?.count) || 0;
    const previousCount = Number(previousPeriodTasks[0]?.count) || 0;
    const trend = this.calculatePercentageChange(previousCount, currentCount);

    return {
      id: 'tasks-completed',
      title: 'Tasks completed (week)',
      value: currentCount,
      trend,
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral',
      sparklineData,
      icon: 'check-circle',
      color: '#10B981',
    };
  }

  // On-time rate tile
  private async getOnTimeRateTile(userId: string, timeRange: TimeRangeDto): Promise<DashboardTile> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const onTimeData = await this.calculateOnTimeRate(
      userId,
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date(),
    );

    return {
      id: 'on-time-rate',
      title: 'On-time rate',
      value: `${Math.round(onTimeData.onTimeRate)}%`,
      trend: onTimeData.trend,
      trendDirection: onTimeData.trend > 0 ? 'up' : onTimeData.trend < 0 ? 'down' : 'neutral',
      icon: 'target',
      color: '#F59E0B',
    };
  }

  // Subject mix tile (returns pie chart data)
  private async getSubjectMixTile(userId: string, timeRange: TimeRangeDto): Promise<DashboardTile> {
    const subjectMixData = await this.getSubjectMixAnalytics(userId, timeRange);

    return {
      id: 'subject-mix',
      title: 'Subject mix',
      value: `${subjectMixData.length} subjects`,
      icon: 'book',
      color: '#8B5CF6',
    };
  }

  // Get subject mix data for pie chart
  async getSubjectMixAnalytics(userId: string, query: TimeRangeDto): Promise<SubjectMixData[]> {
    const { startDate, endDate } = this.getDateRange(query);

    const subjectTime = await this.db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        totalMinutes: sum(focusSessions.effectiveMinutes),
      })
      .from(subjects)
      .leftJoin(focusSessions, eq(subjects.id, focusSessions.subjectId))
      .where(
        and(
          eq(subjects.userId, userId),
          startDate ? gte(focusSessions.startTime, new Date(startDate)) : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(subjects.id, subjects.name);

    const totalTime = subjectTime.reduce(
      (sum, subject) => sum + (Number(subject.totalMinutes) || 0),
      0,
    );

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280'];

    return subjectTime
      .filter((subject) => Number(subject.totalMinutes) > 0)
      .map((subject, index) => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalMinutes: Number(subject.totalMinutes) || 0,
        percentage: totalTime > 0 ? ((Number(subject.totalMinutes) || 0) / totalTime) * 100 : 0,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  // Calculate on-time rate with trend
  private async calculateOnTimeRate(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OnTimeRateData> {
    const tasksWithDeadlines = await this.db
      .select({
        totalTasks: count(tasks.id),
        onTimeTasks: count(
          sql`CASE WHEN ${tasks.status} = 'completed' AND ${tasks.completedAt} <= ${tasks.dueDate} THEN 1 END`,
        ),
        overdueTasks: count(
          sql`CASE WHEN ${tasks.status} = 'completed' AND ${tasks.completedAt} > ${tasks.dueDate} THEN 1 END`,
        ),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate),
          sql`${tasks.dueDate} IS NOT NULL`,
        ),
      );

    // Calculate previous period for trend
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
    const prevEndDate = new Date(startDate);

    const previousPeriodTasks = await this.db
      .select({
        totalTasks: count(tasks.id),
        onTimeTasks: count(
          sql`CASE WHEN ${tasks.status} = 'completed' AND ${tasks.completedAt} <= ${tasks.dueDate} THEN 1 END`,
        ),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          gte(tasks.createdAt, prevStartDate),
          lte(tasks.createdAt, prevEndDate),
          sql`${tasks.dueDate} IS NOT NULL`,
        ),
      );

    const total = Number(tasksWithDeadlines[0]?.totalTasks) || 0;
    const onTime = Number(tasksWithDeadlines[0]?.onTimeTasks) || 0;
    const overdue = Number(tasksWithDeadlines[0]?.overdueTasks) || 0;

    const currentRate = total > 0 ? (onTime / total) * 100 : 100;

    const prevTotal = Number(previousPeriodTasks[0]?.totalTasks) || 0;
    const prevOnTime = Number(previousPeriodTasks[0]?.onTimeTasks) || 0;
    const prevRate = prevTotal > 0 ? (prevOnTime / prevTotal) * 100 : 100;

    const trend = currentRate - prevRate;

    return {
      onTimeRate: currentRate,
      totalTasks: total,
      onTimeTasks: onTime,
      overdueTasks: overdue,
      trend,
    };
  }

  // Get trend data for sparklines
  async getTrendData(
    userId: string,
    metric: 'studyTime' | 'tasksCompleted' | 'focusScore',
    days: number = 7,
  ): Promise<{ date: string; value: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    if (metric === 'studyTime') {
      const data = await this.db
        .select({
          date: sql<string>`DATE(${focusSessions.startTime})`,
          value: sum(focusSessions.effectiveMinutes),
        })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, startDate),
            lte(focusSessions.startTime, endDate),
          ),
        )
        .groupBy(sql`DATE(${focusSessions.startTime})`)
        .orderBy(sql`DATE(${focusSessions.startTime})`);

      return this.fillMissingDates(
        data.map((d) => ({ date: d.date, value: Number(d.value) || 0 })),
        startDate,
        endDate,
      );
    } else if (metric === 'tasksCompleted') {
      const data = await this.db
        .select({
          date: sql<string>`DATE(${tasks.completedAt})`,
          value: count(tasks.id),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.status, 'completed'),
            gte(tasks.completedAt, startDate),
            lte(tasks.completedAt, endDate),
          ),
        )
        .groupBy(sql`DATE(${tasks.completedAt})`)
        .orderBy(sql`DATE(${tasks.completedAt})`);

      return this.fillMissingDates(
        data.map((d) => ({ date: d.date, value: Number(d.value) || 0 })),
        startDate,
        endDate,
      );
    } else {
      const data = await this.db
        .select({
          date: sql<string>`DATE(${focusSessions.startTime})`,
          value: avg(focusSessions.focusScore),
        })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, startDate),
            lte(focusSessions.startTime, endDate),
          ),
        )
        .groupBy(sql`DATE(${focusSessions.startTime})`)
        .orderBy(sql`DATE(${focusSessions.startTime})`);

      return this.fillMissingDates(
        data.map((d) => ({ date: d.date, value: Number(d.value) || 0 })),
        startDate,
        endDate,
      );
    }
  }

  // Advanced analytics with statistical analysis
  async getAdvancedAnalytics(userId: string, timeRange: TimeRangeDto): Promise<any> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const [studyPatterns, performanceMetrics, subjectPerformance, goalProgress, recommendations] =
      await Promise.all([
        this.analyzeStudyPatterns(userId, startDate, endDate),
        this.calculatePerformanceMetrics(userId, startDate, endDate),
        this.analyzeSubjectPerformance(userId, startDate, endDate),
        this.analyzeGoalProgress(userId),
        this.generateRecommendations(userId),
      ]);

    return {
      studyPatterns,
      performanceMetrics,
      subjectPerformance,
      goalProgress,
      recommendations,
    };
  }

  // Analyze study patterns (best times, productivity peaks)
  private async analyzeStudyPatterns(
    userId: string,
    startDate: string | null,
    endDate: string | null,
  ): Promise<any> {
    const hourlyData = await this.db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${focusSessions.startTime})`,
        avgFocusScore: avg(focusSessions.focusScore),
        avgDuration: avg(focusSessions.durationMinutes),
        sessionCount: count(focusSessions.id),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          startDate ? gte(focusSessions.startTime, new Date(startDate)) : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${focusSessions.startTime})`)
      .orderBy(desc(sql`avg(${focusSessions.focusScore})`));

    const dayOfWeekData = await this.db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${focusSessions.startTime})`,
        avgFocusScore: avg(focusSessions.focusScore),
        totalMinutes: sum(focusSessions.effectiveMinutes),
        sessionCount: count(focusSessions.id),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          startDate ? gte(focusSessions.startTime, new Date(startDate)) : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      )
      .groupBy(sql`EXTRACT(DOW FROM ${focusSessions.startTime})`)
      .orderBy(desc(sql`sum(${focusSessions.effectiveMinutes})`));

    const bestHour = hourlyData[0] || null;
    const bestDay = dayOfWeekData[0] || null;

    return {
      bestStudyHour: bestHour ? Number(bestHour.hour) : null,
      bestStudyDay: bestDay ? this.getDayName(Number(bestDay.dayOfWeek)) : null,
      hourlyDistribution: hourlyData.map((h) => ({
        hour: Number(h.hour),
        avgFocusScore: Number(h.avgFocusScore) || 0,
        avgDuration: Number(h.avgDuration) || 0,
        sessionCount: Number(h.sessionCount) || 0,
      })),
      weeklyDistribution: dayOfWeekData.map((d) => ({
        day: this.getDayName(Number(d.dayOfWeek)),
        avgFocusScore: Number(d.avgFocusScore) || 0,
        totalMinutes: Number(d.totalMinutes) || 0,
        sessionCount: Number(d.sessionCount) || 0,
      })),
    };
  }

  // Calculate performance metrics
  private async calculatePerformanceMetrics(
    userId: string,
    startDate: string | null,
    endDate: string | null,
  ): Promise<any> {
    const sessionMetrics = await this.db
      .select({
        totalSessions: count(focusSessions.id),
        totalMinutes: sum(focusSessions.effectiveMinutes),
        avgFocusScore: avg(focusSessions.focusScore),
        avgSessionDuration: avg(focusSessions.durationMinutes),
        maxSessionDuration: sql<number>`MAX(${focusSessions.durationMinutes})`,
        minSessionDuration: sql<number>`MIN(${focusSessions.durationMinutes})`,
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          startDate ? gte(focusSessions.startTime, new Date(startDate)) : undefined,
          endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
        ),
      );

    const taskMetrics = await this.db
      .select({
        totalTasks: count(tasks.id),
        completedTasks: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.completedAt} - ${tasks.createdAt})) / 3600)`, // in hours
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          startDate ? gte(tasks.createdAt, new Date(startDate)) : undefined,
          endDate ? lte(tasks.createdAt, new Date(endDate)) : undefined,
        ),
      );

    const metrics = sessionMetrics[0] || {};
    const taskData = taskMetrics[0] || {};

    return {
      totalStudySessions: Number(metrics.totalSessions) || 0,
      totalStudyMinutes: Number(metrics.totalMinutes) || 0,
      averageFocusScore: Number(metrics.avgFocusScore) || 0,
      averageSessionDuration: Number(metrics.avgSessionDuration) || 0,
      longestSession: Number(metrics.maxSessionDuration) || 0,
      shortestSession: Number(metrics.minSessionDuration) || 0,
      taskCompletionRate:
        taskData.totalTasks > 0
          ? (Number(taskData.completedTasks) / Number(taskData.totalTasks)) * 100
          : 0,
      averageTaskCompletionTime: Number(taskData.avgCompletionTime) || 0,
    };
  }

  // Analyze subject performance
  private async analyzeSubjectPerformance(
    userId: string,
    startDate: string | null,
    endDate: string | null,
  ): Promise<any> {
    const subjectData = await this.db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        totalMinutes: sum(focusSessions.effectiveMinutes),
        avgFocusScore: avg(focusSessions.focusScore),
        sessionCount: count(focusSessions.id),
        completedTasks: sql<number>`COUNT(DISTINCT ${tasks.id}) FILTER (WHERE ${tasks.status} = 'completed')`,
      })
      .from(subjects)
      .leftJoin(focusSessions, eq(subjects.id, focusSessions.subjectId))
      .leftJoin(tasks, eq(subjects.id, tasks.subjectId))
      .where(
        and(
          eq(subjects.userId, userId),
          or(
            and(
              startDate ? gte(focusSessions.startTime, new Date(startDate)) : undefined,
              endDate ? lte(focusSessions.startTime, new Date(endDate)) : undefined,
            ),
            and(
              startDate ? gte(tasks.createdAt, new Date(startDate)) : undefined,
              endDate ? lte(tasks.createdAt, new Date(endDate)) : undefined,
            ),
          ),
        ),
      )
      .groupBy(subjects.id, subjects.name)
      .orderBy(desc(sql`sum(${focusSessions.effectiveMinutes})`));

    return subjectData.map((subject) => ({
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      totalMinutes: Number(subject.totalMinutes) || 0,
      averageFocusScore: Number(subject.avgFocusScore) || 0,
      sessionCount: Number(subject.sessionCount) || 0,
      tasksCompleted: Number(subject.completedTasks) || 0,
      efficiency: this.calculateEfficiency(
        Number(subject.totalMinutes) || 0,
        Number(subject.completedTasks) || 0,
      ),
    }));
  }

  // Analyze goal progress
  private async analyzeGoalProgress(userId: string): Promise<any> {
    const activeGoals = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

    return activeGoals.map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      type: goal.type,
      progress: goal.progressPercentage,
      daysRemaining: goal.endDate
        ? Math.ceil((goal.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
      onTrack: goal.progressPercentage >= this.getExpectedProgress(goal.startDate, goal.endDate),
      recommendation: this.getGoalRecommendation(goal),
    }));
  }

  // Generate AI-powered recommendations
  private async generateRecommendations(userId: string): Promise<string[]> {
    const recommendations: string[] = [];

    // Get recent activity
    const recentActivity = await this.getOverview(userId);
    const patterns = await this.analyzeStudyPatterns(userId, null, null);

    // Focus-based recommendations
    if (recentActivity.averageFocusScore < 60) {
      recommendations.push(
        'Your focus score is below optimal. Try shorter 25-minute sessions with 5-minute breaks (Pomodoro Technique).',
      );
    }

    // Streak-based recommendations
    if (recentActivity.currentStreak === 0) {
      recommendations.push(
        'Start a new study streak today! Even 15 minutes of focused study counts.',
      );
    } else if (recentActivity.currentStreak >= 7) {
      recommendations.push(
        `Excellent ${recentActivity.currentStreak}-day streak! Keep the momentum going.`,
      );
    }

    // Time-based recommendations
    if (patterns.bestStudyHour !== null) {
      recommendations.push(
        `Your peak productivity is at ${patterns.bestStudyHour}:00. Schedule important tasks during this time.`,
      );
    }

    // Task completion recommendations
    if (recentActivity.weekOverWeekChange < -10) {
      recommendations.push(
        'Your study time decreased this week. Set small, achievable daily goals to get back on track.',
      );
    }

    return recommendations;
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
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
      },
      [PredefinedRange.THIS_WEEK]: {
        startDate: new Date(now.setDate(now.getDate() - now.getDay())).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.LAST_7_DAYS]: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.LAST_30_DAYS]: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.LAST_90_DAYS]: {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      [PredefinedRange.ALL_TIME]: {
        startDate: null,
        endDate: null,
      },
    };

    return ranges[query.range] || ranges[PredefinedRange.LAST_7_DAYS];
  }

  private getPreviousPeriod(query: TimeRangeDto): {
    startDate: string | null;
    endDate: string | null;
  } {
    const { startDate, endDate } = this.getDateRange(query);

    if (!startDate || !endDate) {
      return { startDate: null, endDate: null };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);

    return {
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
    };
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private calculateEfficiency(minutes: number, tasksCompleted: number): number {
    if (minutes === 0) return 0;
    return (tasksCompleted / (minutes / 60)) * 100; // Tasks per hour as percentage
  }

  private getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }

  private getExpectedProgress(startDate: Date, endDate: Date | null): number {
    if (!endDate) return 0;

    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return (elapsedDays / totalDays) * 100;
  }

  private getGoalRecommendation(goal: any): string {
    const expectedProgress = this.getExpectedProgress(goal.startDate, goal.endDate);

    if (goal.progressPercentage < expectedProgress - 20) {
      return `You're behind schedule. Increase daily effort by ${Math.round((expectedProgress - goal.progressPercentage) / 10)}% to catch up.`;
    } else if (goal.progressPercentage > expectedProgress + 20) {
      return "You're ahead of schedule! Great work!";
    } else {
      return "You're on track. Keep up the consistent effort!";
    }
  }

  private fillMissingDates(
    data: { date: string; value: number }[],
    startDate: Date,
    endDate: Date,
  ): { date: string; value: number }[] {
    const result: { date: string; value: number }[] = [];
    const dataMap = new Map(data.map((d) => [d.date, d.value]));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        value: dataMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  // Export functionality
  async exportAnalyticsData(
    userId: string,
    format: 'json' | 'csv',
    timeRange: TimeRangeDto,
  ): Promise<string | Buffer> {
    const data = await this.getAdvancedAnalytics(userId, timeRange);

    if (format === 'csv') {
      return this.convertToCSV(data);
    } else {
      return JSON.stringify(data, null, 2);
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for performance metrics
    const metrics = data.performanceMetrics;
    const headers = Object.keys(metrics).join(',');
    const values = Object.values(metrics).join(',');
    return `${headers}\n${values}`;
  }

  // Get current overview with all necessary data for dashboard
  async getOverview(userId: string): Promise<
    AnalyticsOverview & {
      weekOverWeekChange: number;
      taskCompletionChange: number;
      onTimeRate: number;
    }
  > {
    // Get current week dates
    const now = new Date();
    const currentDay = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get previous week dates
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    // Current week stats
    const currentWeekSessions = await this.db
      .select({
        totalTime: sum(focusSessions.effectiveMinutes),
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

    // Previous week stats
    const prevWeekSessions = await this.db
      .select({
        totalTime: sum(focusSessions.effectiveMinutes),
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          gte(focusSessions.startTime, prevWeekStart),
          lte(focusSessions.startTime, prevWeekEnd),
        ),
      );

    const prevWeekTasks = await this.db
      .select({ count: count(tasks.id) })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, prevWeekStart),
          lte(tasks.completedAt, prevWeekEnd),
        ),
      );

    const activeGoalsCount = await this.db
      .select({ count: count(goals.id) })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

    // Calculate metrics
    const currentTime = Number(currentWeekSessions[0]?.totalTime) || 0;
    const prevTime = Number(prevWeekSessions[0]?.totalTime) || 0;
    const currentTaskCount = Number(currentWeekTasks[0]?.count) || 0;
    const prevTaskCount = Number(prevWeekTasks[0]?.count) || 0;

    const weekOverWeekChange = this.calculatePercentageChange(prevTime, currentTime);
    const taskCompletionChange = this.calculatePercentageChange(prevTaskCount, currentTaskCount);

    // Calculate on-time rate
    const onTimeRateData = await this.calculateOnTimeRate(userId, weekStart, weekEnd);

    // Get current streak
    const currentStreak = await this.calculateCurrentStreak(userId);

    return {
      totalStudyTime: currentTime,
      totalTasksCompleted: currentTaskCount,
      totalStudySessions: Number(currentWeekSessions[0]?.sessionCount) || 0,
      averageFocusScore: Number(currentWeekSessions[0]?.avgFocusScore) || 0,
      currentStreak,
      activeGoals: Number(activeGoalsCount[0]?.count) || 0,
      weekOverWeekChange,
      taskCompletionChange,
      onTimeRate: onTimeRateData.onTimeRate,
    };
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
    const recentSessions = await this.db
      .select({ date: sql<string>`DATE(${focusSessions.startTime})` })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .groupBy(sql`DATE(${focusSessions.startTime})`)
      .orderBy(desc(sql`DATE(${focusSessions.startTime})`))
      .limit(30);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < recentSessions.length; i++) {
      const sessionDate = new Date(recentSessions[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (sessionDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else if (i === 0 && sessionDate < expectedDate) {
        // If the first session is not today, check if it was yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (sessionDate.toDateString() === yesterday.toDateString()) {
          continue; // Check next session
        } else {
          break; // Streak broken
        }
      } else {
        break;
      }
    }

    return streak;
  }
}
