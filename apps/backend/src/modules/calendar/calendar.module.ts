import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { CalendarSchedulingService } from './services/calendar-scheduling.service';
import { DrizzleModule } from '@/db/drizzle.module';

@Module({
  imports: [ConfigModule, DrizzleModule],
  controllers: [CalendarController],
  providers: [
    CalendarService,
    GoogleOAuthService,
    GoogleCalendarService,
    CalendarSchedulingService,
  ],
  exports: [CalendarService],
})
export class CalendarModule {}
