import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { SecurityLoggerService } from './security-logger.service';

interface CSRFToken {
  token: string;
  secret: string;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class CSRFService {
  private readonly logger = new Logger(CSRFService.name);
  private readonly tokenStore = new Map<string, CSRFToken>();
  private readonly secretLength = 32;
  private readonly tokenLength = 32;
  private readonly tokenTTL: number;
  private readonly cookieName: string;
  private readonly headerName: string;
  private readonly doubleSubmitCookie: boolean;
  private readonly sameSitePolicy: 'strict' | 'lax' | 'none';

  constructor(
    private readonly configService: ConfigService,
    private readonly securityLogger: SecurityLoggerService,
  ) {
    this.tokenTTL = this.configService.get<number>('CSRF_TOKEN_TTL', 3600000); // 1 hour default
    this.cookieName = this.configService.get<string>('CSRF_COOKIE_NAME', 'XSRF-TOKEN');
    this.headerName = this.configService.get<string>('CSRF_HEADER_NAME', 'X-XSRF-TOKEN');
    this.doubleSubmitCookie = this.configService.get<boolean>('CSRF_DOUBLE_SUBMIT', true);
    this.sameSitePolicy = this.configService.get<'strict' | 'lax' | 'none'>(
      'CSRF_SAME_SITE',
      'strict',
    );

    // Clean up expired tokens periodically
    setInterval(() => this.cleanupExpiredTokens(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Generate a new CSRF token for a session
   */
  generateToken(sessionId: string): string {
    try {
      // Generate secure random values
      const secret = crypto.randomBytes(this.secretLength).toString('hex');
      const token = crypto.randomBytes(this.tokenLength).toString('hex');

      // Create a hash of the token with the secret
      const hashedToken = this.createTokenHash(token, secret);

      // Store the token
      const tokenData: CSRFToken = {
        token: hashedToken,
        secret,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.tokenTTL),
      };

      this.tokenStore.set(sessionId, tokenData);

      // Log token generation
      this.securityLogger.logSecurityEvent({
        level: 'debug',
        category: 'authentication',
        event: 'csrf_token_generated',
        description: 'CSRF token generated for session',
        metadata: {
          sessionId,
          expiresAt: tokenData.expiresAt,
        },
      });

      return token;
    } catch (error) {
      this.logger.error('Failed to generate CSRF token', error);
      throw new Error('CSRF token generation failed');
    }
  }

  /**
   * Validate a CSRF token
   */
  async validateToken(
    sessionId: string,
    providedToken: string,
    req?: Request,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Get stored token data
      const tokenData = this.tokenStore.get(sessionId);

      if (!tokenData) {
        await this.logValidationFailure('missing_token', sessionId, req);
        return { valid: false, reason: 'No CSRF token found for session' };
      }

      // Check if token has expired
      if (new Date() > tokenData.expiresAt) {
        this.tokenStore.delete(sessionId);
        await this.logValidationFailure('expired_token', sessionId, req);
        return { valid: false, reason: 'CSRF token has expired' };
      }

      // Validate the token
      const hashedProvidedToken = this.createTokenHash(providedToken, tokenData.secret);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(tokenData.token),
        Buffer.from(hashedProvidedToken),
      );

      if (!isValid) {
        await this.logValidationFailure('invalid_token', sessionId, req);
        return { valid: false, reason: 'Invalid CSRF token' };
      }

      // Token is valid
      await this.logValidationSuccess(sessionId, req);
      return { valid: true };
    } catch (error) {
      this.logger.error('CSRF token validation error', error);
      await this.logValidationFailure('validation_error', sessionId, req);
      return { valid: false, reason: 'Token validation error' };
    }
  }

  /**
   * Set CSRF token in response (for double-submit cookie pattern)
   */
  setTokenCookie(res: Response, token: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(this.cookieName, token, {
      httpOnly: false, // Must be false for JavaScript access in double-submit pattern
      secure: isProduction,
      sameSite: this.sameSitePolicy,
      maxAge: this.tokenTTL,
      path: '/',
    });
  }

  /**
   * Extract CSRF token from request
   */
  extractToken(req: Request): string | null {
    // Check header first (preferred)
    let token = req.headers[this.headerName.toLowerCase()] as string;

    if (token) {
      return token;
    }

    // Check custom header variations
    const headerVariations = ['x-csrf-token', 'x-xsrf-token', 'csrf-token', 'xsrf-token'];

    for (const header of headerVariations) {
      token = req.headers[header] as string;
      if (token) {
        return token;
      }
    }

    // Check request body
    if (req.body) {
      token = req.body._csrf || req.body.csrf || req.body.csrfToken;
      if (token) {
        return token;
      }
    }

    // Check query parameters (least preferred)
    if (req.query) {
      token = (req.query._csrf as string) || (req.query.csrf as string);
      if (token) {
        return token;
      }
    }

    // For double-submit cookie pattern, check cookie
    if (this.doubleSubmitCookie && req.cookies) {
      token = req.cookies[this.cookieName];
      if (token) {
        return token;
      }
    }

    return null;
  }

  /**
   * Validate request with CSRF protection
   */
  async validateRequest(req: Request): Promise<{ valid: boolean; reason?: string }> {
    // Skip CSRF check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return { valid: true };
    }

    // Extract session ID (adjust based on your session implementation)
    const sessionId = this.extractSessionId(req);
    if (!sessionId) {
      await this.logValidationFailure('no_session', 'unknown', req);
      return { valid: false, reason: 'No session found' };
    }

    // Extract token from request
    const token = this.extractToken(req);
    if (!token) {
      await this.logValidationFailure('no_token_in_request', sessionId, req);
      return { valid: false, reason: 'CSRF token not provided' };
    }

    // Validate the token
    return this.validateToken(sessionId, token, req);
  }

