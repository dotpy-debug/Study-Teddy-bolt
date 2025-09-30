import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityLogger } from '../logger/security.logger';
import { LogSanitizer } from '../utils/log-sanitizer.util';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor(private securityLogger: SecurityLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Log suspicious requests
    this.logSuspiciousActivity(req);

    // Block common attack patterns
    if (this.isAttackPattern(req)) {
      const metadata = LogSanitizer.createSafeRequestMetadata(req);
      this.securityLogger.logSuspiciousActivity(
        req.ip || 'unknown',
        req.get('User-Agent') || '',
        req.url,
        {
          ...metadata,
          reason: 'attack_pattern_detected',
          patternMatched: true,
        },
      );

      return res.status(403).json({
        statusCode: 403,
        message: 'Forbidden',
        error: 'Request blocked by security policy',
      });
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  }

  private isAttackPattern(req: Request): boolean {
    const url = req.url.toLowerCase();
    const userAgent = req.get('User-Agent')?.toLowerCase() || '';
    const body = JSON.stringify(req.body || {}).toLowerCase();

    // SQL injection patterns
    const sqlPatterns = [
      /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
      /(\bdrop\b.*\btable\b)|(\btable\b.*\bdrop\b)/i,
      /(\binsert\b.*\binto\b)|(\binto\b.*\binsert\b)/i,
      /(\bdelete\b.*\bfrom\b)|(\bfrom\b.*\bdelete\b)/i,
      /(\bupdate\b.*\bset\b)|(\bset\b.*\bupdate\b)/i,
      /(\bexec\b.*\bxp_)/i,
      /(\bsp_executesql\b)/i,
    ];

    // XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
    ];

    // Path traversal patterns
    const pathTraversalPatterns = [/\.\.\//, /\.\.\\/, /%2e%2e%2f/i, /%2e%2e%5c/i];

    // Command injection patterns
    const commandInjectionPatterns = [
      /;\s*(rm|del|format|shutdown)/i,
      /\|\s*(nc|netcat|wget|curl)/i,
      /`.*`/,
      /\$\(.*\)/,
    ];

    const allPatterns = [
      ...sqlPatterns,
      ...xssPatterns,
      ...pathTraversalPatterns,
      ...commandInjectionPatterns,
    ];

    // Check URL, User-Agent, and request body
    const targets = [url, userAgent, body];

    return targets.some((target) => allPatterns.some((pattern) => pattern.test(target)));
  }

  private logSuspiciousActivity(req: Request) {
    const indicatorTypes = [
      'path_traversal',
      'xss_script',
      'xss_javascript',
      'sqlmap',
      'nikto',
      'nessus',
    ];
    const suspiciousIndicators = [
      req.url.includes('..'),
      req.url.includes('<script'),
      req.url.includes('javascript:'),
      req.get('User-Agent')?.includes('sqlmap'),
      req.get('User-Agent')?.includes('nikto'),
      req.get('User-Agent')?.includes('nessus'),
    ];

    const detectedIndicators = suspiciousIndicators
      .map((indicator, index) => ({
        type: indicatorTypes[index],
        detected: indicator,
      }))
      .filter((item) => item.detected);

    if (detectedIndicators.length > 0) {
      const metadata = LogSanitizer.createSuspiciousActivityMetadata(
        req,
        detectedIndicators.map((item) => item.type),
      );

      this.securityLogger.logSuspiciousActivity(
        req.ip || 'unknown',
        req.get('User-Agent') || '',
        req.url,
        {
          ...metadata,
          reason: 'suspicious_indicators_detected',
          detectedIndicators: detectedIndicators.map((item) => item.type),
        },
      );
    }
  }
}
