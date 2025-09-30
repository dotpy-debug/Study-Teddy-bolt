import { Injectable, Logger } from '@nestjs/common';
import { auth } from '../../lib/better-auth';
import { Request } from 'express';

export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class BetterAuthService {
  private readonly logger = new Logger(BetterAuthService.name);

  /**
   * Validate session from request cookies or headers
   */
  async validateSession(
    request: Request,
  ): Promise<{ user: BetterAuthUser; session: BetterAuthSession } | null> {
    try {
      // Extract cookies from request
      const cookies = request.cookies || {};

      // Get the session token from cookies
      const sessionToken = cookies['studyteddy-auth.session-token'];

      if (!sessionToken) {
        this.logger.debug('No session token found in cookies');
        return null;
      }

      // Validate session using Better Auth
      const result = await auth.api.getSession({
        headers: {
          cookie: `studyteddy-auth.session-token=${sessionToken}`,
        },
      });

      if (!result || !result.session || !result.user) {
        this.logger.debug('Invalid session or user not found');
        return null;
      }

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          emailVerified: result.user.emailVerified,
          image: result.user.image,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
        },
        session: {
          id: result.session.id,
          userId: result.session.userId,
          expiresAt: result.session.expiresAt,
          token: result.session.token,
          createdAt: result.session.createdAt,
          updatedAt: result.session.updatedAt,
          ipAddress: result.session.ipAddress,
          userAgent: result.session.userAgent,
        },
      };
    } catch (error) {
      this.logger.error('Failed to validate Better Auth session:', error);
      return null;
    }
  }

  /**
   * Get user by session token
   */
  async getUserFromSession(sessionToken: string): Promise<BetterAuthUser | null> {
    try {
      const result = await auth.api.getSession({
        headers: {
          cookie: `studyteddy-auth.session-token=${sessionToken}`,
        },
      });

      if (!result || !result.user) {
        return null;
      }

      return {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        emailVerified: result.user.emailVerified,
        image: result.user.image,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to get user from session:', error);
      return null;
    }
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionToken: string): Promise<boolean> {
    try {
      await auth.api.signOut({
        headers: {
          cookie: `studyteddy-auth.session-token=${sessionToken}`,
        },
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to revoke session:', error);
      return false;
    }
  }

  /**
   * Create a new session (for internal use)
   */
  async createSession(userId: string, request: Request): Promise<BetterAuthSession | null> {
    try {
      // This would typically be handled by Better Auth directly
      // but we might need it for service-to-service authentication
      const result = await auth.api.signIn.email({
        body: {
          email: '', // This would need to be implemented differently
          password: '',
        },
        headers: {
          'user-agent': request.headers['user-agent'] || '',
          'x-forwarded-for': request.ip || '',
        },
      });

      // This is a placeholder - Better Auth handles session creation
      // during the actual authentication flow
      return null;
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<BetterAuthSession[]> {
    try {
      // Better Auth doesn't expose this directly, but we can query the database
      // This would need to be implemented using the database directly
      return [];
    } catch (error) {
      this.logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionId: string, metadata: Partial<BetterAuthSession>): Promise<boolean> {
    try {
      // This would need to be implemented using the database directly
      // as Better Auth doesn't expose session update APIs
      return true;
    } catch (error) {
      this.logger.error('Failed to update session:', error);
      return false;
    }
  }
}
