import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '../../db/drizzle.provider';
import { DrizzleDB } from '../../db/drizzle.types';
import { eq, and, sql, gte, lte, desc, asc, count, isNull, or } from 'drizzle-orm';
import { users, tasks, subjects, focusSessions, goals, aiChats } from '../../db/schema';
import { OpenAIService } from '../ai/openai.service';

export interface NextBestAction {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: 'focus' | 'task' | 'goal' | 'study' | 'review' | 'break';
  context: {
    relatedTaskId?: string;
    relatedSubjectId?: string;
    relatedGoalId?: string;
    timeEstimate?: number;
    deadline?: Date;
  };
  reasoning: string;
  impact: string;
  createdAt: Date;
}

export interface UserContext {
  userId: string;
  currentTime: Date;
  recentActivity: {
    lastStudySession?: Date;
    lastCompletedTask?: Date;
    studyHoursToday: number;
    tasksCompletedToday: number;
    currentStreak: number;
  };
  upcomingDeadlines: {
    taskId: string;
    title: string;
    dueDate: Date;
    priority: string;
    subjectName?: string;
  }[];
  studyPatterns: {
    preferredStudyTime?: string;
    averageSessionDuration: number;
    peakProductivityHour?: number;
  };
  performanceMetrics: {
    averageFocusScore: number;
    taskCompletionRate: number;
    onTimeRate: number;
  };
}

@Injectable()
export class NextBestActionService {
  private readonly logger = new Logger(NextBestActionService.name);

  constructor(
    @InjectDrizzle() private db: DrizzleDB,
    private openAIService: OpenAIService,
  ) {}

  /**
   * Get the next best action recommendation for a user
   */
  async getNextBestAction(userId: string): Promise<NextBestAction> {
    const userContext = await this.buildUserContext(userId);
    const recommendation = await this.generateRecommendation(userContext);
    return recommendation;
  }

  /**
   * Get multiple action recommendations
   */
  async getActionRecommendations(userId: string, limit: number = 3): Promise<NextBestAction[]> {
    const userContext = await this.buildUserContext(userId);
    const recommendations = await this.generateMultipleRecommendations(userContext, limit);
    return recommendations;
  }

  /**
   * Build comprehensive user context for NBA generation
   */
  private async buildUserContext(userId: string): Promise<UserContext> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    // Get recent activity
    const [lastSession, lastTask, todayStats] = await Promise.all([
      this.getLastStudySession(userId),
      this.getLastCompletedTask(userId),
      this.getTodayStats(userId, todayStart, todayEnd),
    ]);

    // Get upcoming deadlines (next 7 days)
    const upcomingDeadlines = await this.getUpcomingDeadlines(userId, 7);

    // Get study patterns
    const studyPatterns = await this.analyzeStudyPatterns(userId);

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(userId);

    // Get current streak
    const currentStreak = await this.calculateCurrentStreak(userId);

