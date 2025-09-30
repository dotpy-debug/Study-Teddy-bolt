import { Processor, OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export interface StudyReminderJob {
  userId: string;
  taskId?: string;
  subjectId?: string;
  reminderType: 'daily' | 'task_due' | 'break_reminder' | 'study_session' | 'weekly_review';
  scheduledFor: Date;
  message: string;
  data?: Record<string, any>;
  recurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    time?: string; // HH:mm format
  };
}

@Processor('study-reminder')
export class StudyReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(StudyReminderProcessor.name);

  async process(job: Job<StudyReminderJob>): Promise<any> {
    this.logger.debug(`Processing study reminder job ${job.id}`);
    const {
      userId,
      taskId,
      subjectId,
      reminderType,
      scheduledFor,
      message,
      data = {},
      recurring,
    } = job.data;

    try {
      this.logger.log(`Processing study reminder: ${reminderType} for user ${userId}`);

      // Check if reminder is still valid (not too late)
      const now = new Date();
      const reminderTime = new Date(scheduledFor);

      if (reminderTime < now && now.getTime() - reminderTime.getTime() > 24 * 60 * 60 * 1000) {
        this.logger.warn(`Study reminder ${reminderType} is too old, skipping for user ${userId}`);
        return { skipped: true, reason: 'Too old' };
      }

      // Process different types of study reminders
      switch (reminderType) {
        case 'daily':
          await this.processDailyReminder(userId, message, data || {});
          break;
        case 'task_due':
          await this.processTaskDueReminder(userId, taskId || '', message, data || {});
          break;
        case 'break_reminder':
          await this.processBreakReminder(userId, message, data || {});
          break;
        case 'study_session':
          await this.processStudySessionReminder(userId, subjectId || '', message, data || {});
          break;
        case 'weekly_review':
          await this.processWeeklyReviewReminder(userId, message, data || {});
          break;
        default:
          await this.processGenericReminder(userId, reminderType, message, data || {});
      }

      // Schedule next reminder if recurring
      if (recurring && job.data.recurringPattern) {
        await this.scheduleNextRecurringReminder(job.data);
      }

      this.logger.log(`Study reminder ${reminderType} processed successfully for user ${userId}`);
      return {
        success: true,
        userId,
        reminderType,
        processedAt: new Date(),
        scheduledFor,
        recurring,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process study reminder ${reminderType} for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async processDailyReminder(
    userId: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Processing daily reminder for user ${userId}: ${message}`);

    // Placeholder: would check user's study schedule and send personalized reminder
    // Could include today's tasks, recommended study time, etc.
    await this.sendStudyReminder(userId, 'Daily Study Reminder', message, {
      type: 'daily',
      ...data,
    });
  }

  private async processTaskDueReminder(
    userId: string,
    taskId: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(
      `Processing task due reminder for user ${userId}, task ${taskId}: ${message}`,
    );

    // Placeholder: would fetch task details and send reminder
    await this.sendStudyReminder(userId, 'Task Due Reminder', message, {
      type: 'task_due',
      taskId,
      ...data,
    });
  }

  private async processBreakReminder(
    userId: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Processing break reminder for user ${userId}: ${message}`);

    // Placeholder: would remind user to take a break during long study sessions
    await this.sendStudyReminder(userId, 'Time for a Break!', message, {
      type: 'break_reminder',
      ...data,
    });
  }

  private async processStudySessionReminder(
    userId: string,
    subjectId: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(
      `Processing study session reminder for user ${userId}, subject ${subjectId}: ${message}`,
    );

    // Placeholder: would remind user about scheduled study session
    await this.sendStudyReminder(userId, 'Study Session Starting', message, {
      type: 'study_session',
      subjectId,
      ...data,
    });
  }

  private async processWeeklyReviewReminder(
    userId: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Processing weekly review reminder for user ${userId}: ${message}`);

    // Placeholder: would remind user to review their weekly progress
    await this.sendStudyReminder(userId, 'Weekly Review Time', message, {
      type: 'weekly_review',
      ...data,
    });
  }

  private async processGenericReminder(
    userId: string,
    reminderType: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(
      `Processing generic study reminder ${reminderType} for user ${userId}: ${message}`,
    );

    await this.sendStudyReminder(userId, 'Study Reminder', message, {
      type: reminderType,
      ...data,
    });
  }

  private async sendStudyReminder(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Sending study reminder to user ${userId}: ${title}`);

    // Placeholder: would send notification through various channels
    // This could queue a notification job or directly send notifications

    // Example: Queue a notification job
    // await this.queueService.addNotificationJob({
    //   userId,
    //   type: 'study_reminder',
    //   title,
    //   message,
    //   data,
    //   channels: ['push', 'in-app'],
    //   priority: 'normal'
    // });
  }

  private async scheduleNextRecurringReminder(reminderData: StudyReminderJob): Promise<void> {
    const { recurringPattern } = reminderData;

    if (!recurringPattern) {
      return;
    }

    this.logger.debug(`Scheduling next recurring reminder for user ${reminderData.userId}`);

    let nextReminderDate: Date;
    const currentDate = new Date(reminderData.scheduledFor);

    switch (recurringPattern.frequency) {
      case 'daily':
        nextReminderDate = new Date(currentDate);
        nextReminderDate.setDate(nextReminderDate.getDate() + 1);
        break;
      case 'weekly':
        nextReminderDate = new Date(currentDate);
        nextReminderDate.setDate(nextReminderDate.getDate() + 7);
        break;
      case 'monthly':
        nextReminderDate = new Date(currentDate);
        nextReminderDate.setMonth(nextReminderDate.getMonth() + 1);
        break;
      default:
        this.logger.warn(`Unknown recurring frequency: ${recurringPattern.frequency}`);
        return;
    }

    // Set specific time if provided
    if (recurringPattern.time) {
      const [hours, minutes] = recurringPattern.time.split(':').map(Number);
      nextReminderDate.setHours(hours, minutes, 0, 0);
    }

    // Placeholder: would schedule the next reminder job
    // await this.queueService.addStudyReminderJob({
    //   ...reminderData,
    //   scheduledFor: nextReminderDate
    // }, {
    //   delay: nextReminderDate.getTime() - Date.now()
    // });

    this.logger.debug(`Next recurring reminder scheduled for ${nextReminderDate.toISOString()}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<StudyReminderJob>) {
    this.logger.debug(`Study reminder job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<StudyReminderJob>, error: Error) {
    this.logger.error(`Study reminder job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<StudyReminderJob>) {
    this.logger.debug(`Study reminder job ${job.id} started`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job<StudyReminderJob>) {
    this.logger.warn(`Study reminder job ${job.id} stalled`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<StudyReminderJob>, progress: number) {
    this.logger.debug(`Study reminder job ${job.id} progress: ${progress}%`);
  }
}
