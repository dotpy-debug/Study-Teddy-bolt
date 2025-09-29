import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

// Core services
import { ResendService } from './resend.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { RateLimitingService } from './services/rate-limiting.service';

// Controllers and processors
import { EmailController } from './controllers/email.controller';
import { EmailProcessor } from './processors/email.processor';

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
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    }),
  ],
  controllers: [EmailController],
  providers: [
    ResendService,
    EmailTemplateService,
    EmailQueueService,
    EmailTrackingService,
    RateLimitingService,
    EmailProcessor,
  ],
  exports: [
    ResendService,
    EmailTemplateService,
    EmailQueueService,
    EmailTrackingService,
    RateLimitingService,
  ],
})
export class ResendEmailModule {}
