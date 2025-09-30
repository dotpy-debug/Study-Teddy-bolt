import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../db/db.module';
import { DatabaseService } from '../../../db/database.service';
import {
  notificationPreferences,
  NewNotificationPreference,
  NotificationPreference,
} from '../../../db/schema';

export interface UpdateNotificationPreferencesDto {
  // Channel preferences
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;

  // Email notification type preferences
  emailWelcomeEnabled?: boolean;
  emailVerificationEnabled?: boolean;
  emailPasswordResetEnabled?: boolean;
  emailTaskRemindersEnabled?: boolean;
  emailWeeklyDigestEnabled?: boolean;
  emailFocusSessionAlertsEnabled?: boolean;
  emailAchievementsEnabled?: boolean;

  // Notification type preferences (in-app)
  taskReminders?: boolean;
  goalReminders?: boolean;
  achievements?: boolean;
  aiSuggestions?: boolean;
  systemAlerts?: boolean;

  // Timing preferences
  reminderLeadTimeMinutes?: number;
  dailySummaryEnabled?: boolean;
  dailySummaryTime?: string;
  weeklyDigestEnabled?: boolean;
  weeklyDigestDay?: number;
  weeklyDigestTime?: string;

  // Quiet hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;

  // Frequency settings
  reminderFrequency?: 'immediate' | 'daily' | 'weekly';
  digestFrequency?: 'daily' | 'weekly' | 'monthly';

