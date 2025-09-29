import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RedisService } from '../../modules/redis/redis.service';

export interface SessionData {
  id: string;
  userId: string;
  deviceId?: string;
  deviceFingerprint?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  active: boolean;
  metadata?: {
    location?: string;
    loginMethod?: 'password' | 'oauth' | 'mfa';
    riskScore?: number;
    trustedDevice?: boolean;
    mfaVerified?: boolean;
  };
}

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  trusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
  active: boolean;
}

export interface SessionSecurityConfig {
  maxSessionsPerUser: number;
  sessionTimeout: number; // minutes
  inactivityTimeout: number; // minutes
  deviceTrackingEnabled: boolean;
  geoLocationTracking: boolean;
  requireTrustedDevice: boolean;
  sessionExtensionThreshold: number; // percentage of session lifetime
  concurrentSessionLimit: number;
  enableSuspiciousActivityDetection: boolean;
}

@Injectable()
export class SessionSecurityService {
  private readonly logger = new Logger(SessionSecurityService.name);
  private readonly config: SessionSecurityConfig;
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {
    this.config = {
      maxSessionsPerUser: this.configService.get<number>(
        'MAX_SESSIONS_PER_USER',
        5,
      ),
      sessionTimeout: this.configService.get<number>(
        'SESSION_TIMEOUT_MINUTES',
        60,
      ),
      inactivityTimeout: this.configService.get<number>(
        'INACTIVITY_TIMEOUT_MINUTES',
        30,
      ),
      deviceTrackingEnabled: this.configService.get<boolean>(
        'DEVICE_TRACKING_ENABLED',
        true,
      ),
      geoLocationTracking: this.configService.get<boolean>(
        'GEO_LOCATION_TRACKING',
        false,
      ),
      requireTrustedDevice: this.configService.get<boolean>(
        'REQUIRE_TRUSTED_DEVICE',
        false,
      ),
      sessionExtensionThreshold: this.configService.get<number>(
        'SESSION_EXTENSION_THRESHOLD',
        50,
      ),
      concurrentSessionLimit: this.configService.get<number>(
        'CONCURRENT_SESSION_LIMIT',
        3,
      ),
      enableSuspiciousActivityDetection: this.configService.get<boolean>(
        'ENABLE_SUSPICIOUS_ACTIVITY_DETECTION',
        true,
      ),
    };

    // Initialize encryption key for session data
    const encryptionKeyStr = this.configService.get<string>(
      'SESSION_ENCRYPTION_KEY',
    );
    this.encryptionKey = encryptionKeyStr
      ? Buffer.from(encryptionKeyStr, 'hex')
      : crypto.scryptSync('session-key', 'salt', 32);
  }

  /**
   * Create a new secure session
   */
  async createSession(sessionData: Partial<SessionData>): Promise<{
    sessionId: string;
    token: string;
    expiresAt: Date;
  }> {
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.sessionTimeout * 60 * 1000,
    );

    const session: SessionData = {
      id: sessionId,
      userId: sessionData.userId!,
      deviceId: sessionData.deviceId,
      deviceFingerprint: sessionData.deviceFingerprint,
      ipAddress: sessionData.ipAddress!,
      userAgent: sessionData.userAgent!,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      active: true,
      metadata: sessionData.metadata || {},
    };

    // Check session limits
    await this.enforceSessionLimits(session.userId);

    // Store session in Redis with TTL
    const sessionKey = this.getSessionKey(sessionId);
    const encryptedSession = this.encryptSessionData(session);

    const ttl = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    await this.redisService.setex(sessionKey, ttl, encryptedSession);

    // Track device if enabled
    if (this.config.deviceTrackingEnabled && session.deviceFingerprint) {
      await this.trackDevice(
        session.userId,
        session.deviceFingerprint,
        session,
      );
    }

    // Generate JWT token
    const token = this.generateSessionToken(sessionId, session.userId);

    this.logger.log('Session created', {
      sessionId,
      userId: session.userId,
      ipAddress: session.ipAddress,
      deviceId: session.deviceId,
    });

