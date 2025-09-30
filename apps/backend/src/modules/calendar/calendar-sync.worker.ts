import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrizzleService } from '../../db/drizzle.service';
import { CalendarSyncService } from './calendar-sync.service';
import {
  googleCalendarTokens,
  calendarMappings,
  calendarSyncLogs,
  calendarAccounts,
  CalendarSyncLog,
  GoogleCalendarToken,
  CalendarMapping,
} from '../../db/schema';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface SyncJob {
  id: string;
  userId: string;
  type: 'full' | 'incremental' | 'single_event' | 'webhook';
  priority: number; // 0-100, higher = more priority
  calendarAccountId?: string;
  eventId?: string;
  webhookData?: any;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  createdAt: Date;
}

export interface SyncProgress {
  jobId: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  currentStep: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  results?: {
    eventsProcessed: number;
    eventsCreated: number;
    eventsUpdated: number;
    eventsDeleted: number;
    conflictsDetected: number;
    errorsEncountered: number;
  };
}

@Injectable()
export class CalendarSyncWorker {
  private readonly logger = new Logger(CalendarSyncWorker.name);
  private syncQueue: Map<string, SyncJob> = new Map();
  private activeJobs: Map<string, SyncProgress> = new Map();
  private isProcessing = false;
  private readonly maxConcurrentJobs = 3;
  private readonly defaultRetryDelayMs = 30000; // 30 seconds
  private readonly maxRetryDelayMs = 300000; // 5 minutes

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly calendarSyncService: CalendarSyncService,
  ) {}

  /**
   * Scheduled job to process sync queue every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    try {
      await this.processPendingJobs();
      await this.cleanupCompletedJobs();
      await this.retryFailedJobs();
    } catch (error) {
      this.logger.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Scheduled incremental sync every 15 minutes
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async scheduleIncrementalSync() {
    try {
      this.logger.log('Scheduling incremental sync for all active users');

      // Get all users with active calendar accounts
      const activeAccounts = await this.drizzle.db
        .select({
          userId: calendarAccounts.userId,
          accountId: calendarAccounts.id,
        })
        .from(calendarAccounts)
        .where(eq(calendarAccounts.syncEnabled, true));

      for (const account of activeAccounts) {
        await this.addSyncJob({
          userId: account.userId,
          type: 'incremental',
          priority: 50,
          calendarAccountId: account.accountId,
        });
      }

      this.logger.log(`Scheduled incremental sync for ${activeAccounts.length} calendar accounts`);
    } catch (error) {
      this.logger.error('Error scheduling incremental sync:', error);
    }
  }

  /**
   * Scheduled full sync every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduleFullSync() {
    try {
      this.logger.log('Scheduling full sync for all active users');

      const activeAccounts = await this.drizzle.db
        .select({
          userId: calendarAccounts.userId,
          accountId: calendarAccounts.id,
        })
        .from(calendarAccounts)
        .where(eq(calendarAccounts.syncEnabled, true));

      for (const account of activeAccounts) {
        await this.addSyncJob({
          userId: account.userId,
          type: 'full',
          priority: 30,
          calendarAccountId: account.accountId,
        });
      }

      this.logger.log(`Scheduled full sync for ${activeAccounts.length} calendar accounts`);
    } catch (error) {
      this.logger.error('Error scheduling full sync:', error);
    }
  }

  /**
   * Add a sync job to the queue
   */
  async addSyncJob(params: {
    userId: string;
    type: 'full' | 'incremental' | 'single_event' | 'webhook';
    priority?: number;
    calendarAccountId?: string;
    eventId?: string;
    webhookData?: any;
    maxRetries?: number;
  }): Promise<string> {
    const jobId = uuidv4();
    const job: SyncJob = {
      id: jobId,
      userId: params.userId,
      type: params.type,
      priority: params.priority ?? 50,
      calendarAccountId: params.calendarAccountId,
      eventId: params.eventId,
      webhookData: params.webhookData,
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
      scheduledAt: new Date(),
      createdAt: new Date(),
    };

    // Check for duplicate jobs
    const existingJob = Array.from(this.syncQueue.values()).find(
      (j) =>
        j.userId === params.userId &&
        j.type === params.type &&
        j.calendarAccountId === params.calendarAccountId &&
        (j.type !== 'single_event' || j.eventId === params.eventId),
    );

    if (existingJob) {
      this.logger.debug(
        `Duplicate sync job detected for user ${params.userId}, type ${params.type}`,
      );
      return existingJob.id;
    }

    this.syncQueue.set(jobId, job);

    this.logger.log(`Added sync job ${jobId} for user ${params.userId}, type: ${params.type}`);

    // Try to process immediately if not at capacity
    if (this.activeJobs.size < this.maxConcurrentJobs) {
      setImmediate(() => this.processPendingJobs());
    }

    return jobId;
  }

  /**
   * Cancel a sync job
   */
  async cancelSyncJob(jobId: string): Promise<boolean> {
    // Remove from queue if pending
    if (this.syncQueue.has(jobId)) {
      this.syncQueue.delete(jobId);
      this.logger.log(`Cancelled pending sync job ${jobId}`);
      return true;
    }

    // Cancel active job
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob && activeJob.status === 'in_progress') {
      activeJob.status = 'cancelled';
      activeJob.completedAt = new Date();
      this.logger.log(`Cancelled active sync job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Get sync job status
   */
  getSyncJobStatus(jobId: string): SyncProgress | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all active jobs for a user
   */
  getUserActiveJobs(userId: string): SyncProgress[] {
    return Array.from(this.activeJobs.values()).filter((job) => job.userId === userId);
  }

  /**
   * Handle webhook notifications from Google Calendar
   */
  async handleWebhook(params: {
    userId: string;
    calendarAccountId: string;
    webhookData: any;
  }): Promise<string> {
    this.logger.log(
      `Received webhook for user ${params.userId}, calendar ${params.calendarAccountId}`,
    );

    return this.addSyncJob({
      userId: params.userId,
      type: 'webhook',
      priority: 80, // High priority for real-time updates
      calendarAccountId: params.calendarAccountId,
      webhookData: params.webhookData,
      maxRetries: 5,
    });
  }

  /**
   * Force sync for a specific user and calendar
   */
  async forceSyncUser(
    userId: string,
    calendarAccountId?: string,
    syncType: 'full' | 'incremental' = 'incremental',
  ): Promise<string> {
    return this.addSyncJob({
      userId,
      type: syncType,
      priority: 90, // Very high priority for manual sync
      calendarAccountId,
      maxRetries: 5,
    });
  }

  /**
   * Process pending jobs from the queue
   */
  private async processPendingJobs() {
    const availableSlots = this.maxConcurrentJobs - this.activeJobs.size;
    if (availableSlots <= 0) {
      return;
    }

    // Sort jobs by priority (descending) and creation time (ascending)
    const pendingJobs = Array.from(this.syncQueue.values())
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, availableSlots);

    for (const job of pendingJobs) {
      this.syncQueue.delete(job.id);
      await this.executeJob(job);
    }
  }

  /**
   * Execute a sync job
   */
  private async executeJob(job: SyncJob) {
    const progress: SyncProgress = {
      jobId: job.id,
      userId: job.userId,
      status: 'in_progress',
      progressPercentage: 0,
      currentStep: 'Initializing...',
      startedAt: new Date(),
    };

    this.activeJobs.set(job.id, progress);

    try {
      this.logger.log(`Starting sync job ${job.id} for user ${job.userId}, type: ${job.type}`);

      // Log job start
      const syncLogId = await this.createSyncLog(job, 'in_progress');

      // Update progress
      progress.currentStep = 'Validating tokens...';
      progress.progressPercentage = 10;

      // Validate user tokens
      await this.validateUserTokens(job.userId);

      // Execute the actual sync based on type
      let syncResult;
      switch (job.type) {
        case 'full':
          syncResult = await this.calendarSyncService.performFullSync(
            job.userId,
            job.calendarAccountId,
          );
          break;
        case 'incremental':
          syncResult = await this.calendarSyncService.performIncrementalSync(
            job.userId,
            job.calendarAccountId,
          );
          break;
        case 'single_event':
          if (!job.eventId) {
            throw new Error('Event ID required for single event sync');
          }
          syncResult = await this.calendarSyncService.syncSingleEvent(
            job.userId,
            job.eventId,
            job.calendarAccountId,
          );
          break;
        case 'webhook':
          syncResult = await this.calendarSyncService.processWebhookUpdate(
            job.userId,
            job.calendarAccountId,
            job.webhookData,
          );
          break;
        default:
          throw new Error(`Unknown sync type: ${job.type}`);
      }

      // Update progress with results
      progress.status = 'completed';
      progress.progressPercentage = 100;
      progress.currentStep = 'Completed';
      progress.completedAt = new Date();
      progress.results = syncResult;

      // Update sync log
      await this.updateSyncLog(syncLogId, 'completed', syncResult);

      this.logger.log(`Completed sync job ${job.id} for user ${job.userId}. Results:`, syncResult);
    } catch (error) {
      this.logger.error(`Sync job ${job.id} failed:`, error);

      progress.status = 'failed';
      progress.error = error.message;
      progress.completedAt = new Date();

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        const retryDelay = Math.min(
          this.defaultRetryDelayMs * Math.pow(2, job.retryCount),
          this.maxRetryDelayMs,
        );

        job.retryCount++;
        job.scheduledAt = new Date(Date.now() + retryDelay);

        this.syncQueue.set(job.id, job);
        this.activeJobs.delete(job.id);

        this.logger.log(
          `Scheduled retry ${job.retryCount}/${job.maxRetries} for job ${job.id} in ${retryDelay}ms`,
        );
        return;
      }

      // Log final failure
      const syncLogId = await this.createSyncLog(job, 'failed', error.message);
    }
  }

  /**
   * Validate and refresh user tokens if needed
   */
  private async validateUserTokens(userId: string): Promise<void> {
    const tokens = await this.drizzle.db
      .select()
      .from(googleCalendarTokens)
      .where(
        and(eq(googleCalendarTokens.userId, userId), eq(googleCalendarTokens.syncEnabled, true)),
      );

    for (const token of tokens) {
      // Check if token is expired or will expire in the next 5 minutes
      const expiresAt = new Date(token.expiresAt);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt <= fiveMinutesFromNow) {
        this.logger.log(`Refreshing expired token for user ${userId}`);
        await this.calendarSyncService.refreshUserToken(userId, token.googleEmail);
      }
    }
  }

  /**
   * Clean up completed jobs older than 1 hour
   */
  private async cleanupCompletedJobs() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [jobId, progress] of this.activeJobs.entries()) {
      if (
        (progress.status === 'completed' ||
          progress.status === 'failed' ||
          progress.status === 'cancelled') &&
        progress.completedAt &&
        progress.completedAt < oneHourAgo
      ) {
        this.activeJobs.delete(jobId);
      }
    }
  }

  /**
   * Retry failed jobs that are scheduled for retry
   */
  private async retryFailedJobs() {
    const now = new Date();

    for (const [jobId, job] of this.syncQueue.entries()) {
      if (job.scheduledAt <= now && job.retryCount > 0) {
        this.syncQueue.delete(jobId);
        await this.executeJob(job);
      }
    }
  }

  /**
   * Create a sync log entry
   */
  private async createSyncLog(
    job: SyncJob,
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled',
    errorMessage?: string,
  ): Promise<string> {
    const syncLogId = uuidv4();

    await this.drizzle.db.insert(calendarSyncLogs).values({
      id: syncLogId,
      userId: job.userId,
      calendarAccountId: job.calendarAccountId,
      syncId: job.id,
      operation: 'fetch',
      status,
      syncType: job.type,
      errorMessage,
      metadata: {
        triggerSource: job.type === 'webhook' ? 'webhook' : 'scheduled',
        retryCount: job.retryCount,
        webhookId: job.webhookData?.id,
      },
    });

    return syncLogId;
  }

  /**
   * Update a sync log entry with results
   */
  private async updateSyncLog(
    syncLogId: string,
    status: 'completed' | 'failed',
    results?: any,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      completedAt: new Date(),
      updatedAt: new Date(),
    };

    if (results) {
      updateData.eventsProcessed = results.eventsProcessed || 0;
      updateData.eventsCreated = results.eventsCreated || 0;
      updateData.eventsUpdated = results.eventsUpdated || 0;
      updateData.eventsDeleted = results.eventsDeleted || 0;
      updateData.conflictsDetected = results.conflictsDetected || 0;
      updateData.errorsEncountered = results.errorsEncountered || 0;
      updateData.progressPercentage = 100;
      updateData.currentStep = 'Completed';
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.drizzle.db
      .update(calendarSyncLogs)
      .set(updateData)
      .where(eq(calendarSyncLogs.id, syncLogId));
  }

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStatistics(): Promise<{
    queueSize: number;
    activeJobs: number;
    completedToday: number;
    failedToday: number;
    averageSyncDuration: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await this.drizzle.db
      .select()
      .from(calendarSyncLogs)
      .where(and(eq(calendarSyncLogs.operation, 'fetch'), lt(today, calendarSyncLogs.createdAt)));

    const completed = todayLogs.filter((log) => log.status === 'completed');
    const failed = todayLogs.filter((log) => log.status === 'failed');

    const completedWithDuration = completed.filter((log) => log.durationMs);
    const averageDuration =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, log) => sum + (log.durationMs || 0), 0) /
          completedWithDuration.length
        : 0;

    return {
      queueSize: this.syncQueue.size,
      activeJobs: this.activeJobs.size,
      completedToday: completed.length,
      failedToday: failed.length,
      averageSyncDuration: Math.round(averageDuration),
    };
  }
}