  /**
   * Rotate CSRF token (generate new one and invalidate old)
   */
  async rotateToken(sessionId: string): Promise<string> {
    // Delete old token
    this.tokenStore.delete(sessionId);

    // Generate new token
    const newToken = this.generateToken(sessionId);

    // Log rotation
    await this.securityLogger.logSecurityEvent({
      level: 'info',
      category: 'authentication',
      event: 'csrf_token_rotated',
      description: 'CSRF token rotated for session',
      metadata: {
        sessionId,
      },
    });

    return newToken;
  }

  /**
   * Invalidate CSRF token for a session
   */
  invalidateToken(sessionId: string): void {
    this.tokenStore.delete(sessionId);
    this.logger.debug(`CSRF token invalidated for session: ${sessionId}`);
  }

  /**
   * Get token info (for debugging/monitoring)
   */
  getTokenInfo(sessionId: string): {
    exists: boolean;
    expiresAt?: Date;
    isExpired?: boolean;
  } {
    const tokenData = this.tokenStore.get(sessionId);

    if (!tokenData) {
      return { exists: false };
    }

    return {
      exists: true,
      expiresAt: tokenData.expiresAt,
      isExpired: new Date() > tokenData.expiresAt,
    };
  }

  /**
   * Create a hash of the token with the secret
   */
  private createTokenHash(token: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: Request): string | null {
    // Try to get from JWT/session (adjust based on your auth implementation)
    const user = (req as any).user;
    if (user && user.userId) {
      return `user_${user.userId}`;
    }

    // Try to get from session cookie
    if (req.cookies && req.cookies['sessionId']) {
      return req.cookies['sessionId'];
    }

    // Try to get from authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Create a session ID from the auth token (simplified)
      return crypto.createHash('sha256').update(authHeader).digest('hex').substring(0, 16);
    }

    return null;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, tokenData] of this.tokenStore.entries()) {
      if (now > tokenData.expiresAt) {
        this.tokenStore.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired CSRF tokens`);
    }
  }

  /**
   * Log validation failure
   */
  private async logValidationFailure(
    reason: string,
    sessionId: string,
    req?: Request,
  ): Promise<void> {
    await this.securityLogger.logSecurityEvent({
      level: 'warn',
      category: 'authentication',
      event: 'csrf_validation_failed',
      description: `CSRF validation failed: ${reason}`,
      user: req
        ? {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }
        : undefined,
      request: req
        ? {
            method: req.method,
            url: req.url,
          }
        : undefined,
      metadata: {
        sessionId,
        reason,
      },
    });
  }

  /**
   * Log validation success
   */
  private async logValidationSuccess(sessionId: string, req?: Request): Promise<void> {
    await this.securityLogger.logSecurityEvent({
      level: 'debug',
      category: 'authentication',
      event: 'csrf_validation_success',
      description: 'CSRF validation successful',
      metadata: {
        sessionId,
        method: req?.method,
        path: req?.path,
      },
    });
  }

  /**
   * Get statistics about CSRF tokens
   */
  getStatistics(): {
    totalTokens: number;
    expiredTokens: number;
    activeTokens: number;
  } {
    const now = new Date();
    let expired = 0;
    let active = 0;

    for (const tokenData of this.tokenStore.values()) {
      if (now > tokenData.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      totalTokens: this.tokenStore.size,
      expiredTokens: expired,
      activeTokens: active,
    };
  }
}