    return {
      userId,
      currentTime: now,
      recentActivity: {
        lastStudySession: lastSession?.startTime || undefined,
        lastCompletedTask: lastTask?.completedAt || undefined,
        studyHoursToday: todayStats.studyHours,
        tasksCompletedToday: todayStats.tasksCompleted,
        currentStreak,
      },
      upcomingDeadlines,
      studyPatterns,
      performanceMetrics,
    };
  }

  /**
   * Generate a single NBA recommendation using AI and rules
   */
  private async generateRecommendation(context: UserContext): Promise<NextBestAction> {
    // Rule-based recommendations first
    const ruleBasedAction = this.getRuleBasedRecommendation(context);

    if (ruleBasedAction) {
      return ruleBasedAction;
    }

    // AI-powered recommendation if no rule matches
    return this.getAIRecommendation(context);
  }

  /**
   * Generate multiple recommendations
   */
  private async generateMultipleRecommendations(
    context: UserContext,
    limit: number,
  ): Promise<NextBestAction[]> {
    const recommendations: NextBestAction[] = [];

    // Get rule-based recommendations
    const ruleBasedActions = this.getAllRuleBasedRecommendations(context);
    recommendations.push(...ruleBasedActions.slice(0, limit));

    // If we need more, get AI recommendations
    if (recommendations.length < limit) {
      const aiRecommendations = await this.getMultipleAIRecommendations(
        context,
        limit - recommendations.length,
      );
      recommendations.push(...aiRecommendations);
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Rule-based recommendation engine
   */
  private getRuleBasedRecommendation(context: UserContext): NextBestAction | null {
    const now = context.currentTime;
    const hour = now.getHours();

    // Check for urgent deadlines (within 24 hours)
    const urgentTasks = context.upcomingDeadlines.filter(
      (task) => task.dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000,
    );

    if (urgentTasks.length > 0) {
      const task = urgentTasks[0];
      return {
        id: `nba-urgent-${Date.now()}`,
        title: 'Complete Urgent Task',
        description: `"${task.title}" is due soon. Focus on this task now.`,
        action: 'Start working on urgent task',
        priority: 'high',
        category: 'task',
        context: {
          relatedTaskId: task.taskId,
          relatedSubjectId: task.subjectName,
          deadline: task.dueDate,
        },
        reasoning: 'This task has an approaching deadline and should be prioritized.',
        impact: 'Completing this task on time will maintain your on-time completion rate.',
        createdAt: now,
      };
    }

    // Check if it's been too long since last study session (> 24 hours)
    if (context.recentActivity.lastStudySession) {
      const hoursSinceLastSession =
        (now.getTime() - context.recentActivity.lastStudySession.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSession > 24) {
        return {
          id: `nba-study-${Date.now()}`,
          title: 'Resume Study Routine',
          description: "It's been over 24 hours since your last study session. Get back on track!",
          action: 'Start a 25-minute focus session',
          priority: 'high',
          category: 'study',
          context: {
            timeEstimate: 25,
          },
          reasoning: 'Regular study habits are key to maintaining progress.',
          impact: 'Studying now will maintain your streak and reinforce learning.',
          createdAt: now,
        };
      }
    }

    // Check if user hasn't studied today and it's their preferred time
    if (
      context.recentActivity.studyHoursToday === 0 &&
      context.studyPatterns.peakProductivityHour
    ) {
      if (Math.abs(hour - context.studyPatterns.peakProductivityHour) <= 1) {
        return {
          id: `nba-peak-${Date.now()}`,
          title: 'Peak Productivity Time',
          description: `This is your most productive time (${context.studyPatterns.peakProductivityHour}:00). Start a study session now!`,
          action: 'Begin focused study session',
          priority: 'high',
          category: 'focus',
          context: {
            timeEstimate: context.studyPatterns.averageSessionDuration,
          },
          reasoning: 'You perform best at this time based on your historical data.',
          impact: 'Studying during peak hours increases focus and retention.',
          createdAt: now,
        };
      }
    }

    // Check if user has been studying for too long (> 2 hours without break)
    if (context.recentActivity.studyHoursToday > 2) {
      const timeSinceLastSession = context.recentActivity.lastStudySession
        ? (now.getTime() - context.recentActivity.lastStudySession.getTime()) / (1000 * 60)
        : 0;

      if (timeSinceLastSession < 30) {
        return {
          id: `nba-break-${Date.now()}`,
          title: 'Take a Break',
          description: "You've been studying hard. Take a 15-minute break to recharge.",
          action: 'Take a short break',
          priority: 'medium',
          category: 'break',
          context: {
            timeEstimate: 15,
          },
          reasoning: 'Regular breaks improve focus and prevent burnout.',
          impact: 'Taking breaks enhances overall productivity and retention.',
          createdAt: now,
        };
      }
    }

    // Check for tasks due this week that haven't been started
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const upcomingUnstartedTasks = context.upcomingDeadlines.filter(
      (task) =>
        task.dueDate <= weekFromNow && task.dueDate.getTime() - now.getTime() > 24 * 60 * 60 * 1000,
    );

    if (upcomingUnstartedTasks.length > 0) {
      const task = upcomingUnstartedTasks[0];
      return {
        id: `nba-upcoming-${Date.now()}`,
        title: 'Start Upcoming Task',
        description: `Begin working on "${task.title}" due ${this.formatRelativeDate(task.dueDate)}.`,
        action: 'Start task planning',
        priority: 'medium',
        category: 'task',
        context: {
          relatedTaskId: task.taskId,
          deadline: task.dueDate,
        },
        reasoning: 'Starting early ensures quality completion without last-minute stress.',
        impact: 'Early start improves task quality and reduces stress.',
        createdAt: now,
      };
    }

    // Check if focus score is low and suggest technique improvement
    if (context.performanceMetrics.averageFocusScore < 60) {
      return {
        id: `nba-focus-${Date.now()}`,
        title: 'Improve Focus Technique',
        description:
          'Your focus score is below optimal. Try the Pomodoro Technique or eliminate distractions.',
        action: 'Start focused 25-minute session',
        priority: 'medium',
        category: 'focus',
        context: {
          timeEstimate: 25,
        },
        reasoning: 'Your recent focus scores indicate room for improvement.',
        impact: 'Better focus techniques lead to more effective study sessions.',
        createdAt: now,
      };
    }

    // Suggest review if no recent activity
    if (context.recentActivity.tasksCompletedToday === 0 && hour < 20) {
      return {
        id: `nba-review-${Date.now()}`,
        title: 'Daily Review',
        description: 'Review your tasks and plan your study schedule for today.',
        action: 'Review and plan',
        priority: 'low',
        category: 'review',
        context: {
          timeEstimate: 10,
        },
        reasoning: 'Daily planning improves productivity and task completion.',
        impact: 'Planning helps prioritize and increases daily achievement.',
        createdAt: now,
      };
    }

    return null;
  }

  /**
   * Get all rule-based recommendations
   */
  private getAllRuleBasedRecommendations(context: UserContext): NextBestAction[] {
    const recommendations: NextBestAction[] = [];
    const now = context.currentTime;

    // Add all applicable rule-based recommendations
    // (Similar to getRuleBasedRecommendation but returns all matches)

    // Check urgent deadlines
    const urgentTasks = context.upcomingDeadlines.filter(
      (task) => task.dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000,
    );

    urgentTasks.forEach((task, index) => {
      if (index < 2) {
        // Limit to top 2 urgent tasks
        recommendations.push({
          id: `nba-urgent-${task.taskId}`,
          title: `Complete: ${task.title}`,
          description: `Due ${this.formatRelativeDate(task.dueDate)}. Priority: ${task.priority}`,
          action: 'Start task now',
          priority: 'high',
          category: 'task',
          context: {
            relatedTaskId: task.taskId,
            deadline: task.dueDate,
          },
          reasoning: 'Urgent deadline approaching.',
          impact: 'Avoid late submission and maintain on-time rate.',
          createdAt: now,
        });
      }
    });

    // Add other recommendations based on patterns and metrics
    if (context.performanceMetrics.taskCompletionRate < 70) {
      recommendations.push({
        id: `nba-completion-${Date.now()}`,
        title: 'Boost Task Completion',
        description: 'Your completion rate is low. Focus on finishing pending tasks.',
        action: 'Complete a pending task',
        priority: 'medium',
        category: 'task',
        context: {},
        reasoning: 'Low completion rate affects overall productivity.',
        impact: 'Improving completion rate builds momentum and confidence.',
        createdAt: now,
      });
    }

    return recommendations;
  }

  /**
   * Get AI-powered recommendation
   */
  private async getAIRecommendation(context: UserContext): Promise<NextBestAction> {
    const prompt = this.buildAIPrompt(context);

    try {
      const response = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 200,
        temperature: 0.7,
      });

      return this.parseAIResponse(response, context);
    } catch (error) {
      this.logger.error('Failed to get AI recommendation', error);
      return this.getDefaultRecommendation(context);
    }
  }

  /**
   * Get multiple AI recommendations
   */
  private async getMultipleAIRecommendations(
    context: UserContext,
    count: number,
  ): Promise<NextBestAction[]> {
    const prompt = this.buildMultipleAIPrompt(context, count);

    try {
      const response = await this.openAIService.generateCompletion(prompt, {
        max_tokens: 500,
        temperature: 0.8,
      });

      return this.parseMultipleAIResponses(response, context);
    } catch (error) {
      this.logger.error('Failed to get AI recommendations', error);
      return [this.getDefaultRecommendation(context)];
    }
  }

  /**
   * Build AI prompt for single recommendation
   */
  private buildAIPrompt(context: UserContext): string {
    return `As a study assistant, recommend the single best action for this student:

Current Status:
- Time: ${context.currentTime.toLocaleTimeString()}
- Study hours today: ${context.recentActivity.studyHoursToday}
- Tasks completed today: ${context.recentActivity.tasksCompletedToday}
- Current streak: ${context.recentActivity.currentStreak} days
- Average focus score: ${context.performanceMetrics.averageFocusScore}%
- Task completion rate: ${context.performanceMetrics.taskCompletionRate}%

Upcoming Deadlines: ${context.upcomingDeadlines.length} tasks in next 7 days

Provide ONE specific, actionable recommendation in this format:
Title: [Clear action title]
Action: [Specific action to take]
Reason: [Why this is important now]
Impact: [Expected benefit]`;
  }

  /**
   * Build AI prompt for multiple recommendations
   */
  private buildMultipleAIPrompt(context: UserContext, count: number): string {
    return `As a study assistant, recommend ${count} best actions for this student:

Current Status:
- Study hours today: ${context.recentActivity.studyHoursToday}
- Tasks completed: ${context.recentActivity.tasksCompletedToday}
- Streak: ${context.recentActivity.currentStreak} days
- Focus score: ${context.performanceMetrics.averageFocusScore}%
- Upcoming deadlines: ${context.upcomingDeadlines.length}

Provide ${count} specific recommendations, each with:
1. Title
2. Action
3. Priority (high/medium/low)
4. Category (focus/task/goal/study/review/break)`;
  }

  /**
   * Parse AI response into NextBestAction
   */
  private parseAIResponse(response: string, context: UserContext): NextBestAction {
    // Simple parsing - in production, use structured output
    const lines = response.split('\n');
    const title =
      lines
        .find((l) => l.startsWith('Title:'))
        ?.replace('Title:', '')
        .trim() || 'Study Recommendation';
    const action =
      lines
        .find((l) => l.startsWith('Action:'))
        ?.replace('Action:', '')
        .trim() || 'Review your study plan';
    const reason =
      lines
        .find((l) => l.startsWith('Reason:'))
        ?.replace('Reason:', '')
        .trim() || '';
    const impact =
      lines
        .find((l) => l.startsWith('Impact:'))
        ?.replace('Impact:', '')
        .trim() || '';

    return {
      id: `nba-ai-${Date.now()}`,
      title,
      description: action,
      action: action,
      priority: 'medium',
      category: 'study',
      context: {},
      reasoning: reason,
      impact,
      createdAt: new Date(),
    };
  }

  /**
   * Parse multiple AI responses
   */
  private parseMultipleAIResponses(response: string, context: UserContext): NextBestAction[] {
    // Simple parsing - would be more sophisticated in production
    const recommendations: NextBestAction[] = [];
    const blocks = response.split(/\d+\.\s/);

    blocks.forEach((block, index) => {
      if (block.trim()) {
        recommendations.push({
          id: `nba-ai-${Date.now()}-${index}`,
          title: `Recommendation ${index + 1}`,
          description: block.trim(),
          action: 'Take action',
          priority: 'medium',
          category: 'study',
          context: {},
          reasoning: 'AI-generated recommendation',
          impact: 'Improve study performance',
          createdAt: new Date(),
        });
      }
    });

    return recommendations;
  }

  /**
   * Get default recommendation when others fail
   */
  private getDefaultRecommendation(context: UserContext): NextBestAction {
    return {
      id: `nba-default-${Date.now()}`,
      title: 'Review Your Progress',
      description: 'Take a moment to review your tasks and plan your next study session.',
      action: 'Open task list',
      priority: 'low',
      category: 'review',
      context: {
        timeEstimate: 5,
      },
      reasoning: 'Regular review helps maintain focus and direction.',
      impact: 'Stay organized and on track with your goals.',
      createdAt: new Date(),
    };
  }

  // Helper methods

  private async getLastStudySession(userId: string) {
    const result = await this.db
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .orderBy(desc(focusSessions.startTime))
      .limit(1);

    return result[0];
  }

  private async getLastCompletedTask(userId: string) {
    const result = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, 'completed')))
      .orderBy(desc(tasks.completedAt))
      .limit(1);

    return result[0];
  }

  private async getTodayStats(userId: string, todayStart: Date, todayEnd: Date) {
    const [studyStats, taskStats] = await Promise.all([
      this.db
        .select({
          totalMinutes: sql<number>`COALESCE(SUM(${focusSessions.effectiveMinutes}), 0)`,
        })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, todayStart),
            lte(focusSessions.startTime, todayEnd),
          ),
        ),
      this.db
        .select({
          count: count(tasks.id),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.status, 'completed'),
            gte(tasks.completedAt, todayStart),
            lte(tasks.completedAt, todayEnd),
          ),
        ),
    ]);

    return {
      studyHours: (Number(studyStats[0]?.totalMinutes) || 0) / 60,
      tasksCompleted: Number(taskStats[0]?.count) || 0,
    };
  }

  private async getUpcomingDeadlines(userId: string, days: number) {
    const future = new Date();
    future.setDate(future.getDate() + days);

    const result = await this.db
      .select({
        taskId: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        subjectId: tasks.subjectId,
        subjectName: subjects.name,
      })
      .from(tasks)
      .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'pending'),
          lte(tasks.dueDate, future),
          gte(tasks.dueDate, new Date()),
        ),
      )
      .orderBy(asc(tasks.dueDate));

    return result.map((r) => ({
      taskId: r.taskId,
      title: r.title,
      dueDate: r.dueDate!,
      priority: r.priority,
      subjectName: r.subjectName || undefined,
    }));
  }

  private async analyzeStudyPatterns(userId: string) {
    const patterns = await this.db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${focusSessions.startTime})`,
        avgDuration: sql<number>`AVG(${focusSessions.durationMinutes})`,
        count: count(focusSessions.id),
      })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .groupBy(sql`EXTRACT(HOUR FROM ${focusSessions.startTime})`)
      .orderBy(desc(count(focusSessions.id)))
      .limit(1);

    const avgSessionDuration = await this.db
      .select({
        avg: sql<number>`AVG(${focusSessions.durationMinutes})`,
      })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId));

    return {
      preferredStudyTime: patterns[0] ? `${patterns[0].hour}:00` : undefined,
      averageSessionDuration: Number(avgSessionDuration[0]?.avg) || 30,
      peakProductivityHour: patterns[0] ? Number(patterns[0].hour) : undefined,
    };
  }

  private async getPerformanceMetrics(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [focusStats, taskStats, onTimeStats] = await Promise.all([
      this.db
        .select({
          avgScore: sql<number>`AVG(${focusSessions.focusScore})`,
        })
        .from(focusSessions)
        .where(and(eq(focusSessions.userId, userId), gte(focusSessions.startTime, thirtyDaysAgo))),
      this.db
        .select({
          total: count(tasks.id),
          completed: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
        })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), gte(tasks.createdAt, thirtyDaysAgo))),
      this.db
        .select({
          total: count(tasks.id),
          onTime: count(sql`CASE WHEN ${tasks.completedAt} <= ${tasks.dueDate} THEN 1 END`),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.status, 'completed'),
            gte(tasks.createdAt, thirtyDaysAgo),
            sql`${tasks.dueDate} IS NOT NULL`,
          ),
        ),
    ]);

    const total = Number(taskStats[0]?.total) || 0;
    const completed = Number(taskStats[0]?.completed) || 0;
    const onTimeTotal = Number(onTimeStats[0]?.total) || 0;
    const onTime = Number(onTimeStats[0]?.onTime) || 0;

    return {
      averageFocusScore: Number(focusStats[0]?.avgScore) || 0,
      taskCompletionRate: total > 0 ? (completed / total) * 100 : 0,
      onTimeRate: onTimeTotal > 0 ? (onTime / onTimeTotal) * 100 : 100,
    };
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
    const sessions = await this.db
      .select({
        date: sql<string>`DATE(${focusSessions.startTime})`,
      })
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .groupBy(sql`DATE(${focusSessions.startTime})`)
      .orderBy(desc(sql`DATE(${focusSessions.startTime})`))
      .limit(30);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (sessionDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else if (i === 0) {
        // Allow for yesterday if no session today
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (sessionDate.toDateString() === yesterday.toDateString()) {
          continue;
        }
        break;
      } else {
        break;
      }
    }

    return streak;
  }

  private formatRelativeDate(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return `in ${hours} hours`;
    } else if (days === 1) {
      return 'tomorrow';
    } else if (days <= 7) {
      return `in ${days} days`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
