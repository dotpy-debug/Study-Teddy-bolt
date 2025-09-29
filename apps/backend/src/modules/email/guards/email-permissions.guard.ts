import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export enum EmailPermission {
  SEND_EMAIL = 'email:send',
  SEND_BATCH = 'email:send_batch',
  SCHEDULE_EMAIL = 'email:schedule',
  VIEW_ANALYTICS = 'email:analytics',
  MANAGE_TEMPLATES = 'email:templates',
  ADMIN_ACCESS = 'email:admin',
}

export const RequireEmailPermissions = (...permissions: EmailPermission[]) =>
  Reflect.metadata('emailPermissions', permissions);

@Injectable()
export class EmailPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(EmailPermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.get<EmailPermission[]>(
        'emailPermissions',
        context.getHandler(),
      ) ||
      this.reflector.get<EmailPermission[]>(
        'emailPermissions',
        context.getClass(),
      );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;

    if (!user) {
      this.logger.warn('No user found in request for email permissions check');
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has required permissions
    const hasPermission = await this.checkUserPermissions(
      user,
      requiredPermissions,
    );

    if (!hasPermission) {
      this.logger.warn(`User ${user.id} lacks required email permissions`, {
        userId: user.id,
        requiredPermissions,
        userPermissions: user.permissions || [],
      });

      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    this.logger.debug(`Email permissions check passed for user ${user.id}`, {
      requiredPermissions,
    });

    return true;
  }

  private async checkUserPermissions(
    user: any,
    requiredPermissions: EmailPermission[],
  ): Promise<boolean> {
    // Get user permissions (this would typically come from a database or JWT token)
    const userPermissions = this.getUserPermissions(user);

    // Check if user has admin access (bypasses all checks)
    if (userPermissions.includes(EmailPermission.ADMIN_ACCESS)) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  private getUserPermissions(user: any): EmailPermission[] {
    // In a real application, this would fetch permissions from database
    // For now, derive permissions from user role
    const role = user.role || 'user';
    const permissions: EmailPermission[] = [];

    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
        // Admins get all permissions
        permissions.push(
          EmailPermission.SEND_EMAIL,
          EmailPermission.SEND_BATCH,
          EmailPermission.SCHEDULE_EMAIL,
          EmailPermission.VIEW_ANALYTICS,
          EmailPermission.MANAGE_TEMPLATES,
          EmailPermission.ADMIN_ACCESS,
        );
        break;

      case 'teacher':
      case 'instructor':
        // Teachers can send emails and view analytics
        permissions.push(
          EmailPermission.SEND_EMAIL,
          EmailPermission.SEND_BATCH,
          EmailPermission.SCHEDULE_EMAIL,
          EmailPermission.VIEW_ANALYTICS,
        );
        break;

      case 'premium_user':
        // Premium users can send emails and schedule
        permissions.push(
          EmailPermission.SEND_EMAIL,
          EmailPermission.SCHEDULE_EMAIL,
        );
        break;

      case 'user':
      default:
        // Regular users can only send basic emails
        permissions.push(EmailPermission.SEND_EMAIL);
        break;
    }

    // Add any additional permissions from user object
    if (user.permissions && Array.isArray(user.permissions)) {
      permissions.push(
        ...user.permissions.filter((p) =>
          Object.values(EmailPermission).includes(p),
        ),
      );
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  /**
   * Check if user can send to specific recipient
   */
  async canSendToRecipient(
    user: any,
    recipientEmail: string,
  ): Promise<boolean> {
    // Prevent users from sending emails to unauthorized recipients

    // Admins can send to anyone
    const userPermissions = this.getUserPermissions(user);
    if (userPermissions.includes(EmailPermission.ADMIN_ACCESS)) {
      return true;
    }

    // Check if recipient is in user's allowed list (would be database lookup)
    // For now, implement basic validation

    // Prevent sending to system/admin emails unless user is admin
    const systemEmails = [
      'admin@studyteddy.com',
      'system@studyteddy.com',
      'noreply@studyteddy.com',
    ];

    if (systemEmails.includes(recipientEmail.toLowerCase())) {
      return userPermissions.includes(EmailPermission.ADMIN_ACCESS);
    }

    // Check if user can send to external domains (might be restricted)
    const recipientDomain = recipientEmail.split('@')[1];
    const allowedDomains = this.getAllowedDomains(user);

    if (
      allowedDomains.length > 0 &&
      !allowedDomains.includes(recipientDomain)
    ) {
      return false;
    }

    return true;
  }

  private getAllowedDomains(user: any): string[] {
    // In a real application, this would come from configuration or database
    // For now, return empty array (no domain restrictions)
    return [];
  }

  /**
   * Check batch email limits based on user role
   */
  getBatchEmailLimit(user: any): number {
    const role = user.role || 'user';

    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
        return 10000; // No practical limit for admins

      case 'teacher':
      case 'instructor':
        return 1000; // Teachers can send to their classes

      case 'premium_user':
        return 100; // Premium users get higher limits

      case 'user':
      default:
        return 10; // Regular users have low limits
    }
  }

  /**
   * Check daily email quota
   */
  async checkDailyQuota(
    user: any,
  ): Promise<{ allowed: boolean; remaining: number; total: number }> {
    const dailyLimit = this.getDailyEmailLimit(user);

    // In a real application, this would check against a database
    // For now, return mock data
    const sentToday = 0; // Would fetch from database

    return {
      allowed: sentToday < dailyLimit,
      remaining: Math.max(0, dailyLimit - sentToday),
      total: dailyLimit,
    };
  }

  private getDailyEmailLimit(user: any): number {
    const role = user.role || 'user';

    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
        return 50000; // High limit for admins

      case 'teacher':
      case 'instructor':
        return 5000; // Teachers send many emails

      case 'premium_user':
        return 500; // Premium users get more

      case 'user':
      default:
        return 50; // Conservative limit for regular users
    }
  }
}
