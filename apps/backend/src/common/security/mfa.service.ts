import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import { AuthSecurityService } from './auth-security.service';
import { RedisService } from '../../modules/redis/redis.service';

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MFAVerificationResult {
  isValid: boolean;
  method: 'totp' | 'backup_code' | 'sms' | 'email';
  usedBackupCode?: number;
  remainingBackupCodes?: number;
}

export interface MFAConfig {
  issuer: string;
  appName: string;
  totpWindow: number;
  backupCodeLength: number;
  backupCodeCount: number;
  enableSMS: boolean;
  enableEmail: boolean;
  trustedDeviceDuration: number; // days
}

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceFingerprint: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  trustedAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  active: boolean;
}

export interface MFAChallenge {
  id: string;
  userId: string;
  type: 'totp' | 'sms' | 'email';
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  metadata?: any;
}

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);
  private readonly config: MFAConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly redisService: RedisService,
  ) {
    this.config = {
      issuer: this.configService.get<string>('MFA_ISSUER', 'StudyTeddy'),
      appName: this.configService.get<string>('MFA_APP_NAME', 'StudyTeddy'),
      totpWindow: this.configService.get<number>('MFA_TOTP_WINDOW', 1),
      backupCodeLength: this.configService.get<number>(
        'MFA_BACKUP_CODE_LENGTH',
        8,
      ),
      backupCodeCount: this.configService.get<number>(
        'MFA_BACKUP_CODE_COUNT',
        10,
      ),
      enableSMS: this.configService.get<boolean>('MFA_ENABLE_SMS', false),
      enableEmail: this.configService.get<boolean>('MFA_ENABLE_EMAIL', true),
      trustedDeviceDuration: this.configService.get<number>(
        'MFA_TRUSTED_DEVICE_DURATION_DAYS',
        30,
      ),
    };
  }

  /**
   * Setup TOTP-based MFA for a user
   */
  async setupTOTP(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        length: 32,
        name: `${this.config.appName} (${userEmail})`,
        issuer: this.config.issuer,
      });

      // Generate QR code URL
      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.ascii,
        label: `${this.config.appName}:${userEmail}`,
        issuer: this.config.issuer,
        encoding: 'ascii',
      });

      // Generate QR code data URL
      const qrCodeDataUrl = await qrcode.toDataURL(qrCodeUrl);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      this.logger.log('TOTP MFA setup initiated', {
        userId,
        email: userEmail,
      });

      return {
        secret: secret.base32,
        qrCodeUrl,
        qrCodeDataUrl,
        backupCodes,
        manualEntryKey: secret.base32,
      };
    } catch (error) {
      this.logger.error('TOTP MFA setup failed', {
        userId,
        error: error.message,
      });
      throw new BadRequestException('Failed to setup MFA');
    }
  }

  /**
   * Verify TOTP setup with user-provided token
   */
  async verifyTOTPSetup(
    userId: string,
    secret: string,
    token: string,
    backupCodes: string[],
  ): Promise<{
    verified: boolean;
    hashedBackupCodes: string[];
  }> {
    try {
      // Verify the provided token
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: this.config.totpWindow,
      });

      if (!isValid) {
        throw new BadRequestException('Invalid verification code');
      }

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => this.authSecurityService.hashPassword(code)),
      );

      this.logger.log('TOTP MFA setup verified', {
        userId,
      });

      return {
        verified: true,
        hashedBackupCodes,
      };
    } catch (error) {
      this.logger.error('TOTP MFA setup verification failed', {
        userId,
        error: error.message,
      });
      throw new BadRequestException('MFA setup verification failed');
    }
  }

  /**
   * Verify TOTP token
   */
  async verifyTOTP(secret: string, token: string): Promise<boolean> {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: this.config.totpWindow,
      });
    } catch (error) {
      this.logger.error('TOTP verification failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string,
    hashedCodes: string[],
  ): Promise<{
    isValid: boolean;
    usedCodeIndex: number;
  }> {
    try {
      for (let i = 0; i < hashedCodes.length; i++) {
        if (hashedCodes[i]) {
          const isValid = await this.authSecurityService.verifyPassword(
            code,
            hashedCodes[i],
          );
          if (isValid) {
            this.logger.log('Backup code used for MFA', {
              userId,
              codeIndex: i,
            });

            return {
              isValid: true,
              usedCodeIndex: i,
            };
          }
        }
      }

      return {
        isValid: false,
        usedCodeIndex: -1,
      };
    } catch (error) {
      this.logger.error('Backup code verification failed', {
        userId,
        error: error.message,
      });

      return {
        isValid: false,
        usedCodeIndex: -1,
      };
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string): Promise<{
    codes: string[];
    hashedCodes: string[];
  }> {
    try {
      const codes = this.generateBackupCodes();
      const hashedCodes = await Promise.all(
        codes.map((code) => this.authSecurityService.hashPassword(code)),
      );

      this.logger.log('New backup codes generated', {
        userId,
        codeCount: codes.length,
      });

      return { codes, hashedCodes };
    } catch (error) {
      this.logger.error('Backup code generation failed', {
        userId,
        error: error.message,
      });
      throw new BadRequestException('Failed to generate backup codes');
    }
  }

  /**
   * Create MFA challenge
   */
  async createMFAChallenge(
    userId: string,
    type: 'totp' | 'sms' | 'email',
    metadata?: any,
  ): Promise<MFAChallenge> {
    const challengeId = this.authSecurityService.generateSecureToken(16);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const challenge: MFAChallenge = {
      id: challengeId,
      userId,
      type,
      createdAt: now,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      metadata,
    };

    // Store challenge in Redis with TTL
    const challengeKey = this.getMFAChallengeKey(challengeId);
    await this.redisService.set(
      challengeKey,
      challenge,
      5 * 60, // 5 minutes
    );

    this.logger.log('MFA challenge created', {
      challengeId,
      userId,
      type,
    });

    return challenge;
  }

  /**
   * Verify MFA challenge
   */
  async verifyMFAChallenge(
    challengeId: string,
    code: string,
    mfaSecret?: string,
    backupCodes?: string[],
  ): Promise<MFAVerificationResult> {
    try {
      const challengeKey = this.getMFAChallengeKey(challengeId);
      const challengeData = await this.redisService.get(challengeKey);

      if (!challengeData) {
        throw new UnauthorizedException('Invalid or expired MFA challenge');
      }

      const challenge: MFAChallenge = challengeData as MFAChallenge;

      // Check if challenge has expired
      if (new Date() > challenge.expiresAt) {
        await this.redisService.del(challengeKey);
        throw new UnauthorizedException('MFA challenge has expired');
      }

      // Check attempt limit
      if (challenge.attempts >= challenge.maxAttempts) {
        await this.redisService.del(challengeKey);
        throw new UnauthorizedException('Maximum MFA attempts exceeded');
      }

      // Increment attempt count
      challenge.attempts++;
      await this.redisService.set(
        challengeKey,
        challenge,
        Math.floor((challenge.expiresAt.getTime() - Date.now()) / 1000),
      );

      let verificationResult: MFAVerificationResult;

      // Verify based on challenge type
      switch (challenge.type) {
        case 'totp':
          if (!mfaSecret) {
            throw new BadRequestException(
              'MFA secret is required for TOTP verification',
            );
          }

          const isValidTOTP = await this.verifyTOTP(mfaSecret, code);

          if (isValidTOTP) {
            verificationResult = {
              isValid: true,
              method: 'totp',
            };
          } else {
            // Try backup codes if TOTP fails
            if (backupCodes && backupCodes.length > 0) {
              const backupResult = await this.verifyBackupCode(
                challenge.userId,
                code,
                backupCodes,
              );
              if (backupResult.isValid) {
                verificationResult = {
                  isValid: true,
                  method: 'backup_code',
                  usedBackupCode: backupResult.usedCodeIndex,
                  remainingBackupCodes:
                    backupCodes.filter((c) => c !== null).length - 1,
                };
              } else {
                verificationResult = { isValid: false, method: 'totp' };
              }
            } else {
              verificationResult = { isValid: false, method: 'totp' };
            }
          }
          break;

        case 'sms':
        case 'email':
          // For SMS/Email, verify against stored code in challenge metadata
          const storedCode = challenge.metadata?.code;
          const isValidCode = storedCode && storedCode === code;

          verificationResult = {
            isValid: isValidCode,
            method: challenge.type,
          };
          break;

        default:
          throw new BadRequestException('Unsupported MFA challenge type');
      }

      // If verification successful, remove challenge
      if (verificationResult.isValid) {
        await this.redisService.del(challengeKey);

        this.logger.log('MFA challenge verified successfully', {
          challengeId,
          userId: challenge.userId,
          method: verificationResult.method,
        });
      } else {
        this.logger.warn('MFA challenge verification failed', {
          challengeId,
          userId: challenge.userId,
          attempts: challenge.attempts,
          method: challenge.type,
        });
      }

      return verificationResult;
    } catch (error) {
      this.logger.error('MFA challenge verification error', {
        challengeId,
        error: error.message,
      });

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('MFA verification failed');
    }
  }

  /**
   * Trust a device for MFA bypass
   */
  async trustDevice(
    userId: string,
    deviceFingerprint: string,
    deviceName: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TrustedDevice> {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.trustedDeviceDuration * 24 * 60 * 60 * 1000,
    );

    const trustedDevice: TrustedDevice = {
      id: this.authSecurityService.generateSecureToken(16),
      userId,
      deviceFingerprint,
      deviceName,
      ipAddress,
      userAgent,
      trustedAt: now,
      expiresAt,
      lastUsed: now,
      active: true,
    };

    // Store in Redis with TTL
    const deviceKey = this.getTrustedDeviceKey(userId, deviceFingerprint);
    const ttl = this.config.trustedDeviceDuration * 24 * 60 * 60; // seconds

    await this.redisService.set(deviceKey, trustedDevice, ttl);

    this.logger.log('Device trusted for MFA bypass', {
      userId,
      deviceFingerprint,
      deviceName,
      expiresAt,
    });

    return trustedDevice;
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(
    userId: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    try {
      const deviceKey = this.getTrustedDeviceKey(userId, deviceFingerprint);
      const deviceData = await this.redisService.get(deviceKey);

      if (!deviceData) {
        return false;
      }

      const device: TrustedDevice = deviceData as TrustedDevice;

      // Check if device is still active and not expired
      if (!device.active || new Date() > device.expiresAt) {
        await this.redisService.del(deviceKey);
        return false;
      }

      // Update last used timestamp
      device.lastUsed = new Date();
      const remainingTtl = await this.redisService.ttl(deviceKey);
      await this.redisService.set(deviceKey, device, remainingTtl);

      return true;
    } catch (error) {
      this.logger.error('Device trust check failed', {
        userId,
        deviceFingerprint,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(
    userId: string,
    deviceFingerprint?: string,
  ): Promise<number> {
    try {
      if (deviceFingerprint) {
        // Revoke specific device
        const deviceKey = this.getTrustedDeviceKey(userId, deviceFingerprint);
        const deleted = await this.redisService.del(deviceKey);

        this.logger.log('Device trust revoked', {
          userId,
          deviceFingerprint,
        });

        return deleted;
      } else {
        // Revoke all trusted devices for user
        const pattern = this.getTrustedDeviceKey(userId, '*');
        const keys = await this.redisService.keys(pattern);

        if (keys.length > 0) {
          const deleted = await this.redisService.del(...keys);

          this.logger.log('All device trusts revoked for user', {
            userId,
            revokedCount: deleted,
          });

          return deleted;
        }

        return 0;
      }
    } catch (error) {
      this.logger.error('Device trust revocation failed', {
        userId,
        deviceFingerprint,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get trusted devices for user
   */
  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    try {
      const pattern = this.getTrustedDeviceKey(userId, '*');
      const keys = await this.redisService.keys(pattern);

      const devices: TrustedDevice[] = [];

      for (const key of keys) {
        const deviceData = await this.redisService.get(key);
        if (deviceData) {
          try {
            const device: TrustedDevice = deviceData as TrustedDevice;
            devices.push(device);
          } catch (parseError) {
            // Clean up corrupted data
            await this.redisService.del(key);
          }
        }
      }

      return devices.sort(
        (a, b) => b.lastUsed.getTime() - a.lastUsed.getTime(),
      );
    } catch (error) {
      this.logger.error('Failed to get trusted devices', {
        userId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.config.backupCodeCount; i++) {
      const code = this.authSecurityService.generateSecureRandomString(
        this.config.backupCodeLength,
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      );
      codes.push(code);
    }

    return codes;
  }

  /**
   * Helper methods for Redis keys
   */
  private getMFAChallengeKey(challengeId: string): string {
    return `mfa_challenge:${challengeId}`;
  }

  private getTrustedDeviceKey(
    userId: string,
    deviceFingerprint: string,
  ): string {
    return `trusted_device:${userId}:${deviceFingerprint}`;
  }

  /**
   * Get MFA configuration
   */
  getMFAConfig(): MFAConfig {
    return { ...this.config };
  }

  /**
   * Disable MFA for user (admin function)
   */
  async disableMFAForUser(userId: string): Promise<void> {
    try {
      // Revoke all trusted devices
      await this.revokeDeviceTrust(userId);

      // Clean up any pending challenges
      const challengePattern = `mfa_challenge:*`;
      const challengeKeys = await this.redisService.keys(challengePattern);

      for (const key of challengeKeys) {
        const challengeData = await this.redisService.get(key);
        if (challengeData) {
          const challenge: MFAChallenge = challengeData as MFAChallenge;
          if (challenge.userId === userId) {
            await this.redisService.del(key);
          }
        }
      }

      this.logger.log('MFA disabled for user', { userId });
    } catch (error) {
      this.logger.error('Failed to disable MFA for user', {
        userId,
        error: error.message,
      });
    }
  }
}