  // Sound preferences
  soundEnabled?: boolean;
  soundVolume?: number;
}

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(@Inject(DRIZZLE_DB) private db: DatabaseService) {}

  async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    try {
      const [preferences] = await this.db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      return preferences || null;
    } catch (error) {
      this.logger.error('Failed to get user notification preferences', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    try {
      const defaultPreferences: NewNotificationPreference = {
        userId,
        // Channel preferences - enabled by default
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,

        // Email notification type preferences - most enabled by default
        emailWelcomeEnabled: true,
        emailVerificationEnabled: true,
        emailPasswordResetEnabled: true,
        emailTaskRemindersEnabled: true,
        emailWeeklyDigestEnabled: true,
        emailFocusSessionAlertsEnabled: false, // Disabled by default to avoid spam
        emailAchievementsEnabled: true,

        // Notification type preferences (in-app) - all enabled by default
        taskReminders: true,
        goalReminders: true,
        achievements: true,
        aiSuggestions: true,
        systemAlerts: true,

        // Timing preferences
        reminderLeadTimeMinutes: 15,
        dailySummaryEnabled: true,
        dailySummaryTime: '08:00',
        weeklyDigestEnabled: true,
        weeklyDigestDay: 1, // Monday
        weeklyDigestTime: '08:00',

        // Quiet hours - enabled with reasonable defaults
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        quietHoursTimezone: 'UTC',

        // Frequency settings
        reminderFrequency: 'immediate',
        digestFrequency: 'weekly',

        // Sound preferences
        soundEnabled: true,
        soundVolume: 50,
      };

      const [created] = await this.db
        .insert(notificationPreferences)
        .values(defaultPreferences)
        .returning();

      this.logger.debug(`Created default notification preferences for user: ${userId}`);

      return created;
    } catch (error) {
      this.logger.error('Failed to create default notification preferences', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    updates: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    try {
      // First, try to get existing preferences
      let preferences = await this.getUserPreferences(userId);

      // If no preferences exist, create default ones first
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      // Validate updates
      this.validatePreferences(updates);

      // Update preferences
      const [updated] = await this.db
        .update(notificationPreferences)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))
        .returning();

      this.logger.debug(`Updated notification preferences for user: ${userId}`, updates);

      return updated;
    } catch (error) {
      this.logger.error('Failed to update notification preferences', {
        error: error.message,
        userId,
        updates,
      });
      throw error;
    }
  }

  async getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
    try {
      let preferences = await this.getUserPreferences(userId);

      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      this.logger.error('Failed to get or create notification preferences', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async isEmailNotificationEnabled(
    userId: string,
    emailType:
      | 'welcome'
      | 'verification'
      | 'password_reset'
      | 'task_reminder'
      | 'weekly_digest'
      | 'focus_session_alert'
      | 'achievement',
  ): Promise<boolean> {
    try {
      const preferences = await this.getOrCreatePreferences(userId);

      // Check if email notifications are globally enabled
      if (!preferences.emailEnabled) {
        return false;
      }

      // Check specific email type preferences
      switch (emailType) {
        case 'welcome':
          return preferences.emailWelcomeEnabled;
        case 'verification':
          return preferences.emailVerificationEnabled;
        case 'password_reset':
          return preferences.emailPasswordResetEnabled;
        case 'task_reminder':
          return preferences.emailTaskRemindersEnabled;
        case 'weekly_digest':
          return preferences.emailWeeklyDigestEnabled;
        case 'focus_session_alert':
          return preferences.emailFocusSessionAlertsEnabled;
        case 'achievement':
          return preferences.emailAchievementsEnabled;
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to check email notification preference', {
        error: error.message,
        userId,
        emailType,
      });
      // Default to false on error to avoid sending unwanted emails
      return false;
    }
  }

  async isInAppNotificationEnabled(
    userId: string,
    notificationType:
      | 'task_reminders'
      | 'goal_reminders'
      | 'achievements'
      | 'ai_suggestions'
      | 'system_alerts',
  ): Promise<boolean> {
    try {
      const preferences = await this.getOrCreatePreferences(userId);

      // Check if in-app notifications are globally enabled
      if (!preferences.inAppEnabled) {
        return false;
      }

      // Check specific notification type preferences
      switch (notificationType) {
        case 'task_reminders':
          return preferences.taskReminders;
        case 'goal_reminders':
          return preferences.goalReminders;
        case 'achievements':
          return preferences.achievements;
        case 'ai_suggestions':
          return preferences.aiSuggestions;
        case 'system_alerts':
          return preferences.systemAlerts;
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to check in-app notification preference', {
        error: error.message,
        userId,
        notificationType,
      });
      // Default to false on error
      return false;
    }
  }

  async getUserDigestSettings(userId: string): Promise<{
    enabled: boolean;
    day: number;
    time: string;
    timezone: string;
  }> {
    try {
      const preferences = await this.getOrCreatePreferences(userId);

      return {
        enabled: preferences.emailEnabled && preferences.emailWeeklyDigestEnabled,
        day: preferences.weeklyDigestDay,
        time: preferences.weeklyDigestTime,
        timezone: preferences.quietHoursTimezone,
      };
    } catch (error) {
      this.logger.error('Failed to get user digest settings', {
        error: error.message,
        userId,
      });
      // Return safe defaults
      return {
        enabled: false,
        day: 1, // Monday
        time: '08:00',
        timezone: 'UTC',
      };
    }
  }

  private validatePreferences(updates: UpdateNotificationPreferencesDto): void {
    // Validate sound volume
    if (updates.soundVolume !== undefined) {
      if (updates.soundVolume < 0 || updates.soundVolume > 100) {
        throw new Error('Sound volume must be between 0 and 100');
      }
    }

    // Validate reminder lead time
    if (updates.reminderLeadTimeMinutes !== undefined) {
      if (updates.reminderLeadTimeMinutes < 0 || updates.reminderLeadTimeMinutes > 1440) {
        throw new Error('Reminder lead time must be between 0 and 1440 minutes (24 hours)');
      }
    }

    // Validate weekly digest day
    if (updates.weeklyDigestDay !== undefined) {
      if (updates.weeklyDigestDay < 0 || updates.weeklyDigestDay > 6) {
        throw new Error('Weekly digest day must be between 0 (Sunday) and 6 (Saturday)');
      }
    }

    // Validate time formats (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (updates.dailySummaryTime && !timeRegex.test(updates.dailySummaryTime)) {
      throw new Error('Daily summary time must be in HH:MM format');
    }

    if (updates.weeklyDigestTime && !timeRegex.test(updates.weeklyDigestTime)) {
      throw new Error('Weekly digest time must be in HH:MM format');
    }

    if (updates.quietHoursStart && !timeRegex.test(updates.quietHoursStart)) {
      throw new Error('Quiet hours start time must be in HH:MM format');
    }

    if (updates.quietHoursEnd && !timeRegex.test(updates.quietHoursEnd)) {
      throw new Error('Quiet hours end time must be in HH:MM format');
    }

    // Validate frequency options
    if (
      updates.reminderFrequency &&
      !['immediate', 'daily', 'weekly'].includes(updates.reminderFrequency)
    ) {
      throw new Error('Reminder frequency must be immediate, daily, or weekly');
    }

    if (
      updates.digestFrequency &&
      !['daily', 'weekly', 'monthly'].includes(updates.digestFrequency)
    ) {
      throw new Error('Digest frequency must be daily, weekly, or monthly');
    }
  }

  async disableAllEmailNotifications(userId: string): Promise<void> {
    try {
      await this.updatePreferences(userId, {
        emailEnabled: false,
      });

      this.logger.log(`Disabled all email notifications for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to disable all email notifications', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async enableAllEmailNotifications(userId: string): Promise<void> {
    try {
      await this.updatePreferences(userId, {
        emailEnabled: true,
        emailWelcomeEnabled: true,
        emailVerificationEnabled: true,
        emailPasswordResetEnabled: true,
        emailTaskRemindersEnabled: true,
        emailWeeklyDigestEnabled: true,
        emailAchievementsEnabled: true,
      });

      this.logger.log(`Enabled all email notifications for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to enable all email notifications', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}
