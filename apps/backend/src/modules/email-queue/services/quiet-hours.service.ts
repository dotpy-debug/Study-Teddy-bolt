import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../db/db.module';
import { DatabaseService } from '../../../db/database.service';
import { notificationPreferences } from '../../../db/schema';

export interface QuietHoursInfo {
  isInQuietHours: boolean;
  nextAllowedTime?: Date;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

@Injectable()
export class QuietHoursService {
  private readonly logger = new Logger(QuietHoursService.name);

  constructor(@Inject(DRIZZLE_DB) private db: DatabaseService) {}

  async isInQuietHours(
    userId: string,
    checkTime?: Date,
  ): Promise<QuietHoursInfo> {
    try {
      const [preferences] = await this.db
        .select({
          quietHoursEnabled: notificationPreferences.quietHoursEnabled,
          quietHoursStart: notificationPreferences.quietHoursStart,
          quietHoursEnd: notificationPreferences.quietHoursEnd,
          quietHoursTimezone: notificationPreferences.quietHoursTimezone,
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      // Default values if no preferences found
      const defaultInfo = {
        isInQuietHours: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };

      if (!preferences || !preferences.quietHoursEnabled) {
        return defaultInfo;
      }

      const now = checkTime || new Date();
      const timezone = preferences.quietHoursTimezone || 'UTC';
      const quietStart = preferences.quietHoursStart || '22:00';
      const quietEnd = preferences.quietHoursEnd || '08:00';

      const quietHoursInfo = this.calculateQuietHours(
        now,
        quietStart,
        quietEnd,
        timezone,
      );

      return {
        ...quietHoursInfo,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
        timezone,
      };
    } catch (error) {
      this.logger.error('Failed to check quiet hours', {
        error: error.message,
        userId,
      });
      // Return safe default on error
      return {
        isInQuietHours: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };
    }
  }

  async getNextAllowedSendTime(
    userId: string,
    requestedTime?: Date,
  ): Promise<Date> {
    const quietHoursInfo = await this.isInQuietHours(userId, requestedTime);

    if (!quietHoursInfo.isInQuietHours) {
      return requestedTime || new Date();
    }

    return quietHoursInfo.nextAllowedTime || new Date();
  }

  async shouldRespectQuietHours(
    userId: string,
    emailType: string,
    priority: number = 50,
  ): Promise<boolean> {
    // High priority emails (>= 80) ignore quiet hours
    if (priority >= 80) {
      return false;
    }

    // Certain critical email types ignore quiet hours
    const criticalTypes = ['verification', 'password_reset'];
    if (criticalTypes.includes(emailType)) {
      return false;
    }

    return true;
  }

  private calculateQuietHours(
    checkTime: Date,
    startTime: string,
    endTime: string,
    timezone: string,
  ): { isInQuietHours: boolean; nextAllowedTime?: Date } {
    try {
      // Convert current time to user's timezone
      const userTime = new Date(
        checkTime.toLocaleString('en-US', { timeZone: timezone }),
      );
      const userHour = userTime.getHours();
      const userMinute = userTime.getMinutes();
      const currentTimeInMinutes = userHour * 60 + userMinute;

      // Parse start and end times
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      let isInQuietHours = false;
      let nextAllowedTime: Date | undefined;

      if (startTimeInMinutes <= endTimeInMinutes) {
        // Same day quiet hours (e.g., 01:00 - 06:00)
        isInQuietHours =
          currentTimeInMinutes >= startTimeInMinutes &&
          currentTimeInMinutes < endTimeInMinutes;

        if (isInQuietHours) {
          // Next allowed time is at the end time today
          nextAllowedTime = new Date(userTime);
          nextAllowedTime.setHours(endHour, endMinute, 0, 0);
        }
      } else {
        // Overnight quiet hours (e.g., 22:00 - 08:00)
        isInQuietHours =
          currentTimeInMinutes >= startTimeInMinutes ||
          currentTimeInMinutes < endTimeInMinutes;

        if (isInQuietHours) {
          if (currentTimeInMinutes >= startTimeInMinutes) {
            // Currently after start time, next allowed is end time tomorrow
            nextAllowedTime = new Date(userTime);
            nextAllowedTime.setDate(nextAllowedTime.getDate() + 1);
            nextAllowedTime.setHours(endHour, endMinute, 0, 0);
          } else {
            // Currently before end time, next allowed is end time today
            nextAllowedTime = new Date(userTime);
            nextAllowedTime.setHours(endHour, endMinute, 0, 0);
          }
        }
      }

      // Convert back to UTC if needed
      if (nextAllowedTime) {
        // Get the timezone offset and adjust
        const timezoneOffset = this.getTimezoneOffset(
          timezone,
          nextAllowedTime,
        );
        nextAllowedTime = new Date(nextAllowedTime.getTime() - timezoneOffset);
      }

      return { isInQuietHours, nextAllowedTime };
    } catch (error) {
      this.logger.error('Error calculating quiet hours', {
        error: error.message,
        checkTime,
        startTime,
        endTime,
        timezone,
      });
      return { isInQuietHours: false };
    }
  }

  private getTimezoneOffset(timezone: string, date: Date): number {
    try {
      // Create two dates: one in UTC, one in the target timezone
      const utcDate = new Date(date.toISOString());
      const tzDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone }),
      );

      // The difference is the timezone offset
      return tzDate.getTime() - utcDate.getTime();
    } catch (error) {
      this.logger.warn('Failed to calculate timezone offset, using 0', {
        timezone,
        error: error.message,
      });
      return 0;
    }
  }

  async getUserTimezone(userId: string): Promise<string> {
    try {
      const [preferences] = await this.db
        .select({
          timezone: notificationPreferences.quietHoursTimezone,
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      return preferences?.timezone || 'UTC';
    } catch (error) {
      this.logger.error('Failed to get user timezone', {
        error: error.message,
        userId,
      });
      return 'UTC';
    }
  }

  formatTimeInTimezone(
    date: Date,
    timezone: string,
    format: '12h' | '24h' = '24h',
  ): string {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: format === '12h',
      };

      return date.toLocaleString('en-US', options);
    } catch (error) {
      this.logger.warn('Failed to format time in timezone', {
        error: error.message,
        timezone,
      });
      return date.toISOString();
    }
  }
}
