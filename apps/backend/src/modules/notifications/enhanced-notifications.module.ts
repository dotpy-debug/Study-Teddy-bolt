import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { NotificationsController } from './notifications.controller';
import { EnhancedNotificationsController } from './enhanced-notifications.controller';

// Services
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationSchedulerService } from './notification-scheduler.service';

// Gateway
import { NotificationsGateway } from './notifications.gateway';

// External modules
import { EmailModule } from '../email/email.module';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [
    DbModule,
    EmailModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      // Use this instance across the app
      global: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    NotificationsController, // Legacy controller for backward compatibility
    EnhancedNotificationsController, // New enhanced controller
  ],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationSchedulerService,
    NotificationsGateway,
  ],
  exports: [
    NotificationsService,
    NotificationsRepository,
    NotificationSchedulerService,
    NotificationsGateway,
  ],
})
export class EnhancedNotificationsModule {}
