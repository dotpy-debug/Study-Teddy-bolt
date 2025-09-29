import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RBACService, Permission, Role } from '../security/rbac.service';
import { SecurityLoggerService } from '../security/security-logger.service';
import { SessionSecurityService } from '../security/session-security.service';
import { MFAService } from '../security/mfa.service';

export interface SecurityGuardContext {
  requiredPermissions?: Permission[];
  requiredRoles?: Role[];
  requireMFA?: boolean;
  requireEmailVerification?: boolean;
  requireTrustedDevice?: boolean;
  allowAnonymous?: boolean;
  riskThreshold?: number;
}

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly rbacService: RBACService,
    private readonly securityLogger: SecurityLoggerService,
    private readonly sessionSecurityService: SessionSecurityService,
    private readonly mfaService: MFAService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const classTarget = context.getClass();

    try {
      // Get security requirements from decorators
      const securityContext = this.getSecurityContext(handler, classTarget);

      // Allow anonymous access if specified
      if (securityContext.allowAnonymous) {
        return true;
      }

      // Extract user information
      const user = (request as any).user;
      if (!user) {
        await this.logAuthorizationEvent('access_denied', {
          reason: 'No authenticated user',
          resource: request.path,
          action: request.method,
        });
        throw new UnauthorizedException('Authentication required');
      }

      // Check email verification requirement
      if (securityContext.requireEmailVerification && !user.emailVerified) {
        await this.logAuthorizationEvent('access_denied', {
          userId: user.id,
          reason: 'Email verification required',
          resource: request.path,
          action: request.method,
        });
        throw new ForbiddenException('Email verification required');
      }

      // Create user context for RBAC
      const userContext = this.rbacService.createUserContext({
        userId: user.id,
        email: user.email,
        roles: user.roles || ['user'],
        isEmailVerified: user.emailVerified,
        isPremium: user.isPremium,
        subscriptionExpiry: user.subscriptionExpiry,
      });

      // Check role requirements
      if (
        securityContext.requiredRoles &&
        securityContext.requiredRoles.length > 0
      ) {
        const hasRequiredRole = securityContext.requiredRoles.some((role) =>
          userContext.roles.includes(role),
        );

        if (!hasRequiredRole) {
          await this.logAuthorizationEvent('access_denied', {
            userId: user.id,
            reason: 'Insufficient role privileges',
            resource: request.path,
            action: request.method,
            requiredRoles: securityContext.requiredRoles,
            userRoles: userContext.roles,
          });
          throw new ForbiddenException('Insufficient privileges');
        }
      }

      // Check permission requirements
      if (
        securityContext.requiredPermissions &&
        securityContext.requiredPermissions.length > 0
      ) {
        for (const permission of securityContext.requiredPermissions) {
          const accessResult = this.rbacService.canAccessResource({
            user: userContext,
            action: permission,
            resource: {
              type: this.extractResourceType(request.path),
              id: request.params?.id,
              ownerId: request.params?.userId || user.id,
            },
          });

          if (!accessResult.allowed) {
            await this.logAuthorizationEvent('access_denied', {
              userId: user.id,
              reason: accessResult.reason || 'Permission denied',
              resource: request.path,
              action: request.method,
              requiredPermission: permission,
              userPermissions: userContext.permissions,
            });
            throw new ForbiddenException(
              accessResult.reason || 'Access denied',
            );
          }
        }
      }

      // Check MFA requirement
      if (securityContext.requireMFA) {
        const mfaVerified = await this.checkMFAVerification(request, user);
        if (!mfaVerified) {
          await this.logAuthorizationEvent('access_denied', {
            userId: user.id,
            reason: 'MFA verification required',
            resource: request.path,
            action: request.method,
          });
          throw new ForbiddenException('Multi-factor authentication required');
        }
      }

      // Check trusted device requirement
      if (securityContext.requireTrustedDevice) {
        const deviceTrusted = await this.checkTrustedDevice(request, user);
        if (!deviceTrusted) {
          await this.logAuthorizationEvent('access_denied', {
            userId: user.id,
            reason: 'Trusted device required',
            resource: request.path,
            action: request.method,
          });
          throw new ForbiddenException('Access from trusted device required');
        }
      }

      // Check risk threshold
      if (securityContext.riskThreshold !== undefined) {
        const riskScore = request.securityContext?.riskScore || 0;
        if (riskScore > securityContext.riskThreshold) {
          await this.logAuthorizationEvent('access_denied', {
            userId: user.id,
            reason: 'Risk threshold exceeded',
            resource: request.path,
            action: request.method,
            riskScore,
            threshold: securityContext.riskThreshold,
          });
          throw new ForbiddenException('Access denied due to security risk');
        }
      }

      // Log successful authorization
      await this.logAuthorizationEvent('access_granted', {
        userId: user.id,
        resource: request.path,
        action: request.method,
        granted: true,
      });

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Log unexpected errors
      await this.securityLogger.logSecurityEvent({
        level: 'error',
        category: 'authorization',
        event: 'security_guard_error',
        description: `Security guard encountered an error: ${error.message}`,
        request: {
          method: request.method,
          url: request.path,
        },
        metadata: {
          error: error.message,
          stack: error.stack,
        },
      });

      throw new ForbiddenException('Authorization check failed');
    }
  }

  private getSecurityContext(
    handler: Function,
    classTarget: Function,
  ): SecurityGuardContext {
    const handlerContext =
      this.reflector.get<SecurityGuardContext>('security', handler) || {};
    const classContext =
      this.reflector.get<SecurityGuardContext>('security', classTarget) || {};

    // Merge class and handler contexts (handler takes precedence)
    return {
      ...classContext,
      ...handlerContext,
      requiredPermissions: [
        ...(classContext.requiredPermissions || []),
        ...(handlerContext.requiredPermissions || []),
      ],
      requiredRoles: [
        ...(classContext.requiredRoles || []),
        ...(handlerContext.requiredRoles || []),
      ],
    };
  }

  private extractResourceType(path: string): string {
    // Extract resource type from path (e.g., /api/users -> users)
    const pathParts = path.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[1]; // Assume /api/{resource}
    }
    return 'unknown';
  }

  private async checkMFAVerification(
    request: Request,
    user: any,
  ): Promise<boolean> {
    // Check if MFA is enabled for the user
    if (!user.mfaEnabled) {
      return true; // MFA not enabled, so verification not required
    }

    // Check for MFA verification in session or recent verification
    const sessionData = request.headers['x-session-id'];
    if (sessionData) {
      // Verify that MFA was completed for this session
      // This would be tracked in the session security service
      const session = await this.sessionSecurityService.validateSession(
        sessionData as string,
      );
      return session.session?.metadata?.mfaVerified === true;
    }

    return false;
  }

  private async checkTrustedDevice(
    request: Request,
    user: any,
  ): Promise<boolean> {
    const deviceFingerprint = request.securityContext?.deviceFingerprint;
    if (!deviceFingerprint) {
      return false;
    }

    return await this.mfaService.isDeviceTrusted(user.id, deviceFingerprint);
  }

  private async logAuthorizationEvent(
    event: string,
    details: {
      userId?: string;
      resource?: string;
      action?: string;
      granted?: boolean;
      reason?: string;
      requiredPermission?: Permission;
      userPermissions?: Permission[];
      requiredRoles?: Role[];
      userRoles?: Role[];
      riskScore?: number;
      threshold?: number;
    },
  ): Promise<void> {
    await this.securityLogger.logAuthorizationEvent(event as any, details);
  }
}

