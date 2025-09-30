import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BetterAuthService, BetterAuthUser } from '../better-auth.service';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: BetterAuthUser;
    }
  }
}

@Injectable()
export class BetterAuthGuard implements CanActivate {
  private readonly logger = new Logger(BetterAuthGuard.name);

  constructor(
    private readonly betterAuthService: BetterAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Validate session using Better Auth
      const authResult = await this.betterAuthService.validateSession(request);

      if (!authResult) {
        this.logger.debug('No valid session found');
        throw new UnauthorizedException('Authentication required');
      }

      const { user, session } = authResult;

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        this.logger.debug('Session expired');
        throw new UnauthorizedException('Session expired');
      }

      // Check if email is verified (if required)
      const requireEmailVerification = this.reflector.getAllAndOverride<boolean>(
        'requireEmailVerification',
        [context.getHandler(), context.getClass()],
      );

      if (requireEmailVerification && !user.emailVerified) {
        this.logger.debug('Email verification required');
        throw new UnauthorizedException('Email verification required');
      }

      // Attach user to request object
      request.user = user;

      this.logger.debug(`User authenticated: ${user.email} (ID: ${user.id})`);
      return true;
    } catch (error) {
      this.logger.debug(`Authentication failed: ${error.message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }
}

// Decorator to mark routes as public (no authentication required)
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);

// Decorator to require email verification
export const RequireEmailVerification = () => SetMetadata('requireEmailVerification', true);
