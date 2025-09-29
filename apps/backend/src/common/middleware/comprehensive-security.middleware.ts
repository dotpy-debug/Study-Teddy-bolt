import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { RateLimitingService } from '../security/rate-limiting.service';
import { SanitizationService } from '../security/sanitization.service';
import { SecurityLoggerService } from '../security/security-logger.service';
import { AuthSecurityService } from '../security/auth-security.service';
import * as useragent from 'useragent';

export interface SecurityMiddlewareConfig {
  enableRateLimiting: boolean;
  enableInputSanitization: boolean;
  enableSecurityLogging: boolean;
  enableSuspiciousActivityDetection: boolean;
  enableIPBlocking: boolean;
  enableUserAgentValidation: boolean;
  enableRequestSizeLimit: boolean;
  maxRequestSize: number; // bytes
  enableSlowLorisProtection: boolean;
  requestTimeoutMs: number;
  enableCSRFProtection: boolean;
  trustedProxies: string[];
}

declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        sanitizedBody?: any;
        sanitizedQuery?: any;
        sanitizedParams?: any;
        riskScore: number;
        threatLevel: 'low' | 'medium' | 'high' | 'critical';
        blocked: boolean;
        blockReason?: string;
        deviceFingerprint?: string;
        geoLocation?: {
          country?: string;
          city?: string;
          coordinates?: [number, number];
        };
      };
    }
  }
}

