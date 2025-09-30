import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

export interface CORSSecurityConfig {
  origins:
    | string[]
    | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
  strictOriginCheck: boolean;
  dynamicOriginValidation: boolean;
  originWhitelist: string[];
  originBlacklist: string[];
  subdomainMatching: {
    enabled: boolean;
    domains: string[];
  };
  developmentMode: boolean;
}

@Injectable()
export class CORSSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CORSSecurityMiddleware.name);
  private readonly config: CORSSecurityConfig;
  private readonly trustedOrigins: Set<string> = new Set();
  private readonly blockedOrigins: Set<string> = new Set();

  constructor(private readonly configService: ConfigService) {
    this.config = this.initializeConfig();
    this.initializeOriginLists();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      const origin = req.headers.origin;
      const requestMethod = req.method;

      // Handle preflight requests
      if (requestMethod === 'OPTIONS') {
        this.handlePreflightRequest(req, res, origin);
        return;
      }

      // Handle actual requests
      this.handleActualRequest(req, res, origin);
      next();
    } catch (error) {
      this.logger.error('CORS security middleware error', {
        error: error.message,
        origin: req.headers.origin,
        method: req.method,
        url: req.url,
      });
      next();
    }
  }

  private initializeConfig(): CORSSecurityConfig {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';

    return {
      origins: this.parseOrigins(),
      methods: this.configService
        .get<string>('CORS_METHODS', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
        .split(','),
      allowedHeaders: this.configService
        .get<string>(
          'CORS_ALLOWED_HEADERS',
          'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-API-Key',
        )
        .split(','),
      exposedHeaders: this.configService
        .get<string>(
          'CORS_EXPOSED_HEADERS',
          'X-Total-Count,X-Rate-Limit-Remaining,X-Rate-Limit-Reset',
        )
        .split(','),
      credentials: this.configService.get<boolean>('CORS_CREDENTIALS', true),
      maxAge: this.configService.get<number>('CORS_MAX_AGE', isProduction ? 86400 : 300), // 24h in prod, 5min in dev
      preflightContinue: this.configService.get<boolean>('CORS_PREFLIGHT_CONTINUE', false),
      optionsSuccessStatus: this.configService.get<number>('CORS_OPTIONS_SUCCESS_STATUS', 204),
      strictOriginCheck: this.configService.get<boolean>('CORS_STRICT_ORIGIN_CHECK', isProduction),
      dynamicOriginValidation: this.configService.get<boolean>(
        'CORS_DYNAMIC_ORIGIN_VALIDATION',
        true,
      ),
      originWhitelist: this.configService
        .get<string>('CORS_ORIGIN_WHITELIST', '')
        .split(',')
        .filter(Boolean),
      originBlacklist: this.configService
        .get<string>('CORS_ORIGIN_BLACKLIST', '')
        .split(',')
        .filter(Boolean),
      subdomainMatching: {
        enabled: this.configService.get<boolean>('CORS_SUBDOMAIN_MATCHING', false),
        domains: this.configService
          .get<string>('CORS_SUBDOMAIN_DOMAINS', '')
          .split(',')
          .filter(Boolean),
      },
      developmentMode: isDevelopment,
    };
  }

  private parseOrigins():
    | string[]
    | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void) {
    const originsConfig = this.configService.get<string>('CORS_ORIGINS', '');

    if (this.config?.developmentMode) {
      // In development, allow localhost and common development origins
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://localhost:3000',
        'https://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        ...originsConfig.split(',').filter(Boolean),
      ];
    }

    if (this.config?.dynamicOriginValidation) {
      return (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
        this.validateOriginDynamically(origin, callback);
      };
    }

    return originsConfig.split(',').filter(Boolean);
  }

  private initializeOriginLists(): void {
    // Initialize trusted origins
    this.config.originWhitelist.forEach((origin) => {
      this.trustedOrigins.add(origin.toLowerCase());
    });

    // Initialize blocked origins
    this.config.originBlacklist.forEach((origin) => {
      this.blockedOrigins.add(origin.toLowerCase());
    });

    this.logger.log('CORS security initialized', {
      trustedOrigins: this.trustedOrigins.size,
      blockedOrigins: this.blockedOrigins.size,
      dynamicValidation: this.config.dynamicOriginValidation,
      strictMode: this.config.strictOriginCheck,
    });
  }

  private validateOriginDynamically(
    origin: string,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void {
    // Allow same-origin requests (no origin header)
    if (!origin) {
      callback(null, true);
      return;
    }

    const lowerOrigin = origin.toLowerCase();

    // Check blacklist first
    if (this.isOriginBlocked(lowerOrigin)) {
      this.logger.warn('Blocked origin attempted access', { origin });
      callback(null, false);
      return;
    }

    // Check whitelist
    if (this.isOriginTrusted(lowerOrigin)) {
      callback(null, true);
      return;
    }

    // Check subdomain matching
    if (this.config.subdomainMatching.enabled) {
      const isSubdomainAllowed = this.checkSubdomainMatch(lowerOrigin);
      if (isSubdomainAllowed) {
        callback(null, true);
        return;
      }
    }

    // Additional validation for production environments
    if (this.config.strictOriginCheck) {
      const isValidOrigin = this.performStrictOriginValidation(lowerOrigin);
      if (!isValidOrigin) {
        this.logger.warn('Origin failed strict validation', { origin });
        callback(null, false);
        return;
      }
    }

    // Log and evaluate unknown origins
    this.evaluateUnknownOrigin(lowerOrigin, callback);
  }

  private isOriginTrusted(origin: string): boolean {
    return this.trustedOrigins.has(origin);
  }

  private isOriginBlocked(origin: string): boolean {
    return this.blockedOrigins.has(origin);
  }

  private checkSubdomainMatch(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      return this.config.subdomainMatching.domains.some((domain) => {
        // Check for exact match or subdomain match
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });
    } catch (error) {
      return false;
    }
  }

  private performStrictOriginValidation(origin: string): boolean {
    try {
      const url = new URL(origin);

      // Must use HTTPS in production (except for localhost)
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
          return false;
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /\d+\.\d+\.\d+\.\d+/, // IP addresses (except localhost)
        /localhost/i, // Allow localhost in development
        /\.tk$|\.ml$|\.ga$|\.cf$/i, // Free TLD domains
        /[0-9]{4,}/, // Domains with many numbers
      ];

      const isSuspicious = suspiciousPatterns.some((pattern) => {
        if (pattern.source.includes('localhost') && this.config.developmentMode) {
          return false; // Allow localhost in development
        }
        return pattern.test(url.hostname);
      });

      if (isSuspicious && !url.hostname.includes('localhost')) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private evaluateUnknownOrigin(
    origin: string,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void {
    // In development mode, be more permissive
    if (this.config.developmentMode) {
      this.logger.warn('Unknown origin allowed in development mode', {
        origin,
      });
      callback(null, true);
      return;
    }

    // In production, log and block unknown origins
    this.logger.warn('Unknown origin blocked', { origin });

    // Optionally add to monitoring/alerting
    this.notifySecurityTeam('Unknown origin access attempt', { origin });

    callback(null, false);
  }

  private handlePreflightRequest(req: Request, res: Response, origin?: string): void {
    // Set CORS headers for preflight
    this.setCORSHeaders(res, origin);

    // Handle Access-Control-Request-Method
    const requestMethod = req.headers['access-control-request-method'];
    if (requestMethod && this.config.methods.includes(requestMethod)) {
      res.setHeader('Access-Control-Allow-Methods', this.config.methods.join(','));
    }

    // Handle Access-Control-Request-Headers
    const requestHeaders = req.headers['access-control-request-headers'];
    if (requestHeaders) {
      const requestHeadersList = requestHeaders.split(',').map((h) => h.trim());
      const allowedRequestHeaders = requestHeadersList.filter((header) =>
        this.config.allowedHeaders.some(
          (allowed) => allowed.toLowerCase() === header.toLowerCase(),
        ),
      );

      if (allowedRequestHeaders.length > 0) {
        res.setHeader('Access-Control-Allow-Headers', allowedRequestHeaders.join(','));
      }
    }

    // Set max age for preflight cache
    res.setHeader('Access-Control-Max-Age', this.config.maxAge.toString());

    res.status(this.config.optionsSuccessStatus).end();
  }

  private handleActualRequest(req: Request, res: Response, origin?: string): void {
    // Set CORS headers for actual request
    this.setCORSHeaders(res, origin);

    // Set exposed headers
    if (this.config.exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', this.config.exposedHeaders.join(','));
    }
  }

  private setCORSHeaders(res: Response, origin?: string): void {
    // Set origin
    if (origin && this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!this.config.credentials) {
      // Only set wildcard if credentials are not required
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Set credentials
    if (this.config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Vary header for proper caching
    res.setHeader('Vary', 'Origin');
  }

  private isOriginAllowed(origin: string): boolean {
    if (typeof this.config.origins === 'function') {
      // For dynamic validation, we'll assume it's allowed if we reach this point
      return true;
    }

    return this.config.origins.includes(origin);
  }

  private notifySecurityTeam(event: string, details: any): void {
    // Implement your security notification logic here
    // This could be sending to a security monitoring service, Slack, email, etc.
    this.logger.warn(`Security Event: ${event}`, details);
  }

  /**
   * Add origin to whitelist
   */
  addTrustedOrigin(origin: string): void {
    this.trustedOrigins.add(origin.toLowerCase());
    this.logger.log('Origin added to whitelist', { origin });
  }

  /**
   * Remove origin from whitelist
   */
  removeTrustedOrigin(origin: string): void {
    this.trustedOrigins.delete(origin.toLowerCase());
    this.logger.log('Origin removed from whitelist', { origin });
  }

  /**
   * Add origin to blacklist
   */
  addBlockedOrigin(origin: string): void {
    this.blockedOrigins.add(origin.toLowerCase());
    this.logger.log('Origin added to blacklist', { origin });
  }

  /**
   * Remove origin from blacklist
   */
  removeBlockedOrigin(origin: string): void {
    this.blockedOrigins.delete(origin.toLowerCase());
    this.logger.log('Origin removed from blacklist', { origin });
  }

  /**
   * Get current CORS configuration
   */
  getConfig(): CORSSecurityConfig {
    return { ...this.config };
  }

  /**
   * Get trusted origins
   */
  getTrustedOrigins(): string[] {
    return Array.from(this.trustedOrigins);
  }

  /**
   * Get blocked origins
   */
  getBlockedOrigins(): string[] {
    return Array.from(this.blockedOrigins);
  }
}
