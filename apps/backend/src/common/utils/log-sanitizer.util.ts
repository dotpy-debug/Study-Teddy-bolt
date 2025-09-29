import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Utility for sanitizing sensitive data in logs to prevent leakage of
 * secrets, PII, and other sensitive information
 */
export class LogSanitizer {
  // Sensitive header patterns to scrub
  private static readonly SENSITIVE_HEADERS = [
    /^authorization$/i,
    /^cookie$/i,
    /^x-api-key$/i,
    /^x-auth-token$/i,
    /^x-csrf-token$/i,
    /^x-access-token$/i,
    /^x-refresh-token$/i,
    /^api-key$/i,
    /^apikey$/i,
    /^token$/i,
    /^auth$/i,
    /^session$/i,
    /^jwt$/i,
  ];

  // Sensitive field patterns in request body/query
  private static readonly SENSITIVE_FIELDS = [
    /^password$/i,
    /^passwd$/i,
    /^pwd$/i,
    /^secret$/i,
    /^token$/i,
    /^key$/i,
    /^api[_-]?key$/i,
    /^auth[_-]?token$/i,
    /^access[_-]?token$/i,
    /^refresh[_-]?token$/i,
    /^csrf[_-]?token$/i,
    /^x[_-]?csrf[_-]?token$/i,
    /^session[_-]?id$/i,
    /^ssn$/i,
    /^social[_-]?security$/i,
    /^credit[_-]?card$/i,
    /^cc[_-]?number$/i,
    /^card[_-]?number$/i,
    /^cvv$/i,
    /^cvc$/i,
    /^pin$/i,
    /^phone$/i,
    /^email$/i,
    /^address$/i,
    /^zip$/i,
    /^postal[_-]?code$/i,
    /^date[_-]?of[_-]?birth$/i,
    /^dob$/i,
    /^birth[_-]?date$/i,
  ];

  /**
   * Sanitizes request headers for logging
   */
  static sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (this.isSensitiveHeader(key)) {
        sanitized[key] = this.maskValue(value);
      } else {
        // Still mask long values that might contain tokens
        sanitized[key] =
          typeof value === 'string' && value.length > 100
            ? this.maskValue(value)
            : value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitizes request body for logging
   */
  static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    return this.sanitizeObject(body);
  }

  /**
   * Sanitizes query parameters for logging
   */
  static sanitizeQuery(query: any): any {
    if (!query || typeof query !== 'object') {
      return query;
    }

    return this.sanitizeObject(query);
  }

  /**
   * Creates a safe request metadata object for logging
   */
  static createSafeRequestMetadata(req: Request): {
    method: string;
    url: string;
    userAgent: string;
    ip: string;
    contentType?: string;
    contentLength?: number;
    bodyHash?: string;
    queryHash?: string;
    headerCount: number;
  } {
    const metadata = {
      method: req.method,
      url: this.sanitizeUrl(req.url),
      userAgent: req.get('User-Agent') || 'unknown',
      ip: this.maskIpAddress(req.ip || 'unknown'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length')
        ? parseInt(req.get('Content-Length')!, 10)
        : undefined,
      headerCount: Object.keys(req.headers).length,
    };

    // Add hashes for body and query if they exist (for correlation without exposure)
    if (req.body && Object.keys(req.body).length > 0) {
      (metadata as any).bodyHash = this.createHash(JSON.stringify(req.body));
    }

    if (req.query && Object.keys(req.query).length > 0) {
      (metadata as any).queryHash = this.createHash(JSON.stringify(req.query));
    }

    return metadata;
  }

  /**
   * Sanitizes URLs to remove sensitive query parameters
   */
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const sanitizedParams = new URLSearchParams();

      for (const [key, value] of urlObj.searchParams.entries()) {
        if (this.isSensitiveField(key)) {
          sanitizedParams.append(key, this.maskValue(value));
        } else {
          sanitizedParams.append(key, value);
        }
      }

      return (
        urlObj.pathname +
        (sanitizedParams.toString() ? `?${sanitizedParams.toString()}` : '')
      );
    } catch {
      // If URL parsing fails, just return the pathname part
      return url.split('?')[0] + (url.includes('?') ? '?[SANITIZED]' : '');
    }
  }

  /**
   * Creates metadata for suspicious activity logging without exposing sensitive data
   */
  static createSuspiciousActivityMetadata(
    req: Request,
    indicators: string[],
  ): {
    ip: string;
    userAgent: string;
    url: string;
    method: string;
    indicators: string[];
    requestHash: string;
    timestamp: string;
  } {
    return {
      ip: this.maskIpAddress(req.ip || 'unknown'),
      userAgent: req.get('User-Agent') || 'unknown',
      url: this.sanitizeUrl(req.url),
      method: req.method,
      indicators,
      requestHash: this.createHash(
        `${req.method}:${req.url}:${req.get('User-Agent')}`,
      ),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Recursively sanitizes an object, masking sensitive fields
   */
  private static sanitizeObject(obj: any, depth = 0): any {
    // Prevent deep recursion
    if (depth > 10) {
      return '[OBJECT_TOO_DEEP]';
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = this.maskValue(value);
        } else if (value && typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value, depth + 1);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Checks if a header name is sensitive
   */
  private static isSensitiveHeader(headerName: string): boolean {
    return this.SENSITIVE_HEADERS.some((pattern) => pattern.test(headerName));
  }

  /**
   * Checks if a field name is sensitive
   */
  private static isSensitiveField(fieldName: string): boolean {
    return this.SENSITIVE_FIELDS.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Masks a value for logging
   */
  private static maskValue(value: any): string {
    if (value == null) {
      return String(value);
    }

    const str = String(value);

    if (str.length <= 4) {
      return '[MASKED]';
    }

    // Show first and last character with asterisks in between
    return `${str[0]}${'*'.repeat(Math.min(str.length - 2, 8))}${str[str.length - 1]}`;
  }

  /**
   * Masks IP address for privacy (keeps network part, masks host part)
   */
  private static maskIpAddress(ip: string): string {
    if (!ip || ip === 'unknown') {
      return ip;
    }

    // IPv4
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.xxx.xxx`;
      }
    }

    // IPv6 - mask the second half
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
      }
    }

    // Fallback for unknown format
    return '[MASKED_IP]';
  }

  /**
   * Creates a hash for correlation without exposing data
   */
  private static createHash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 8); // Short hash for correlation
  }
}
