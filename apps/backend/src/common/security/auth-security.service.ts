import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { SanitizationService } from './sanitization.service';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  forbidUserInfo: boolean;
  maxRepeatingChars: number;
  minAge: number; // hours before password can be changed again
  historyCount: number; // number of previous passwords to check
}

export interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  sessionTimeout: number; // minutes
  refreshTokenExpiry: number; // days
  totpWindow: number; // time window for TOTP verification
  requireEmailVerification: boolean;
  enableBruteForceProtection: boolean;
  enableDeviceTracking: boolean;
  enableSuspiciousActivityDetection: boolean;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
  location?: string;
  deviceFingerprint?: string;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  fingerprint: string;
  name: string;
  trusted: boolean;
  lastSeen: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  active: boolean;
}

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);
  private readonly commonPasswords = new Set([
    'password',
    '123456',
    '123456789',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
    'password1',
    'qwerty123',
    'admin123',
    'root',
    'toor',
    'pass',
    'test',
    'guest',
    'user',
    'demo',
    'sample',
    'default',
    'changeme',
    'secret',
    'login',
  ]);

  private readonly passwordPolicy: PasswordPolicy;
  private readonly securitySettings: SecuritySettings;
  private readonly loginAttempts = new Map<string, LoginAttempt[]>();
  private readonly blockedIPs = new Map<string, Date>();

  constructor(
    private readonly configService: ConfigService,
    private readonly sanitizationService: SanitizationService,
  ) {
    this.passwordPolicy = {
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH', 8),
      maxLength: this.configService.get<number>('PASSWORD_MAX_LENGTH', 128),
      requireUppercase: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_UPPERCASE',
        true,
      ),
      requireLowercase: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_LOWERCASE',
        true,
      ),
      requireNumbers: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_NUMBERS',
        true,
      ),
      requireSpecialChars: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_SPECIAL',
        true,
      ),
      forbidCommonPasswords: this.configService.get<boolean>(
        'PASSWORD_FORBID_COMMON',
        true,
      ),
      forbidUserInfo: this.configService.get<boolean>(
        'PASSWORD_FORBID_USER_INFO',
        true,
      ),
      maxRepeatingChars: this.configService.get<number>(
        'PASSWORD_MAX_REPEATING',
        3,
      ),
      minAge: this.configService.get<number>('PASSWORD_MIN_AGE_HOURS', 24),
      historyCount: this.configService.get<number>('PASSWORD_HISTORY_COUNT', 5),
    };

    this.securitySettings = {
      maxLoginAttempts: this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5),
      lockoutDuration: this.configService.get<number>(
        'LOCKOUT_DURATION_MINUTES',
        30,
      ),
      sessionTimeout: this.configService.get<number>(
        'SESSION_TIMEOUT_MINUTES',
        60,
      ),
      refreshTokenExpiry: this.configService.get<number>(
        'REFRESH_TOKEN_EXPIRY_DAYS',
        7,
      ),
      totpWindow: this.configService.get<number>('TOTP_WINDOW', 1),
      requireEmailVerification: this.configService.get<boolean>(
        'REQUIRE_EMAIL_VERIFICATION',
        true,
      ),
      enableBruteForceProtection: this.configService.get<boolean>(
        'ENABLE_BRUTE_FORCE_PROTECTION',
        true,
      ),
      enableDeviceTracking: this.configService.get<boolean>(
        'ENABLE_DEVICE_TRACKING',
        true,
      ),
      enableSuspiciousActivityDetection: this.configService.get<boolean>(
        'ENABLE_SUSPICIOUS_ACTIVITY_DETECTION',
        true,
      ),
    };
  }

  /**
   * Validate password against security policy
   */
  validatePassword(
    password: string,
    userInfo?: { email?: string; name?: string },
  ): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  } {
    const errors: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < this.passwordPolicy.minLength) {
      errors.push(
        `Password must be at least ${this.passwordPolicy.minLength} characters long`,
      );
    } else if (password.length >= this.passwordPolicy.minLength) {
      score += 1;
    }

    if (password.length > this.passwordPolicy.maxLength) {
      errors.push(
        `Password must not exceed ${this.passwordPolicy.maxLength} characters`,
      );
    }

    // Character requirements
    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 1;
    }

    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 1;
    }

    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 1;
    }

    if (
      this.passwordPolicy.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    }

    // Common password check
    if (this.passwordPolicy.forbidCommonPasswords) {
      const lowercasePassword = password.toLowerCase();
      if (this.commonPasswords.has(lowercasePassword)) {
        errors.push('Password is too common and not allowed');
      }
    }

    // User information check
    if (this.passwordPolicy.forbidUserInfo && userInfo) {
      const lowercasePassword = password.toLowerCase();
      if (
        userInfo.email &&
        lowercasePassword.includes(userInfo.email.split('@')[0].toLowerCase())
      ) {
        errors.push('Password cannot contain your email address');
      }
      if (
        userInfo.name &&
        lowercasePassword.includes(userInfo.name.toLowerCase())
      ) {
        errors.push('Password cannot contain your name');
      }
    }

    // Repeating characters check
    const maxRepeating = this.getMaxRepeatingChars(password);
    if (maxRepeating > this.passwordPolicy.maxRepeatingChars) {
      errors.push(
        `Password cannot have more than ${this.passwordPolicy.maxRepeatingChars} repeating characters`,
      );
    }

    // Additional scoring for complexity
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // Special characters
    if (this.hasNoSequentialChars(password)) score += 1;

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score <= 3) strength = 'weak';
    else if (score <= 5) strength = 'medium';
    else if (score <= 7) strength = 'strong';
    else strength = 'very_strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Hash password using Argon2 (recommended) or bcrypt as fallback
   */
  async hashPassword(password: string, useArgon2 = true): Promise<string> {
    try {
      if (useArgon2) {
        return await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16, // 64 MB
          timeCost: 3,
          parallelism: 1,
        });
      } else {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
      }
    } catch (error) {
      this.logger.error('Password hashing failed', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Try Argon2 first
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      }
      // Fallback to bcrypt
      return await bcrypt.compare(password, hash);
    } catch (error) {
      this.logger.error('Password verification failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate cryptographically secure random string
   */
  generateSecureRandomString(
    length = 16,
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  ): string {
    let result = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += charset.charAt(array[i] % charset.length);
    }

    return result;
  }

  /**
   * Setup two-factor authentication
   */
  setupTwoFactor(
    userEmail: string,
    issuer = 'StudyTeddy',
  ): {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } {
    const secret = speakeasy.generateSecret({
      length: 32,
      name: userEmail,
      issuer: issuer,
    });

    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: userEmail,
      issuer: issuer,
      encoding: 'ascii',
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      this.generateSecureRandomString(
        8,
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      ),
    );

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await qrcode.toDataURL(otpauthUrl);
    } catch (error) {
      this.logger.error('QR code generation failed', { error: error.message });
      throw new Error('QR code generation failed');
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.securitySettings.totpWindow,
    });
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        for (let i = 0; i < hashedCodes.length; i++) {
          const isValid = await this.verifyPassword(code, hashedCodes[i]);
          if (isValid) {
            resolve(i);
            return;
          }
        }
        resolve(-1); // Code not found
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(attempt: LoginAttempt): void {
    const key = `${attempt.email}:${attempt.ipAddress}`;

    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, []);
    }

    const attempts = this.loginAttempts.get(key)!;
    attempts.push(attempt);

    // Keep only recent attempts (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAttempts = attempts.filter((a) => a.timestamp > cutoff);
    this.loginAttempts.set(key, recentAttempts);

    // Log security event
    this.logger.log('Login attempt recorded', {
      email: this.sanitizationService.sanitizeEmail(attempt.email),
      success: attempt.success,
      ipAddress: this.sanitizationService.sanitizeIpAddress(attempt.ipAddress),
      timestamp: attempt.timestamp,
    });
  }

  /**
   * Check if account is locked due to failed attempts
   */
  isAccountLocked(email: string, ipAddress: string): boolean {
    if (!this.securitySettings.enableBruteForceProtection) {
      return false;
    }

    const key = `${email}:${ipAddress}`;
    const attempts = this.loginAttempts.get(key) || [];

    // Check recent failed attempts
    const recentFailures = attempts.filter(
      (attempt) =>
        !attempt.success &&
        attempt.timestamp >
          new Date(
            Date.now() - this.securitySettings.lockoutDuration * 60 * 1000,
          ),
    );

    if (recentFailures.length >= this.securitySettings.maxLoginAttempts) {
      this.logger.warn(
        'Account locked due to excessive failed login attempts',
        {
          email: this.sanitizationService.sanitizeEmail(email),
          ipAddress: this.sanitizationService.sanitizeIpAddress(ipAddress),
          failedAttempts: recentFailures.length,
        },
      );
      return true;
    }

    return false;
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    const blockedUntil = this.blockedIPs.get(ipAddress);
    if (blockedUntil && new Date() < blockedUntil) {
      return true;
    }
    if (blockedUntil) {
      this.blockedIPs.delete(ipAddress); // Clean up expired blocks
    }
    return false;
  }

  /**
   * Block IP address temporarily
   */
  blockIP(ipAddress: string, durationMinutes = 60): void {
    const blockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.blockedIPs.set(ipAddress, blockedUntil);

    this.logger.warn('IP address blocked', {
      ipAddress: this.sanitizationService.sanitizeIpAddress(ipAddress),
      blockedUntil,
      durationMinutes,
    });
  }

  /**
   * Detect suspicious login activity
   */
  detectSuspiciousActivity(attempt: LoginAttempt): {
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    if (!this.securitySettings.enableSuspiciousActivityDetection) {
      return { isSuspicious: false, reasons: [], riskScore: 0 };
    }

    // Check for multiple IPs for same user
    const userAttempts = Array.from(this.loginAttempts.values())
      .flat()
      .filter(
        (a) =>
          a.email === attempt.email &&
          a.timestamp > new Date(Date.now() - 60 * 60 * 1000),
      );

    const uniqueIPs = new Set(userAttempts.map((a) => a.ipAddress));
    if (uniqueIPs.size > 3) {
      reasons.push('Multiple IP addresses used recently');
      riskScore += 30;
    }

    // Check for unusual user agent
    const commonUserAgents = userAttempts.map((a) => a.userAgent);
    const isUnusualUserAgent = !commonUserAgents.some(
      (ua) =>
        ua &&
        attempt.userAgent &&
        this.calculateSimilarity(ua, attempt.userAgent) > 0.8,
    );

    if (isUnusualUserAgent && commonUserAgents.length > 0) {
      reasons.push('Unusual device/browser detected');
      riskScore += 20;
    }

    // Check for rapid successive attempts
    const recentAttempts = userAttempts.filter(
      (a) => a.timestamp > new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
    );

    if (recentAttempts.length > 5) {
      reasons.push('Rapid successive login attempts');
      riskScore += 40;
    }

    // Check time-based patterns (login at unusual hours)
    const loginHour = attempt.timestamp.getHours();
    const userLoginHours = userAttempts.map((a) => a.timestamp.getHours());
    const averageLoginHour =
      userLoginHours.reduce((sum, hour) => sum + hour, 0) /
      userLoginHours.length;

    if (
      userLoginHours.length > 10 &&
      Math.abs(loginHour - averageLoginHour) > 6
    ) {
      reasons.push('Login at unusual time');
      riskScore += 15;
    }

    const isSuspicious = riskScore >= 50;

    if (isSuspicious) {
      this.logger.warn('Suspicious login activity detected', {
        email: this.sanitizationService.sanitizeEmail(attempt.email),
        ipAddress: this.sanitizationService.sanitizeIpAddress(
          attempt.ipAddress,
        ),
        reasons,
        riskScore,
      });
    }

    return { isSuspicious, reasons, riskScore };
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(
    userAgent: string,
    ipAddress: string,
    acceptLanguage?: string,
  ): string {
    const data = `${userAgent}|${ipAddress}|${acceptLanguage || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate session security
   */
  validateSession(session: SessionInfo): {
    isValid: boolean;
    shouldRenew: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let isValid = true;
    let shouldRenew = false;

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      errors.push('Session has expired');
      isValid = false;
    }

    // Check if session has been inactive too long
    const inactivityPeriod = Date.now() - session.lastActivity.getTime();
    const maxInactivity = this.securitySettings.sessionTimeout * 60 * 1000;

    if (inactivityPeriod > maxInactivity) {
      errors.push('Session inactive for too long');
      isValid = false;
    }

    // Check if session should be renewed (halfway through its lifetime)
    const sessionLifetime =
      session.expiresAt.getTime() - session.createdAt.getTime();
    const sessionAge = Date.now() - session.createdAt.getTime();

    if (sessionAge > sessionLifetime / 2) {
      shouldRenew = true;
    }

    return { isValid, shouldRenew, errors };
  }

  /**
   * Private helper methods
   */
  private getMaxRepeatingChars(password: string): number {
    let maxCount = 1;
    let currentCount = 1;

    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        currentCount++;
        maxCount = Math.max(maxCount, currentCount);
      } else {
        currentCount = 1;
      }
    }

    return maxCount;
  }

  private hasNoSequentialChars(password: string): boolean {
    const sequences = ['abc', '123', 'qwe', 'asd', 'zxc'];
    const lowercasePassword = password.toLowerCase();

    return !sequences.some(
      (seq) =>
        lowercasePassword.includes(seq) ||
        lowercasePassword.includes(seq.split('').reverse().join('')),
    );
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get security settings
   */
  getSecuritySettings(): SecuritySettings {
    return { ...this.securitySettings };
  }

  /**
   * Get password policy
   */
  getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy };
  }
}
