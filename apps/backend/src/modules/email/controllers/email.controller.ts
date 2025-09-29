import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResendService } from '../resend.service';
import { EmailTrackingService } from '../services/email-tracking.service';
import { RateLimitingService } from '../services/rate-limiting.service';
import {
  EmailOptions,
  EmailScheduleOptions,
  BatchEmailOptions,
  UnsubscribeOptions,
  EmailTemplate,
  WelcomeEmailContext,
  VerificationEmailContext,
  PasswordResetContext,
  StudyReminderContext,
  TaskDeadlineContext,
  AchievementContext,
  WeeklySummaryContext,
  FocusSessionContext,
} from '../types/email.types';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly resendService: ResendService,
    private readonly trackingService: EmailTrackingService,
    private readonly rateLimitingService: RateLimitingService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a single email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendEmail(@Body() emailOptions: EmailOptions) {
    try {
      const result = await this.resendService.sendEmail(emailOptions);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('send/batch')
  @ApiOperation({ summary: 'Send multiple emails in batch' })
  @ApiResponse({ status: 200, description: 'Batch emails sent successfully' })
  async sendBatchEmails(@Body() emails: BatchEmailOptions[]) {
    try {
      const results = await this.resendService.sendBatchEmails(emails);
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        success: true,
        data: {
          total: results.length,
          successful,
          failed,
          results,
        },
      };
    } catch (error) {
      this.logger.error('Failed to send batch emails', error);
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule an email for future delivery' })
  @ApiResponse({ status: 200, description: 'Email scheduled successfully' })
  async scheduleEmail(@Body() emailOptions: EmailScheduleOptions) {
    try {
      const result = await this.resendService.scheduleEmail(emailOptions);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to schedule email', error);
      throw new HttpException(
        {
          success: false,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Specialized email endpoints
  @Post('welcome')
  @ApiOperation({ summary: 'Send welcome email' })
  async sendWelcomeEmail(
    @Body() data: { email: string; context: WelcomeEmailContext },
  ) {
    try {
      const result = await this.resendService.sendWelcomeEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Send email verification' })
  async sendVerificationEmail(
    @Body() data: { email: string; context: VerificationEmailContext },
  ) {
    try {
      const result = await this.resendService.sendVerificationEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('password-reset')
  @ApiOperation({ summary: 'Send password reset email' })
  async sendPasswordResetEmail(
    @Body() data: { email: string; context: PasswordResetContext },
  ) {
    try {
      const result = await this.resendService.sendPasswordResetEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('study-reminder')
  @ApiOperation({ summary: 'Send study reminder email' })
  async sendStudyReminderEmail(
    @Body() data: { email: string; context: StudyReminderContext },
  ) {
    try {
      const result = await this.resendService.sendStudyReminderEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('task-deadline')
  @ApiOperation({ summary: 'Send task deadline notification' })
  async sendTaskDeadlineEmail(
    @Body() data: { email: string; context: TaskDeadlineContext },
  ) {
    try {
      const result = await this.resendService.sendTaskDeadlineEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('achievement')
  @ApiOperation({ summary: 'Send achievement notification' })
  async sendAchievementEmail(
    @Body() data: { email: string; context: AchievementContext },
  ) {
    try {
      const result = await this.resendService.sendAchievementEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('weekly-summary')
  @ApiOperation({ summary: 'Send weekly summary email' })
  async sendWeeklySummaryEmail(
    @Body() data: { email: string; context: WeeklySummaryContext },
  ) {
    try {
      const result = await this.resendService.sendWeeklySummaryEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('focus-session')
  @ApiOperation({ summary: 'Send focus session summary email' })
  async sendFocusSessionEmail(
    @Body() data: { email: string; context: FocusSessionContext },
  ) {
    try {
      const result = await this.resendService.sendFocusSessionSummaryEmail(
        data.email,
        data.context,
      );
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Tracking endpoints
  @Get('track/open')
  @ApiOperation({ summary: 'Track email open (pixel endpoint)' })
  async trackEmailOpen(@Query('id') trackingId: string) {
    try {
      // Decode tracking ID and extract email info
      const decodedData = Buffer.from(trackingId, 'base64url').toString();
      const [email] = decodedData.split(':');

      await this.trackingService.trackEmailOpened(trackingId);

      // Return 1x1 transparent pixel
      return {
        success: true,
        pixel:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      };
    } catch (error) {
      this.logger.error('Failed to track email open', error);
      return { success: false };
    }
  }

  @Get('track/click')
  @ApiOperation({ summary: 'Track email click and redirect' })
  async trackEmailClick(
    @Query('id') emailId: string,
    @Query('url') url: string,
  ) {
    try {
      await this.trackingService.trackEmailClicked(emailId, url);

      return {
        success: true,
        redirectUrl: url,
      };
    } catch (error) {
      this.logger.error('Failed to track email click', error);
      return {
        success: false,
        redirectUrl: url,
      };
    }
  }

  @Get('tracking/:emailId')
  @ApiOperation({ summary: 'Get email tracking data' })
  async getEmailTracking(@Param('emailId') emailId: string) {
    try {
      const trackingData = await this.resendService.getEmailTracking(emailId);
      return {
        success: true,
        data: trackingData,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  // Unsubscribe endpoint
  @Post('unsubscribe')
  @ApiOperation({ summary: 'Handle unsubscribe request' })
  async handleUnsubscribe(@Body() options: UnsubscribeOptions) {
    try {
      const result = await this.resendService.handleUnsubscribe(options);
      return {
        success: result,
        message: result ? 'Successfully unsubscribed' : 'Failed to unsubscribe',
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Statistics and monitoring endpoints
  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics' })
  async getEmailStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stats = await this.resendService.getEmailStats(start, end);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('rate-limit/:email')
  @ApiOperation({ summary: 'Get rate limit status for email' })
  async getRateLimitStatus(@Param('email') email: string) {
    try {
      const status = await this.rateLimitingService.getRateLimitStatus(email);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get domain verification status' })
  async getDomainStatus(@Param('domain') domain: string) {
    try {
      const status =
        await this.resendService.getDomainVerificationStatus(domain);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Test endpoint
  @Post('test')
  @ApiOperation({ summary: 'Test email configuration' })
  async testEmailConfiguration(@Body() data: { email: string }) {
    try {
      const result = await this.resendService.testEmailConfiguration(
        data.email,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
