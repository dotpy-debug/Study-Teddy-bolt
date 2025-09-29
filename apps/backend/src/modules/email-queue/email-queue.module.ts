import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './processors/email.processor';
import { WeeklyDigestProcessor } from './processors/weekly-digest.processor';
import { RetryProcessor } from './processors/retry.processor';
import { BatchEmailProcessor } from './processors/batch-email.processor';
import { ScheduledEmailProcessor } from './processors/scheduled-email.processor';
import { WebhookEventsProcessor } from './processors/webhook-events.processor';
import { ResendEmailService } from './services/resend-email.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailDeliveryService } from './services/email-delivery.service';
import { QuietHoursService } from './services/quiet-hours.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { BetterAuthIntegrationService } from './services/better-auth-integration.service';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller';
import { DbModule } from '../../db/db.module';

export const EMAIL_QUEUE = 'email';
export const WEEKLY_DIGEST_QUEUE = 'weekly-digest';
export const RETRY_QUEUE = 'email-retry';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: EMAIL_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: WEEKLY_DIGEST_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 10,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: RETRY_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 1, // No retries for retry queue
        },
      },
    ),
  ],
  controllers: [NotificationPreferencesController],
  providers: [
    EmailQueueService,
    EmailProcessor,
    WeeklyDigestProcessor,
    RetryProcessor,
    BatchEmailProcessor,
    ScheduledEmailProcessor,
    WebhookEventsProcessor,
    ResendEmailService,
    EmailTemplateService,
    EmailDeliveryService,
    QuietHoursService,
    NotificationPreferencesService,
    BetterAuthIntegrationService,
  ],
  exports: [
    EmailQueueService,
    ResendEmailService,
    EmailTemplateService,
    EmailDeliveryService,
    NotificationPreferencesService,
    BetterAuthIntegrationService,
  ],
})
export class EmailQueueModule {}