// Security decorators
export const Security = (context: SecurityGuardContext) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey) {
      // Method decorator
      Reflect.defineMetadata('security', context, descriptor!.value);
    } else {
      // Class decorator
      Reflect.defineMetadata('security', context, target);
    }
  };
};

export const RequirePermissions = (...permissions: Permission[]) =>
  Security({ requiredPermissions: permissions });

export const RequireRoles = (...roles: Role[]) =>
  Security({ requiredRoles: roles });

export const RequireMFA = () => Security({ requireMFA: true });

export const RequireEmailVerification = () =>
  Security({ requireEmailVerification: true });

export const RequireTrustedDevice = () =>
  Security({ requireTrustedDevice: true });

export const AllowAnonymous = () => Security({ allowAnonymous: true });

export const RiskThreshold = (threshold: number) =>
  Security({ riskThreshold: threshold });

export const AdminOnly = () =>
  Security({
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    requireEmailVerification: true,
  });

export const ModeratorOnly = () =>
  Security({
    requiredRoles: [Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN],
    requireEmailVerification: true,
  });

export const PremiumOnly = () =>
  Security({
    requiredRoles: [Role.PREMIUM, Role.ADMIN, Role.SUPER_ADMIN],
    requireEmailVerification: true,
  });

export const HighSecurity = () =>
  Security({
    requireMFA: true,
    requireEmailVerification: true,
    requireTrustedDevice: true,
    riskThreshold: 25,
  });

export const CriticalOperation = () =>
  Security({
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    requireMFA: true,
    requireEmailVerification: true,
    requireTrustedDevice: true,
    riskThreshold: 10,
  });
