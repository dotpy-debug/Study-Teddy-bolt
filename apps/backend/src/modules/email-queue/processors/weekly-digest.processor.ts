import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { WEEKLY_DIGEST_QUEUE } from '../email-queue.module';
import { WeeklyDigestJobData, WeeklyDigestEmailJobData } from '../types/email-job.types';
import { DRIZZLE_DB } from '../../../db/db.module';
import { DatabaseService } from '../../../db/database.service';
import { EmailQueueService } from '../email-queue.service';
import { ResendEmailService } from '../services/resend-email.service';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailDeliveryService } from '../services/email-delivery.service';
import {
  users,
  tasks,
  focusSessions,
  subjects,
  goals,
  notificationPreferences,
} from '../../../db/schema';
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm';

@Processor(WEEKLY_DIGEST_QUEUE)
export class WeeklyDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(WeeklyDigestProcessor.name);

  constructor(
    @Inject(DRIZZLE_DB) private db: DatabaseService,
    private emailQueueService: EmailQueueService,
    private resendEmailService: ResendEmailService,
    private emailTemplateService: EmailTemplateService,
    private emailDeliveryService: EmailDeliveryService,
  ) {
    super();
  }

  async process(job: Job<WeeklyDigestJobData>): Promise<void> {
    const { userId, weekStartDate, weekEndDate, timezone, userPreferences } = job.data;

    this.logger.debug(`Processing weekly digest for user: ${userId}`, {
      weekStartDate,
      weekEndDate,
      timezone,
    });

    try {
      // Get user information
      const [user] = await this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        this.logger.warn(`User not found for weekly digest: ${userId}`);
        return;
      }

      // Check if user has weekly digest enabled
      const [preferences] = await this.db
        .select({
          emailEnabled: notificationPreferences.emailEnabled,
          emailWeeklyDigestEnabled: notificationPreferences.emailWeeklyDigestEnabled,
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      if (!preferences?.emailEnabled || !preferences?.emailWeeklyDigestEnabled) {
        this.logger.debug(`Weekly digest disabled for user: ${userId}`);
        return;
      }

      // Generate weekly stats
      const weeklyStats = await this.generateWeeklyStats(userId, weekStartDate, weekEndDate);

      // Create digest email data
      const digestEmailData: WeeklyDigestEmailJobData = {
        type: 'weekly_digest',
        userId,
        recipientEmail: user.email,
        recipientName: user.name,
        weekStartDate,
        weekEndDate,
        stats: weeklyStats,
        priority: 20, // Lower priority for digest emails
      };

      // Send the digest email directly (bypass queue to avoid circular dependency)
      await this.sendWeeklyDigestEmail(digestEmailData);

      this.logger.log(`Weekly digest processed successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to process weekly digest for user: ${userId}`, {
        error: error.message,
        stack: error.stack,
        jobData: job.data,
      });
      throw error;
    }
  }

  private async sendWeeklyDigestEmail(emailData: WeeklyDigestEmailJobData): Promise<void> {
    let deliveryLogId: string;

    try {
      // Create delivery log entry
      deliveryLogId = await this.emailDeliveryService.createDeliveryLog({
        userId: emailData.userId,
        emailType: 'weekly_digest',
        recipientEmail: emailData.recipientEmail,
        subject: 'Weekly Study Summary',
        templateUsed: 'weekly_digest',
        templateData: emailData,
        priority: emailData.priority || 20,
        maxRetries: 2,
      });

      // Generate template data
      const templateData = await this.prepareWeeklyDigestTemplateData(emailData);

      // Generate email template
      const template = await this.emailTemplateService.generateTemplate(
        'weekly_digest',
        templateData,
      );

      // Send email via Resend
      const sendResult = await this.resendEmailService.sendEmail({
        to: emailData.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'email_type', value: 'weekly_digest' },
          { name: 'user_id', value: emailData.userId },
        ],
      });

      if (sendResult.success) {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'sent',
          resendId: sendResult.resendId,
          sentAt: new Date(),
        });

        this.logger.log(`Weekly digest email sent successfully`, {
          userId: emailData.userId,
          recipient: emailData.recipientEmail,
          resendId: sendResult.resendId,
        });
      } else {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'failed',
          errorMessage: sendResult.error,
          failedAt: new Date(),
        });

        throw new Error(`Weekly digest email send failed: ${sendResult.error}`);
      }
    } catch (error) {
      if (deliveryLogId) {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'failed',
          errorMessage: error.message,
          failedAt: new Date(),
        });
      }
      throw error;
    }
  }

  private async generateWeeklyStats(
    userId: string,
    weekStartDate: Date,
    weekEndDate: Date,
  ): Promise<any> {
    try {
      // Get total study minutes from focus sessions
      const [studyTimeResult] = await this.db
        .select({
          totalMinutes: sum(focusSessions.durationMinutes),
          sessionCount: count(),
          avgFocusScore: avg(focusSessions.focusScore),
        })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, weekStartDate),
            lte(focusSessions.startTime, weekEndDate),
          ),
        );

      const totalStudyMinutes = Number(studyTimeResult?.totalMinutes) || 0;
      const focusSessionsCompleted = Number(studyTimeResult?.sessionCount) || 0;
      const averageFocusScore = Math.round(Number(studyTimeResult?.avgFocusScore)) || 0;

      // Get completed tasks count
      const [tasksResult] = await this.db
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.status, 'completed'),
            gte(tasks.completedAt, weekStartDate),
            lte(tasks.completedAt, weekEndDate),
          ),
        );

      const tasksCompleted = Number(tasksResult?.count) || 0;

      // Get longest study session
      const [longestSessionResult] = await this.db
        .select({ duration: focusSessions.durationMinutes })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, weekStartDate),
            lte(focusSessions.startTime, weekEndDate),
          ),
        )
        .orderBy(desc(focusSessions.durationMinutes))
        .limit(1);

      const longestStudySession = longestSessionResult?.duration || 0;

      // Get most productive day
      const productiveDaysResult = await this.db
        .select({
          day: sql<string>`DATE(${focusSessions.startTime})`,
          totalMinutes: sum(focusSessions.durationMinutes),
        })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, weekStartDate),
            lte(focusSessions.startTime, weekEndDate),
          ),
        )
        .groupBy(sql`DATE(${focusSessions.startTime})`)
        .orderBy(desc(sql`${sum(focusSessions.durationMinutes)}`))
        .limit(1);

      const mostProductiveDay = productiveDaysResult[0]?.day
        ? new Date(productiveDaysResult[0].day).toLocaleDateString('en-US', {
            weekday: 'long',
          })
        : 'N/A';

      // Get subject breakdown
      const subjectBreakdown = await this.db
        .select({
          subjectId: focusSessions.subjectId,
          subjectName: subjects.name,
          studyMinutes: sum(focusSessions.durationMinutes),
          tasksCompleted: count(sql`DISTINCT ${tasks.id}`),
        })
        .from(focusSessions)
        .leftJoin(subjects, eq(focusSessions.subjectId, subjects.id))
        .leftJoin(
          tasks,
          and(
            eq(tasks.subjectId, focusSessions.subjectId),
            eq(tasks.status, 'completed'),
            gte(tasks.completedAt, weekStartDate),
            lte(tasks.completedAt, weekEndDate),
          ),
        )
        .where(
          and(
            eq(focusSessions.userId, userId),
            gte(focusSessions.startTime, weekStartDate),
            lte(focusSessions.startTime, weekEndDate),
          ),
        )
        .groupBy(focusSessions.subjectId, subjects.name)
        .orderBy(desc(sql`${sum(focusSessions.durationMinutes)}`));

      // Get upcoming tasks (next 7 days)
      const nextWeekEnd = new Date(weekEndDate);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

      const upcomingTasks = await this.db
        .select({
          id: tasks.id,
          title: tasks.title,
          dueDate: tasks.dueDate,
          priority: tasks.priority,
          subjectName: subjects.name,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.status, 'pending'),
            gte(tasks.dueDate, weekEndDate),
            lte(tasks.dueDate, nextWeekEnd),
          ),
        )
        .orderBy(tasks.dueDate)
        .limit(5);

      // TODO: Get achievements for the week (when achievement system is implemented)
      const achievements = [];

      return {
        totalStudyMinutes,
        tasksCompleted,
        focusSessionsCompleted,
        averageFocusScore,
        longestStudySession,
        mostProductiveDay,
        subjectBreakdown: subjectBreakdown.map((subject) => ({
          subjectName: subject.subjectName || 'Other',
          studyMinutes: Number(subject.studyMinutes) || 0,
          tasksCompleted: Number(subject.tasksCompleted) || 0,
        })),
        achievements,
        upcomingTasks: upcomingTasks.map((task) => ({
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          subjectName: task.subjectName,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to generate weekly stats', {
        error: error.message,
        userId,
        weekStartDate,
        weekEndDate,
      });
      throw error;
    }
  }

  private async prepareWeeklyDigestTemplateData(emailData: WeeklyDigestEmailJobData): Promise<any> {
    const baseData = {
      userName: emailData.recipientName,
      appUrl: 'https://studyteddy.com', // This should come from config
      supportEmail: 'support@studyteddy.com',
      dashboardUrl: 'https://studyteddy.com/dashboard',
      tasksUrl: 'https://studyteddy.com/dashboard/tasks',
      analyticsUrl: 'https://studyteddy.com/dashboard/analytics',
      unsubscribeUrl: `https://studyteddy.com/unsubscribe?userId=${emailData.userId}`,
    };

    const stats = emailData.stats;

    // Calculate totals for percentage calculations
    const totalStudyMinutes = stats.subjectBreakdown.reduce(
      (sum, subject) => sum + subject.studyMinutes,
      0,
    );

    return {
      ...baseData,
      weekStartDate: emailData.weekStartDate.toLocaleDateString(),
      weekEndDate: emailData.weekEndDate.toLocaleDateString(),
      weekRange: `${emailData.weekStartDate.toLocaleDateString()} - ${emailData.weekEndDate.toLocaleDateString()}`,

      totalStudyMinutes: stats.totalStudyMinutes,
      totalStudyFormatted: this.formatDuration(stats.totalStudyMinutes),
      tasksCompleted: stats.tasksCompleted,
      focusSessionsCompleted: stats.focusSessionsCompleted,
      averageFocusScore: stats.averageFocusScore,
      longestStudySession: stats.longestStudySession,
      longestStudyFormatted: this.formatDuration(stats.longestStudySession),
      mostProductiveDay: stats.mostProductiveDay,

      subjectBreakdown: stats.subjectBreakdown.map((subject) => ({
        ...subject,
        studyFormatted: this.formatDuration(subject.studyMinutes),
        percentage:
          totalStudyMinutes > 0 ? Math.round((subject.studyMinutes / totalStudyMinutes) * 100) : 0,
      })),

      achievements: stats.achievements.map((achievement) => ({
        ...achievement,
        earnedAt: achievement.earnedAt?.toLocaleDateString() || '',
        icon: achievement.icon || '🏆',
      })),

      upcomingTasks: stats.upcomingTasks.map((task) => ({
        ...task,
        dueDateFormatted: task.dueDate?.toLocaleDateString() || '',
        priorityColor: this.getPriorityColor(task.priority),
        isOverdue: task.dueDate ? task.dueDate < new Date() : false,
      })),

      // TODO: Add weekly goal progress when goal system is implemented
      weeklyGoalProgress: null,

      motivationalMessage: this.generateMotivationalMessage(stats),
    };
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545',
    };
    return colors[priority] || colors.medium;
  }

  private generateMotivationalMessage(stats: any): string {
    if (stats.totalStudyMinutes === 0) {
      return 'Every journey begins with a single step. Start your study journey this week!';
    }

    if (stats.totalStudyMinutes >= 300) {
      // 5+ hours
      return 'Outstanding dedication! Your consistent study habits are building a strong foundation for success.';
    }

    if (stats.totalStudyMinutes >= 180) {
      // 3+ hours
      return "Great progress! You're developing excellent study habits that will serve you well.";
    }

    if (stats.tasksCompleted >= 5) {
      return 'Fantastic task completion! Your productivity is on point this week.';
    }

    if (stats.averageFocusScore >= 80) {
      return 'Excellent focus! Your concentration skills are really paying off.';
    }

    return 'Keep up the good work! Every minute of focused study brings you closer to your goals.';
  }
}
