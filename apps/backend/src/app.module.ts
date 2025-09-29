import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AIModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmailModule } from './modules/email/email.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { StudySessionsModule } from './modules/study-sessions/sessions.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { EmailQueueModule } from './modules/email-queue/email-queue.module';
import { CacheModule } from './common/cache/cache.module';
import { PerformanceModule } from './common/performance/performance.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { SentryModule } from './sentry/sentry.module';
import { BetterAuthGuard } from './modules/auth/guards/better-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { SecurityLogger } from './common/logger/security.logger';
import { EnvironmentConfig } from './config/environment.config';
import { DbModule } from './db/db.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      cache: true,
      expandVariables: true,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('rateLimit.global.ttl', 60000), // Default: 1 minute
          limit: configService.get<number>('rateLimit.global.limit', 100), // Default: 100 requests
        },
        {
          name: 'short-burst',
          ttl: 10000, // 10 seconds
          limit: 10, // 10 requests per 10 seconds for burst protection
        },
      ],
    }),
    DbModule,
    SentryModule,
    CacheModule,
    PerformanceModule,
    MonitoringModule,
    EmailModule,
    EmailQueueModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TasksModule,
    AIModule,
    DashboardModule,
    FlashcardsModule,
    StudySessionsModule,
    SubjectsModule,
    NotificationsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EnvironmentConfig,
    SecurityLogger,
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}
