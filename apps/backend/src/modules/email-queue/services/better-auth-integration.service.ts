import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '../email-queue.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class BetterAuthIntegrationService {
  private readonly logger = new Logger(BetterAuthIntegrationService.name);
  private readonly appUrl: string;

  constructor(
    private emailQueueService: EmailQueueService,
    private notificationPreferencesService: NotificationPreferencesService,
    private configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'https://studyteddy.com');
  }

  /**
   * Send email verification email for Better Auth
   * This should be called from your Better Auth configuration
   */
  async sendVerificationEmail(params: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    try {
      const { user, token, expiresAt } = params;

      // Check if user has email verification enabled
      const emailEnabled = await this.notificationPreferencesService.isEmailNotificationEnabled(
        user.id,
        'verification',
      );

      if (!emailEnabled) {
        this.logger.debug(`Email verification disabled for user: ${user.id}`);
        return;
      }

      // Construct verification URL
      const verificationUrl = `${this.appUrl}/auth/verify-email?token=${token}`;

      // Add verification email to queue
      await this.emailQueueService.addVerificationEmail(
        user.id,
        user.email,
        user.name,
        token,
        verificationUrl,
        {
          priority: 90, // High priority
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Verification email queued for user: ${user.id}`, {
        email: user.email,
        expiresAt,
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Send password reset email for Better Auth
   */
  async sendPasswordResetEmail(params: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    token: string;
    expiresAt: Date;
    requestedAt: Date;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const { user, token, expiresAt, requestedAt, ipAddress } = params;

      // Check if user has password reset emails enabled
      const emailEnabled = await this.notificationPreferencesService.isEmailNotificationEnabled(
        user.id,
        'password_reset',
      );

      if (!emailEnabled) {
        this.logger.debug(`Password reset email disabled for user: ${user.id}`);
        return;
      }

      // Construct reset URL
      const resetUrl = `${this.appUrl}/auth/reset-password?token=${token}`;

      // Add password reset email to queue
      await this.emailQueueService.addPasswordResetEmail(
        user.id,
        user.email,
        user.name,
        token,
        resetUrl,
        requestedAt,
        {
          priority: 90, // High priority
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Password reset email queued for user: ${user.id}`, {
        email: user.email,
        expiresAt,
        ipAddress,
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Send welcome email for new user registration
   */
  async sendWelcomeEmail(params: {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
    };
    verificationToken?: string;
  }): Promise<void> {
    try {
      const { user, verificationToken } = params;

      // Check if user has welcome emails enabled
      const emailEnabled = await this.notificationPreferencesService.isEmailNotificationEnabled(
        user.id,
        'welcome',
      );

      if (!emailEnabled) {
        this.logger.debug(`Welcome email disabled for user: ${user.id}`);
        return;
      }

      // Construct verification URL if email is not verified
      let verificationUrl: string | undefined;
      if (!user.emailVerified && verificationToken) {
        verificationUrl = `${this.appUrl}/auth/verify-email?token=${verificationToken}`;
      }

      // Add welcome email to queue
      await this.emailQueueService.addWelcomeEmail(
        user.id,
        user.email,
        user.name,
        verificationUrl,
        {
          priority: 70, // High priority for welcome emails
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Welcome email queued for user: ${user.id}`, {
        email: user.email,
        emailVerified: user.emailVerified,
        hasVerificationLink: !!verificationUrl,
      });
    } catch (error) {
      this.logger.error('Failed to send welcome email', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Handle email verification success
   * This can be called when a user successfully verifies their email
   */
  async handleEmailVerificationSuccess(params: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }): Promise<void> {
    try {
      const { user } = params;

      // Create default notification preferences if they don't exist
      await this.notificationPreferencesService.getOrCreatePreferences(user.id);

      this.logger.log(`Email verification success handled for user: ${user.id}`, {
        email: user.email,
      });
    } catch (error) {
      this.logger.error('Failed to handle email verification success', {
        error: error.message,
        params,
      });
      // Don't throw here as it's not critical
    }
  }

  /**
   * Handle user account creation
   * This should be called after a user account is successfully created
   */
  async handleUserAccountCreated(params: {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
    };
    authProvider: 'local' | 'google' | 'github';
    verificationToken?: string;
  }): Promise<void> {
    try {
      const { user, authProvider, verificationToken } = params;

      // Create default notification preferences
      await this.notificationPreferencesService.createDefaultPreferences(user.id);

      // Send welcome email for local auth users
      // OAuth users typically have verified emails and different onboarding
      if (authProvider === 'local') {
        await this.sendWelcomeEmail({
          user,
          verificationToken,
        });
      }

      this.logger.log(`User account creation handled: ${user.id}`, {
        email: user.email,
        authProvider,
        emailVerified: user.emailVerified,
      });
    } catch (error) {
      this.logger.error('Failed to handle user account creation', {
        error: error.message,
        params,
      });
      // Don't throw here as account creation should still succeed
    }
  }

  /**
   * Handle user login
   * This can be used to send login notifications if needed
   */
  async handleUserLogin(params: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    authProvider: 'local' | 'google' | 'github';
    isFirstLogin: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const { user, authProvider, isFirstLogin } = params;

      // For OAuth users on first login, send welcome email
      if (isFirstLogin && authProvider !== 'local') {
        await this.sendWelcomeEmail({
          user: {
            ...user,
            emailVerified: true, // OAuth users typically have verified emails
          },
        });
      }

      // Ensure notification preferences exist
      await this.notificationPreferencesService.getOrCreatePreferences(user.id);

      this.logger.debug(`User login handled: ${user.id}`, {
        authProvider,
        isFirstLogin,
      });
    } catch (error) {
      this.logger.error('Failed to handle user login', {
        error: error.message,
        params,
      });
      // Don't throw here as login should still succeed
    }
  }

  /**
   * Create Better Auth email provider configuration
   * This returns configuration that can be used in your Better Auth setup
   */
  getBetterAuthEmailConfig() {
    return {
      emailVerification: {
        sendVerificationEmail: this.sendVerificationEmail.bind(this),
        verificationEmailTemplate: {
          subject: 'Verify your Study Teddy email address',
          // The actual template is handled by our email template service
        },
      },
      passwordReset: {
        sendPasswordResetEmail: this.sendPasswordResetEmail.bind(this),
        passwordResetEmailTemplate: {
          subject: 'Reset your Study Teddy password',
          // The actual template is handled by our email template service
        },
      },
    };
  }
}
