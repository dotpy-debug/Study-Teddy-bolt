import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Headers,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { EmailService } from './email.service';
import { EmailQueueService } from '../email-queue/email-queue.service';
import { NotificationPreferencesService } from '../email-queue/services/notification-preferences.service';
import { EmailTemplateService } from '../email-queue/services/email-template.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  EmailRateLimitGuard,
  EmailRateLimit,
} from './guards/email-rate-limit.guard';
import {
  EmailPermissionsGuard,
  RequireEmailPermissions,
  EmailPermission,
} from './guards/email-permissions.guard';
import {
  SendEmailDto,
  BatchEmailDto,
  ScheduleEmailDto,
  UpdateEmailPreferencesDto,
  HandleUnsubscribeDto,
  GenerateUnsubscribeLinkDto,
  ResubscribeDto,
  WebhookRequestDto,
  SendEmailResponseDto,
  BatchEmailResponseDto,
  EmailStatusResponseDto,
  EmailTemplateResponseDto,
  UnsubscribeResponseDto,
  WebhookResponseDto,
} from './dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailQueueService: EmailQueueService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, EmailRateLimitGuard, EmailPermissionsGuard)
  @EmailRateLimit({ maxRequests: 20, windowMs: 60 * 1000 }) // 20 emails per minute
  @RequireEmailPermissions(EmailPermission.SEND_EMAIL)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send single email',
    description:
      'Send a single email to a recipient with optional template and tracking',
  })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({
    status: 201,
    description: 'Email queued successfully',
    type: SendEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  async sendEmail(
    @CurrentUser() userId: string,
    @Body() sendEmailDto: SendEmailDto,
  ): Promise<SendEmailResponseDto> {
    try {
      this.logger.log(`Sending email to ${sendEmailDto.to} by user ${userId}`);

      // Validate template if provided
      if (sendEmailDto.template) {
        const templateExists = await this.emailTemplateService.templateExists(
          sendEmailDto.template,
        );
        if (!templateExists) {
          throw new BadRequestException(
            `Template '${sendEmailDto.template}' not found`,
          );
        }
      }

      // Queue the email
      const result = await this.emailQueueService.queueEmail({
        ...sendEmailDto,
        userId,
        priority: sendEmailDto.priority || 'normal',
        metadata: {
          ...sendEmailDto.metadata,
          sentBy: userId,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        id: result.id,
        status: 'queued',
        message: 'Email queued successfully',
        estimatedDelivery: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  @Post('send-batch')
  @UseGuards(JwtAuthGuard, EmailRateLimitGuard, EmailPermissionsGuard)
  @EmailRateLimit({ maxRequests: 5, windowMs: 60 * 1000 }) // 5 batch emails per minute
  @RequireEmailPermissions(EmailPermission.SEND_BATCH)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send batch emails',
    description:
      'Send multiple emails in a batch with personalized content for each recipient',
  })
  @ApiBody({ type: BatchEmailDto })
  @ApiResponse({
    status: 201,
    description: 'Batch emails queued successfully',
    type: BatchEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid batch email data provided',
  })
  async sendBatchEmails(
    @CurrentUser() userId: string,
    @Body() batchEmailDto: BatchEmailDto,
  ): Promise<BatchEmailResponseDto> {
    try {
      this.logger.log(
        `Sending batch emails to ${batchEmailDto.recipients.length} recipients by user ${userId}`,
      );

      // Validate template if provided
      if (batchEmailDto.template) {
        const templateExists = await this.emailTemplateService.templateExists(
          batchEmailDto.template,
        );
        if (!templateExists) {
          throw new BadRequestException(
            `Template '${batchEmailDto.template}' not found`,
          );
        }
      }

      const result = await this.emailQueueService.queueBatchEmails({
        ...batchEmailDto,
        userId,
        metadata: {
          sentBy: userId,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        batchId: result.batchId,
        totalEmails: batchEmailDto.recipients.length,
        queued: result.queued,
        failed: result.failed,
        failedEmails: result.failedEmails,
        status: 'processing',
        estimatedCompletion: new Date(
          Date.now() + batchEmailDto.recipients.length * 1000,
        ).toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send batch emails: ${error.message}`);
      throw error;
    }
  }

  @Post('schedule')
  @UseGuards(JwtAuthGuard, EmailRateLimitGuard, EmailPermissionsGuard)
  @EmailRateLimit({ maxRequests: 10, windowMs: 60 * 1000 }) // 10 scheduled emails per minute
  @RequireEmailPermissions(EmailPermission.SCHEDULE_EMAIL)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Schedule email',
    description:
      'Schedule an email to be sent at a specific time or on a recurring basis',
  })
  @ApiBody({ type: ScheduleEmailDto })
  @ApiResponse({
    status: 201,
    description: 'Email scheduled successfully',
    type: SendEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schedule data provided',
  })
  async scheduleEmail(
    @CurrentUser() userId: string,
    @Body() scheduleEmailDto: ScheduleEmailDto,
  ): Promise<SendEmailResponseDto> {
    try {
      this.logger.log(
        `Scheduling email for ${scheduleEmailDto.scheduledAt} by user ${userId}`,
      );

      // Validate scheduled time is in the future
      const scheduledTime = new Date(scheduleEmailDto.scheduledAt);
      if (scheduledTime <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }

      // Validate template if provided
      if (scheduleEmailDto.email.template) {
        const templateExists = await this.emailTemplateService.templateExists(
          scheduleEmailDto.email.template,
        );
        if (!templateExists) {
          throw new BadRequestException(
            `Template '${scheduleEmailDto.email.template}' not found`,
          );
        }
      }

      const result = await this.emailQueueService.scheduleEmail({
        ...scheduleEmailDto,
        userId,
        metadata: {
          scheduledBy: userId,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        id: result.id,
        status: 'scheduled',
        message: 'Email scheduled successfully',
        scheduledAt: scheduleEmailDto.scheduledAt,
      };
    } catch (error) {
      this.logger.error(`Failed to schedule email: ${error.message}`);
      throw error;
    }
  }

  @Get('status/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email status',
    description:
      'Get the current status and tracking information for a specific email',
  })
  @ApiParam({
    name: 'id',
    description: 'Email ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Email status retrieved successfully',
    type: EmailStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
  })
  async getEmailStatus(
    @Param('id') emailId: string,
    @CurrentUser() userId: string,
  ): Promise<EmailStatusResponseDto> {
    try {
      const status = await this.emailQueueService.getEmailStatus(
        emailId,
        userId,
      );
      if (!status) {
        throw new NotFoundException(`Email with ID ${emailId} not found`);
      }
      return status;
    } catch (error) {
      this.logger.error(`Failed to get email status: ${error.message}`);
      throw error;
    }
  }

  @Delete('cancel/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel scheduled email',
    description: 'Cancel a scheduled email before it is sent',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled email ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled email cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled email not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Email cannot be cancelled (already sent)',
  })
  @HttpCode(HttpStatus.OK)
  async cancelScheduledEmail(
    @Param('id') emailId: string,
    @CurrentUser() userId: string,
  ): Promise<{ message: string; cancelled: boolean }> {
    try {
      const result = await this.emailQueueService.cancelScheduledEmail(
        emailId,
        userId,
      );
      if (!result.found) {
        throw new NotFoundException(
          `Scheduled email with ID ${emailId} not found`,
        );
      }
      if (!result.cancelled) {
        throw new BadRequestException(
          'Email cannot be cancelled (already sent or in progress)',
        );
      }

      return {
        message: 'Scheduled email cancelled successfully',
        cancelled: true,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel scheduled email: ${error.message}`);
      throw error;
    }
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email templates',
    description: 'Retrieve all available email templates',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter templates by category',
    type: 'string',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filter by active status',
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: [EmailTemplateResponseDto],
  })
  async getTemplates(
    @Query('category') category?: string,
    @Query('active') active?: boolean,
  ): Promise<EmailTemplateResponseDto[]> {
    try {
      const templates = await this.emailTemplateService.getTemplates({
        category,
        active,
      });
      return templates;
    } catch (error) {
      this.logger.error(`Failed to get templates: ${error.message}`);
      throw error;
    }
  }

  @Post('templates/:id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Preview email template',
    description:
      'Generate a preview of an email template with provided context data',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    type: 'string',
  })
  @ApiBody({
    description: 'Template context variables',
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'object',
          description: 'Variables to substitute in template',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Template preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        htmlContent: { type: 'string' },
        textContent: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async previewTemplate(
    @Param('id') templateId: string,
    @Body() body: { context?: Record<string, any> },
  ): Promise<{ subject: string; htmlContent?: string; textContent?: string }> {
    try {
      const preview = await this.emailTemplateService.previewTemplate(
        templateId,
        body.context || {},
      );
      if (!preview) {
        throw new NotFoundException(`Template with ID ${templateId} not found`);
      }
      return preview;
    } catch (error) {
      this.logger.error(`Failed to preview template: ${error.message}`);
      throw error;
    }
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email preferences',
    description: 'Get the current email preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Email preferences retrieved successfully',
  })
  async getEmailPreferences(@CurrentUser() userId: string) {
    try {
      const preferences =
        await this.notificationPreferencesService.getEmailPreferences(userId);
      return preferences;
    } catch (error) {
      this.logger.error(`Failed to get email preferences: ${error.message}`);
      throw error;
    }
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update email preferences',
    description: 'Update email preferences for the authenticated user',
  })
  @ApiBody({ type: UpdateEmailPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Email preferences updated successfully',
  })
  async updateEmailPreferences(
    @CurrentUser() userId: string,
    @Body() updatePreferencesDto: UpdateEmailPreferencesDto,
  ) {
    try {
      const result =
        await this.notificationPreferencesService.updateEmailPreferences(
          userId,
          updatePreferencesDto,
        );
      return {
        message: 'Email preferences updated successfully',
        preferences: result,
      };
    } catch (error) {
      this.logger.error(`Failed to update email preferences: ${error.message}`);
      throw error;
    }
  }

  @Post('unsubscribe')
  @Public()
  @ApiOperation({
    summary: 'Handle unsubscribe',
    description: 'Process unsubscribe requests from email links or user action',
  })
  @ApiBody({ type: HandleUnsubscribeDto })
  @ApiResponse({
    status: 200,
    description: 'Unsubscribe processed successfully',
    type: UnsubscribeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid unsubscribe token or data',
  })
  @HttpCode(HttpStatus.OK)
  async handleUnsubscribe(
    @Body() unsubscribeDto: HandleUnsubscribeDto,
  ): Promise<UnsubscribeResponseDto> {
    try {
      const result =
        await this.notificationPreferencesService.handleUnsubscribe(
          unsubscribeDto,
        );

      this.logger.log(
        `Unsubscribe processed for ${unsubscribeDto.email || 'token-based request'}`,
      );

      return {
        message: result.message,
        type: unsubscribeDto.type,
        categories: result.categories,
        stillSubscribed: result.stillSubscribed,
        alternatives: result.alternatives,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to process unsubscribe: ${error.message}`);
      throw error;
    }
  }

  @Post('resubscribe')
  @Public()
  @ApiOperation({
    summary: 'Handle resubscribe',
    description: 'Process resubscribe requests to restore email preferences',
  })
  @ApiBody({ type: ResubscribeDto })
  @ApiResponse({
    status: 200,
    description: 'Resubscribe processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Email address not found',
  })
  @HttpCode(HttpStatus.OK)
  async handleResubscribe(
    @Body() resubscribeDto: ResubscribeDto,
  ): Promise<{ message: string; resubscribed: boolean }> {
    try {
      const result =
        await this.notificationPreferencesService.handleResubscribe(
          resubscribeDto,
        );

      this.logger.log(`Resubscribe processed for ${resubscribeDto.email}`);

      return {
        message: 'Resubscribe processed successfully',
        resubscribed: result.success,
      };
    } catch (error) {
      this.logger.error(`Failed to process resubscribe: ${error.message}`);
      throw error;
    }
  }

  @Post('unsubscribe-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate unsubscribe link',
    description: 'Generate a secure unsubscribe link for emails',
  })
  @ApiBody({ type: GenerateUnsubscribeLinkDto })
  @ApiResponse({
    status: 201,
    description: 'Unsubscribe link generated successfully',
    schema: {
      type: 'object',
      properties: {
        unsubscribeLink: { type: 'string' },
        token: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
  })
  async generateUnsubscribeLink(
    @Body() generateLinkDto: GenerateUnsubscribeLinkDto,
  ): Promise<{ unsubscribeLink: string; token: string; expiresAt: string }> {
    try {
      const result =
        await this.notificationPreferencesService.generateUnsubscribeLink(
          generateLinkDto,
        );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate unsubscribe link: ${error.message}`,
      );
      throw error;
    }
  }

  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'Webhook for email events',
    description:
      'Handle webhook events from email service providers (open, click, bounce, etc.)',
  })
  @ApiHeader({
    name: 'X-Webhook-Signature',
    description: 'Webhook signature for verification',
    required: true,
  })
  @ApiBody({ type: WebhookRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or payload',
  })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Body() webhookData: WebhookRequestDto,
    @Req() request: Request,
  ): Promise<WebhookResponseDto> {
    try {
      // Verify webhook signature
      const isValid = await this.emailQueueService.verifyWebhookSignature(
        signature,
        JSON.stringify(webhookData),
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const result = await this.emailQueueService.processWebhookEvents(
        webhookData.events,
      );

      this.logger.log(`Processed ${result.processed} webhook events`);

      return {
        status: result.failed > 0 ? 'partial' : 'success',
        processed: result.processed,
        failed: result.failed,
        errors: result.errors,
        processedAt: new Date().toISOString(),
        metadata: {
          webhookId: webhookData.webhookId,
          deliveryAttempt: webhookData.deliveryAttempt,
          processingTime: Date.now() - request['startTime'],
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`);
      throw error;
    }
  }

  @Get('analytics/summary')
  @UseGuards(JwtAuthGuard, EmailPermissionsGuard)
  @RequireEmailPermissions(EmailPermission.VIEW_ANALYTICS)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get email analytics summary',
    description: 'Get email analytics summary for the authenticated user',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include in summary (default: 30)',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalSent: { type: 'number' },
        totalDelivered: { type: 'number' },
        totalOpened: { type: 'number' },
        totalClicked: { type: 'number' },
        totalBounced: { type: 'number' },
        deliveryRate: { type: 'number' },
        openRate: { type: 'number' },
        clickRate: { type: 'number' },
        bounceRate: { type: 'number' },
      },
    },
  })
  async getAnalyticsSummary(
    @CurrentUser() userId: string,
    @Query('days') days: number = 30,
  ) {
    try {
      const analytics = await this.emailQueueService.getEmailAnalytics(
        userId,
        days,
      );
      return analytics;
    } catch (error) {
      this.logger.error(`Failed to get analytics summary: ${error.message}`);
      throw error;
    }
  }
}
