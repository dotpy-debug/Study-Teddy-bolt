import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailQueueModule } from '../email-queue/email-queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailNotificationIntegrationService } from './services/email-notification-integration.service';
import { EmailRateLimitGuard } from './guards/email-rate-limit.guard';
import { EmailPermissionsGuard } from './guards/email-permissions.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    EmailQueueModule,
    NotificationsModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
          port: configService.get<number>('EMAIL_PORT', 587),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get<string>('EMAIL_USER'),
            pass: configService.get<string>('EMAIL_PASSWORD'),
          },
          tls: {
            rejectUnauthorized: false, // For development only
          },
        },
        defaults: {
          from: configService.get<string>(
            'EMAIL_FROM',
            '"Study Teddy" <noreply@studyteddy.com>',
          ),
        },
        template: {
          dir: join(__dirname, '..', '..', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailNotificationIntegrationService,
    EmailRateLimitGuard,
    EmailPermissionsGuard,
  ],
  exports: [EmailService, EmailNotificationIntegrationService],
})
export class EmailModule {}