@Injectable()
export class ComprehensiveSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ComprehensiveSecurityMiddleware.name);
  private readonly config: SecurityMiddlewareConfig;
  private readonly blockedIPs: Set<string> = new Set();
  private readonly suspiciousIPs: Map<
    string,
    { count: number; lastSeen: Date }
  > = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly sanitizationService: SanitizationService,
    private readonly securityLogger: SecurityLoggerService,
    private readonly authSecurityService: AuthSecurityService,
  ) {
    this.config = this.initializeConfig();
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      // Initialize security context
      req.securityContext = {
        riskScore: 0,
        threatLevel: 'low',
        blocked: false,
      };

      // Extract client information
      const clientInfo = this.extractClientInfo(req);

      // Step 1: IP-based security checks
      if (this.config.enableIPBlocking) {
        const ipCheckResult = await this.performIPSecurityChecks(
          clientInfo.ipAddress,
          req,
        );
        if (ipCheckResult.blocked) {
          return this.blockRequest(
            req,
            res,
            ipCheckResult.reason || 'IP blocked for security reasons',
          );
        }
        req.securityContext.riskScore += ipCheckResult.riskScore;
      }

      // Step 2: User Agent validation
      if (this.config.enableUserAgentValidation) {
        const uaCheckResult = this.validateUserAgent(clientInfo.userAgent);
        if (uaCheckResult.suspicious) {
          req.securityContext.riskScore += uaCheckResult.riskScore;
        }
      }

      // Step 3: Request size validation
      if (this.config.enableRequestSizeLimit) {
        const sizeCheckResult = this.validateRequestSize(req);
        if (sizeCheckResult.exceeded) {
          return this.blockRequest(req, res, 'Request size limit exceeded');
        }
      }

      // Step 4: Rate limiting
      if (this.config.enableRateLimiting) {
        try {
          await this.rateLimitingService.enforceRateLimit(
            req.path,
            clientInfo.identifier,
            req,
          );
        } catch (error) {
          return this.handleRateLimitExceeded(req, res, error);
        }
      }

      // Step 5: Input sanitization
      if (this.config.enableInputSanitization) {
        await this.sanitizeRequestInputs(req);
      }

      // Step 6: Suspicious activity detection
      if (this.config.enableSuspiciousActivityDetection) {
        const suspiciousResult = this.detectSuspiciousActivity(req, clientInfo);
        if (suspiciousResult.isSuspicious) {
          req.securityContext.riskScore += suspiciousResult.riskScore;
          req.securityContext.threatLevel = this.calculateThreatLevel(
            req.securityContext.riskScore,
          );

          // Log suspicious activity
          await this.securityLogger.logSecurityEvent({
            level: 'warn',
            category: 'network_security',
            event: 'suspicious_activity_detected',
            description: `Suspicious activity detected: ${suspiciousResult.reasons.join(', ')}`,
            user: {
              ipAddress: clientInfo.ipAddress,
              userAgent: clientInfo.userAgent,
            },
            request: {
              method: req.method,
              url: req.url,
              headers: this.sanitizeHeaders(req.headers),
            },
            security: {
              threatLevel: req.securityContext.threatLevel,
              riskScore: req.securityContext.riskScore,
              indicators: suspiciousResult.reasons,
            },
          });
        }
      }

      // Step 7: CSRF Protection (for state-changing operations)
      if (this.config.enableCSRFProtection) {
        const csrfResult = this.validateCSRFToken(req);
        if (!csrfResult.valid) {
          return this.blockRequest(req, res, 'CSRF token validation failed');
        }
      }

      // Step 8: Generate device fingerprint
      req.securityContext.deviceFingerprint =
        this.generateDeviceFingerprint(clientInfo);

      // Step 9: Set security response headers
      this.setSecurityResponseHeaders(res, req.securityContext);

      // Step 10: Log security event if high risk
      if (req.securityContext.riskScore > 50) {
        await this.securityLogger.logSecurityEvent({
          level:
            req.securityContext.threatLevel === 'critical' ? 'error' : 'warn',
          category: 'network_security',
          event: 'high_risk_request',
          description: `High risk request detected (score: ${req.securityContext.riskScore})`,
          user: {
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
          },
          request: {
            method: req.method,
            url: req.url,
            headers: this.sanitizeHeaders(req.headers),
          },
          security: {
            threatLevel: req.securityContext.threatLevel,
            riskScore: req.securityContext.riskScore,
            indicators: ['high_risk_score'],
          },
        });
      }

      // Add response time header
      res.on('finish', () => {
        const processingTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${processingTime}ms`);
      });

      next();
    } catch (error) {
      this.logger.error('Security middleware error', {
        error: error.message,
        url: req.url,
        method: req.method,
        ip: this.getClientIP(req),
      });

      // Log security error
      await this.securityLogger.logSecurityEvent({
        level: 'error',
        category: 'system_integrity',
        event: 'security_middleware_error',
        description: `Security middleware encountered an error: ${error.message}`,
        request: {
          method: req.method,
          url: req.url,
        },
        metadata: {
          error: error.message,
          stack: error.stack,
        },
      });

      next();
    }
  }

  private initializeConfig(): SecurityMiddlewareConfig {
    return {
      enableRateLimiting: this.configService.get<boolean>(
        'SECURITY_RATE_LIMITING',
        true,
      ),
      enableInputSanitization: this.configService.get<boolean>(
        'SECURITY_INPUT_SANITIZATION',
        true,
      ),
      enableSecurityLogging: this.configService.get<boolean>(
        'SECURITY_LOGGING',
        true,
      ),
      enableSuspiciousActivityDetection: this.configService.get<boolean>(
        'SECURITY_SUSPICIOUS_DETECTION',
        true,
      ),
      enableIPBlocking: this.configService.get<boolean>(
        'SECURITY_IP_BLOCKING',
        true,
      ),
      enableUserAgentValidation: this.configService.get<boolean>(
        'SECURITY_USER_AGENT_VALIDATION',
        true,
      ),
      enableRequestSizeLimit: this.configService.get<boolean>(
        'SECURITY_REQUEST_SIZE_LIMIT',
        true,
      ),
      maxRequestSize: this.configService.get<number>(
        'SECURITY_MAX_REQUEST_SIZE',
        1024 * 1024,
      ), // 1MB
      enableSlowLorisProtection: this.configService.get<boolean>(
        'SECURITY_SLOWLORIS_PROTECTION',
        true,
      ),
      requestTimeoutMs: this.configService.get<number>(
        'SECURITY_REQUEST_TIMEOUT',
        30000,
      ), // 30 seconds
      enableCSRFProtection: this.configService.get<boolean>(
        'SECURITY_CSRF_PROTECTION',
        true,
      ),
      trustedProxies: this.configService
        .get<string>('SECURITY_TRUSTED_PROXIES', '')
        .split(',')
        .filter(Boolean),
    };
  }

  private extractClientInfo(req: Request): {
    ipAddress: string;
    userAgent: string;
    identifier: string;
    realIP: string;
  } {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const userId = (req as any).user?.userId;
    const identifier = userId || ipAddress;
    const realIP = this.getRealClientIP(req);

    return { ipAddress, userAgent, identifier, realIP };
  }

  private getClientIP(req: Request): string {
    // Check various headers for the real IP address
    const possibleHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-cluster-client-ip',
      'forwarded',
    ];

    for (const header of possibleHeaders) {
      const value = req.headers[header];
      if (value) {
        const ip = Array.isArray(value) ? value[0] : value.split(',')[0];
        const cleanIP = ip.trim();

        if (this.isValidIP(cleanIP) && !this.isPrivateIP(cleanIP)) {
          return cleanIP;
        }
      }
    }

    return (
      req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
    );
  }

  private getRealClientIP(req: Request): string {
    // Similar to getClientIP but less strict for internal tracking
    return (
      req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
    );
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./, // Loopback
      /^192\.168\./, // Private Class C
      /^10\./, // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^::1$/, // IPv6 loopback
      /^fc00:/, // IPv6 unique local
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  private async performIPSecurityChecks(
    ipAddress: string,
    req: Request,
  ): Promise<{
    blocked: boolean;
    reason?: string;
    riskScore: number;
  }> {
    let riskScore = 0;

    // Check if IP is in block list
    if (this.blockedIPs.has(ipAddress)) {
      return { blocked: true, reason: 'IP address is blocked', riskScore: 100 };
    }

    // Check for suspicious IP patterns
    if (this.isSuspiciousIP(ipAddress)) {
      riskScore += 30;
    }

    // Check rate limiting at IP level
    if (this.authSecurityService.isIPBlocked(ipAddress)) {
      return {
        blocked: true,
        reason: 'IP address is rate limited',
        riskScore: 100,
      };
    }

    // Track suspicious IPs
    this.trackSuspiciousIP(ipAddress);

    return { blocked: false, riskScore };
  }

  private isSuspiciousIP(ipAddress: string): boolean {
    // Check against known bad IP patterns
    const suspiciousPatterns = [
      /^1\.1\.1\.1$/, // Example: known scanner IP (customize as needed)
      /^127\.0\.0\.1$/, // Localhost in headers (potentially spoofed)
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(ipAddress));
  }

  private trackSuspiciousIP(ipAddress: string): void {
    const now = new Date();
    const entry = this.suspiciousIPs.get(ipAddress) || {
      count: 0,
      lastSeen: now,
    };

    entry.count++;
    entry.lastSeen = now;
    this.suspiciousIPs.set(ipAddress, entry);

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const [ip, data] of this.suspiciousIPs) {
      if (data.lastSeen < oneHourAgo) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  private validateUserAgent(userAgent: string): {
    suspicious: boolean;
    riskScore: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    if (!userAgent || userAgent === 'Unknown') {
      reasons.push('missing_user_agent');
      riskScore += 20;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /bot|crawler|spider/i, reason: 'bot_user_agent', score: 15 },
      {
        pattern: /curl|wget|python|java/i,
        reason: 'script_user_agent',
        score: 25,
      },
      {
        pattern: /nmap|nikto|sqlmap/i,
        reason: 'scanner_user_agent',
        score: 50,
      },
      { pattern: /^.{0,10}$/, reason: 'short_user_agent', score: 20 },
      { pattern: /^.{500,}$/, reason: 'long_user_agent', score: 30 },
    ];

    for (const { pattern, reason, score } of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        reasons.push(reason);
        riskScore += score;
      }
    }

    return {
      suspicious: reasons.length > 0,
      riskScore,
      reasons,
    };
  }

  private validateRequestSize(req: Request): {
    exceeded: boolean;
    size: number;
  } {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    return {
      exceeded: contentLength > this.config.maxRequestSize,
      size: contentLength,
    };
  }

  private async sanitizeRequestInputs(req: Request): Promise<void> {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.securityContext!.sanitizedBody =
        this.sanitizationService.sanitizeObject(req.body, {
          textFields: ['title', 'description', 'content', 'name', 'note'],
          htmlFields: ['htmlContent', 'richText'],
          emailFields: ['email', 'contactEmail'],
          urlFields: ['website', 'url', 'link'],
        });
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.securityContext!.sanitizedQuery = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.securityContext!.sanitizedQuery[key] =
            this.sanitizationService.sanitizeText(value);
        } else {
          req.securityContext!.sanitizedQuery[key] = value;
        }
      }
    }

    // Sanitize path parameters
    if (req.params && typeof req.params === 'object') {
      req.securityContext!.sanitizedParams = {};
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string') {
          req.securityContext!.sanitizedParams[key] =
            this.sanitizationService.sanitizeText(value);
        } else {
          req.securityContext!.sanitizedParams[key] = value;
        }
      }
    }
  }

  private detectSuspiciousActivity(
    req: Request,
    clientInfo: any,
  ): {
    isSuspicious: boolean;
    riskScore: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for unusual request patterns
    const suspiciousPaths = [
      {
        pattern: /\/admin|\/wp-admin|\/administrator/i,
        reason: 'admin_path_access',
        score: 30,
      },
      {
        pattern: /\.php$|\.asp$|\.jsp$/i,
        reason: 'script_extension_access',
        score: 40,
      },
      {
        pattern: /\/\.\.|%2e%2e|\.\.%2f|%2f\.\./i,
        reason: 'path_traversal_attempt',
        score: 60,
      },
      {
        pattern: /union.*select|script.*alert|javascript:/i,
        reason: 'injection_attempt',
        score: 80,
      },
      {
        pattern: /eval\(|base64_decode|exec\(/i,
        reason: 'code_execution_attempt',
        score: 90,
      },
    ];

    for (const { pattern, reason, score } of suspiciousPaths) {
      if (pattern.test(req.url)) {
        reasons.push(reason);
        riskScore += score;
      }
    }

    // Check request headers for suspicious patterns
    const suspiciousHeaders = Object.entries(req.headers).filter(
      ([key, value]) => {
        if (typeof value === 'string') {
          return /<script|javascript:|vbscript:|onload=|onerror=/i.test(value);
        }
        return false;
      },
    );

    if (suspiciousHeaders.length > 0) {
      reasons.push('malicious_headers');
      riskScore += 40;
    }

    // Check for unusual HTTP methods
    const unusualMethods = ['TRACE', 'CONNECT', 'PATCH'];
    if (unusualMethods.includes(req.method)) {
      reasons.push('unusual_http_method');
      riskScore += 20;
    }

    return {
      isSuspicious: reasons.length > 0,
      riskScore,
      reasons,
    };
  }

  private validateCSRFToken(req: Request): { valid: boolean; reason?: string } {
    // Skip CSRF check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return { valid: true };
    }

    // Check for CSRF token in headers or body
    const token =
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token'] ||
      (req.body && req.body._csrf);

    if (!token) {
      return { valid: false, reason: 'Missing CSRF token' };
    }

    // Validate token format (basic check)
    if (typeof token !== 'string' || token.length < 16) {
      return { valid: false, reason: 'Invalid CSRF token format' };
    }

    return { valid: true };
  }

  private generateDeviceFingerprint(clientInfo: any): string {
    return this.authSecurityService.generateDeviceFingerprint(
      clientInfo.userAgent,
      clientInfo.ipAddress,
      '', // Accept-Language header if available
    );
  }

  private calculateThreatLevel(
    riskScore: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  }

  private setSecurityResponseHeaders(
    res: Response,
    securityContext: any,
  ): void {
    // Add security context headers (for debugging in non-production)
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      res.setHeader(
        'X-Security-Risk-Score',
        securityContext.riskScore.toString(),
      );
      res.setHeader('X-Security-Threat-Level', securityContext.threatLevel);
    }

    // Add request ID for tracking
    res.setHeader(
      'X-Request-ID',
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];

    return sanitized;
  }

  private async blockRequest(
    req: Request,
    res: Response,
    reason: string,
  ): Promise<void> {
    const clientIP = this.getClientIP(req);

    // Log blocked request
    await this.securityLogger.logSecurityEvent({
      level: 'warn',
      category: 'network_security',
      event: 'request_blocked',
      description: `Request blocked: ${reason}`,
      user: {
        ipAddress: clientIP,
        userAgent: req.headers['user-agent'],
      },
      request: {
        method: req.method,
        url: req.url,
        headers: this.sanitizeHeaders(req.headers),
      },
      security: {
        threatLevel: 'high',
        riskScore: 100,
        indicators: ['request_blocked'],
        mitigation: [reason],
      },
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Request blocked by security policy',
      timestamp: new Date().toISOString(),
    });
  }

  private async handleRateLimitExceeded(
    req: Request,
    res: Response,
    error: any,
  ): Promise<void> {
    const clientIP = this.getClientIP(req);

    await this.securityLogger.logRateLimitEvent('rate_limit_exceeded', {
      ipAddress: clientIP,
      endpoint: req.path,
      limit: error.limit,
      current: error.current,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: error.message || 'Rate limit exceeded',
      retryAfter: error.retryAfter,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get middleware configuration
   */
  getConfig(): SecurityMiddlewareConfig {
    return { ...this.config };
  }

  /**
   * Add IP to block list
   */
  blockIP(ipAddress: string): void {
    this.blockedIPs.add(ipAddress);
    this.logger.log('IP address blocked', { ipAddress });
  }

  /**
   * Remove IP from block list
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    this.logger.log('IP address unblocked', { ipAddress });
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Get suspicious IPs statistics
   */
  getSuspiciousIPStats(): Array<{ ip: string; count: number; lastSeen: Date }> {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      lastSeen: data.lastSeen,
    }));
  }
}
