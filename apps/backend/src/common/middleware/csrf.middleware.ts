import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { CSRFService } from '../security/csrf.service';

@Injectable()
export class CSRFMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CSRFMiddleware.name);
  private readonly excludedPaths: string[];
  private readonly enabled: boolean;

  constructor(
    private readonly csrfService: CSRFService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('CSRF_ENABLED', true);

    // Paths that should be excluded from CSRF protection
    this.excludedPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/google',
      '/api/auth/refresh',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/health',
      '/api/docs',
      '/api/webhook', // For external webhooks
    ];
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip if CSRF protection is disabled
    if (!this.enabled) {
      return next();
    }

    // Skip for excluded paths
    if (this.isExcludedPath(req.path)) {
      return next();
    }

    try {
      // For GET requests, generate and set CSRF token
      if (req.method === 'GET' || req.method === 'HEAD') {
        await this.handleReadRequest(req, res);
        return next();
      }

      // For state-changing requests, validate CSRF token
      const validation = await this.csrfService.validateRequest(req);

      if (!validation.valid) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'CSRF validation failed',
            error: validation.reason || 'Invalid or missing CSRF token',
            timestamp: new Date().toISOString(),
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Token is valid, proceed
      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('CSRF middleware error', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'CSRF validation error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle read requests (GET/HEAD) by generating/refreshing CSRF token
   */
  private async handleReadRequest(req: Request, res: Response): Promise<void> {
    try {
      // Extract session ID
      const sessionId = this.extractSessionId(req);
      if (!sessionId) {
        return; // No session, skip token generation
      }

      // Check if token exists and is valid
      const tokenInfo = this.csrfService.getTokenInfo(sessionId);

      let token: string;
      if (!tokenInfo.exists || tokenInfo.isExpired) {
        // Generate new token
        token = this.csrfService.generateToken(sessionId);
      } else {
        // Token exists and is valid, optionally refresh it
        const shouldRefresh = this.shouldRefreshToken(tokenInfo.expiresAt!);
        if (shouldRefresh) {
          token = await this.csrfService.rotateToken(sessionId);
        } else {
          return; // Keep existing token
        }
      }

      // Set token in response
      if (token) {
        // Set as cookie for double-submit pattern
        this.csrfService.setTokenCookie(res, token);

        // Also set in response header for easy access
        res.setHeader('X-CSRF-Token', token);
      }
    } catch (error) {
      this.logger.error('Error handling CSRF token generation', error);
      // Don't fail the request, just log the error
    }
  }

  /**
   * Check if the current path is excluded from CSRF protection
   */
  private isExcludedPath(path: string): boolean {
    return this.excludedPaths.some((excludedPath) => {
      // Exact match
      if (path === excludedPath) {
        return true;
      }

      // Wildcard match (e.g., /api/public/*)
      if (excludedPath.endsWith('*')) {
        const basePath = excludedPath.slice(0, -1);
        return path.startsWith(basePath);
      }

      return false;
    });
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: Request): string | null {
    // Try to get from authenticated user
    const user = (req as any).user;
    if (user && user.userId) {
      return `user_${user.userId}`;
    }

    // Try to get from session cookie
    if (req.cookies && req.cookies['sessionId']) {
      return req.cookies['sessionId'];
    }

    // Try to get from authorization header (create a pseudo-session)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Create a deterministic session ID from the token
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
    }

    return null;
  }

  /**
   * Determine if token should be refreshed
   */
  private shouldRefreshToken(expiresAt: Date): boolean {
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const refreshThreshold = 10 * 60 * 1000; // 10 minutes

    return timeUntilExpiry < refreshThreshold;
  }
}
