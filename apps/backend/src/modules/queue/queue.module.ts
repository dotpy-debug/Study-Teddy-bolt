import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { DocumentProcessor } from './processors/document.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { StudyReminderProcessor } from './processors/study-reminder.processor';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 24 * 3600, // 24 hours
            count: 100,
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // 7 days
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'document' },
      { name: 'analytics' },
      { name: 'notification' },
      { name: 'study-reminder' },
    ),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    DocumentProcessor,
    AnalyticsProcessor,
    NotificationProcessor,
    StudyReminderProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