    return { sessionId, token, expiresAt };
  }

  /**
   * Validate and refresh session
   */
  async validateSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    isValid: boolean;
    session?: SessionData;
    shouldExtend?: boolean;
    reasons?: string[];
  }> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const encryptedSession = await this.redisService.get(sessionKey);

      if (!encryptedSession) {
        return {
          isValid: false,
          reasons: ['Session not found or expired'],
        };
      }

      const session = this.decryptSessionData(encryptedSession);

      // Validate session data
      const validation = this.validateSessionData(
        session,
        ipAddress,
        userAgent,
      );
      if (!validation.isValid) {
        await this.invalidateSession(sessionId);
        return validation;
      }

      // Check if session should be extended
      const shouldExtend = this.shouldExtendSession(session);

      // Update last activity
      session.lastActivity = new Date();

      // Re-encrypt and store updated session
      const updatedEncryptedSession = this.encryptSessionData(session);
      const remainingTtl = await this.redisService.ttl(sessionKey);
      await this.redisService.setex(
        sessionKey,
        remainingTtl,
        updatedEncryptedSession,
      );

      return {
        isValid: true,
        session,
        shouldExtend,
      };
    } catch (error) {
      this.logger.error('Session validation failed', {
        sessionId,
        error: error.message,
      });

      return {
        isValid: false,
        reasons: ['Session validation error'],
      };
    }
  }

  /**
   * Extend session lifetime
   */
  async extendSession(sessionId: string): Promise<{
    success: boolean;
    newExpiresAt?: Date;
  }> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const encryptedSession = await this.redisService.get(sessionKey);

      if (!encryptedSession) {
        return { success: false };
      }

      const session = this.decryptSessionData(encryptedSession);
      const now = new Date();
      const newExpiresAt = new Date(
        now.getTime() + this.config.sessionTimeout * 60 * 1000,
      );

      session.expiresAt = newExpiresAt;
      session.lastActivity = now;

      const updatedEncryptedSession = this.encryptSessionData(session);
      const newTtl = Math.floor(
        (newExpiresAt.getTime() - now.getTime()) / 1000,
      );

      await this.redisService.setex(
        sessionKey,
        newTtl,
        updatedEncryptedSession,
      );

      this.logger.log('Session extended', {
        sessionId,
        userId: session.userId,
        newExpiresAt,
      });

      return {
        success: true,
        newExpiresAt,
      };
    } catch (error) {
      this.logger.error('Session extension failed', {
        sessionId,
        error: error.message,
      });

      return { success: false };
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const encryptedSession = await this.redisService.get(sessionKey);

      if (encryptedSession) {
        const session = this.decryptSessionData(encryptedSession);

        this.logger.log('Session invalidated', {
          sessionId,
          userId: session.userId,
        });
      }

      await this.redisService.del(sessionKey);
    } catch (error) {
      this.logger.error('Session invalidation failed', {
        sessionId,
        error: error.message,
      });
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(
    userId: string,
    excludeSessionId?: string,
  ): Promise<number> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redisService.smembers(userSessionsKey);

      let invalidatedCount = 0;

      for (const sessionId of sessionIds) {
        if (excludeSessionId && sessionId === excludeSessionId) {
          continue;
        }

        await this.invalidateSession(sessionId);
        await this.redisService.srem(userSessionsKey, sessionId);
        invalidatedCount++;
      }

      this.logger.log('All user sessions invalidated', {
        userId,
        invalidatedCount,
        excludedSession: excludeSessionId,
      });

      return invalidatedCount;
    } catch (error) {
      this.logger.error('Failed to invalidate all user sessions', {
        userId,
        error: error.message,
      });

      return 0;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redisService.smembers(userSessionsKey);

      const sessions: SessionData[] = [];

      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(sessionId);
        const encryptedSession = await this.redisService.get(sessionKey);

        if (encryptedSession) {
          try {
            const session = this.decryptSessionData(encryptedSession);
            sessions.push(session);
          } catch (error) {
            // Clean up corrupted session
            await this.redisService.del(sessionKey);
            await this.redisService.srem(userSessionsKey, sessionId);
          }
        } else {
          // Clean up orphaned session ID
          await this.redisService.srem(userSessionsKey, sessionId);
        }
      }

      return sessions.sort(
        (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
      );
    } catch (error) {
      this.logger.error('Failed to get user sessions', {
        userId,
        error: error.message,
      });

      return [];
    }
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(sessionId: string, userId: string): string {
    const payload = {
      sessionId,
      sub: userId,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      expiresIn: `${this.config.sessionTimeout}m`,
    });
  }

  /**
   * Validate session data
   */
  private validateSessionData(
    session: SessionData,
    ipAddress?: string,
    userAgent?: string,
  ): {
    isValid: boolean;
    reasons?: string[];
  } {
    const reasons: string[] = [];

    // Check if session is active
    if (!session.active) {
      reasons.push('Session is inactive');
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      reasons.push('Session has expired');
    }

    // Check inactivity timeout
    const inactivityPeriod = Date.now() - session.lastActivity.getTime();
    const maxInactivity = this.config.inactivityTimeout * 60 * 1000;

    if (inactivityPeriod > maxInactivity) {
      reasons.push('Session inactive for too long');
    }

    // IP address validation (if provided)
    if (ipAddress && session.ipAddress !== ipAddress) {
      if (this.config.enableSuspiciousActivityDetection) {
        reasons.push('IP address mismatch detected');
      } else {
        // Log but don't invalidate session
        this.logger.warn('IP address changed', {
          sessionId: session.id,
          oldIP: session.ipAddress,
          newIP: ipAddress,
        });
      }
    }

    // User agent validation (if provided and strict mode enabled)
    if (userAgent && session.userAgent !== userAgent) {
      if (this.config.enableSuspiciousActivityDetection) {
        const similarity = this.calculateUserAgentSimilarity(
          session.userAgent,
          userAgent,
        );
        if (similarity < 0.8) {
          reasons.push('Device/browser change detected');
        }
      }
    }

    return {
      isValid: reasons.length === 0,
      reasons: reasons.length > 0 ? reasons : undefined,
    };
  }

  /**
   * Check if session should be extended
   */
  private shouldExtendSession(session: SessionData): boolean {
    const sessionLifetime =
      session.expiresAt.getTime() - session.createdAt.getTime();
    const sessionAge = Date.now() - session.createdAt.getTime();
    const thresholdPercentage = this.config.sessionExtensionThreshold / 100;

    return sessionAge > sessionLifetime * thresholdPercentage;
  }

  /**
   * Enforce session limits per user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    if (sessions.length >= this.config.maxSessionsPerUser) {
      // Sort by last activity (oldest first)
      sessions.sort(
        (a, b) => a.lastActivity.getTime() - b.lastActivity.getTime(),
      );

      // Remove oldest sessions to make room
      const sessionsToRemove =
        sessions.length - this.config.maxSessionsPerUser + 1;
      for (let i = 0; i < sessionsToRemove; i++) {
        await this.invalidateSession(sessions[i].id);
      }

      this.logger.log('Enforced session limits', {
        userId,
        removedSessions: sessionsToRemove,
        maxAllowed: this.config.maxSessionsPerUser,
      });
    }
  }

  /**
   * Track device information
   */
  private async trackDevice(
    userId: string,
    fingerprint: string,
    session: SessionData,
  ): Promise<void> {
    const deviceKey = this.getDeviceKey(userId, fingerprint);
    const existingDevice = await this.redisService.get(deviceKey);

    let device: DeviceSession;

    if (existingDevice) {
      device = JSON.parse(existingDevice);
      device.lastSeen = new Date();
      device.sessionCount++;
      device.active = true;
    } else {
      device = {
        deviceId: session.deviceId || crypto.randomUUID(),
        deviceName: this.extractDeviceName(session.userAgent),
        fingerprint,
        trusted: false,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        active: true,
      };
    }

    // Store device info with 30-day TTL
    await this.redisService.setex(
      deviceKey,
      30 * 24 * 60 * 60,
      JSON.stringify(device),
    );
  }

  /**
   * Helper methods
   */
  private generateSecureSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  private getDeviceKey(userId: string, fingerprint: string): string {
    return `device:${userId}:${fingerprint}`;
  }

  private encryptSessionData(session: SessionData): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);

    let encrypted = cipher.update(JSON.stringify(session), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptSessionData(encryptedData: string): SessionData {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const algorithm = 'aes-256-gcm';
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const session = JSON.parse(decrypted);

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.lastActivity = new Date(session.lastActivity);
    session.expiresAt = new Date(session.expiresAt);

    return session;
  }

  private calculateUserAgentSimilarity(ua1: string, ua2: string): number {
    if (!ua1 || !ua2) return 0;

    // Simple similarity calculation based on common parts
    const parts1 = ua1.toLowerCase().split(' ');
    const parts2 = ua2.toLowerCase().split(' ');

    const commonParts = parts1.filter((part) => parts2.includes(part));
    return commonParts.length / Math.max(parts1.length, parts2.length);
  }

  private extractDeviceName(userAgent: string): string {
    if (!userAgent) return 'Unknown Device';

    // Simple device name extraction
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';

    return 'Unknown Device';
  }
}
