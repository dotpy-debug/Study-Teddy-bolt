import { Injectable, Logger } from '@nestjs/common';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import xss from 'xss';
import * as validator from 'validator';

@Injectable()
export class SanitizationService {
  private readonly logger = new Logger(SanitizationService.name);
  private readonly domPurify: any;

  constructor() {
    // Initialize DOMPurify with JSDOM window
    const window = new JSDOM('').window;
    this.domPurify = DOMPurify(window as any);

    // Configure DOMPurify with strict settings
    this.domPurify.setConfig({
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      ADD_TAGS: [],
      ADD_ATTR: [],
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      USE_PROFILES: false,
    });

    // Add hook to log sanitization events
    this.domPurify.addHook('uponSanitizeElement', (node: any, data: any) => {
      if (data.allowedTags[data.tagName] === false) {
        this.logger.warn(`Removed disallowed tag: ${data.tagName}`);
      }
    });

    this.domPurify.addHook('uponSanitizeAttribute', (node: any, data: any) => {
      if (data.allowedAttributes[data.attrName] === false) {
        this.logger.warn(`Removed disallowed attribute: ${data.attrName}`);
      }
    });
  }

  /**
   * Sanitize HTML content with DOMPurify
   */
  sanitizeHtml(html: string, config?: any): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    try {
      const cleanHtml = this.domPurify.sanitize(html, {
        ...config,
        ALLOWED_TAGS: config?.allowedTags || [
          'p',
          'br',
          'strong',
          'em',
          'u',
          'ol',
          'ul',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'code',
          'pre',
          'a',
          'img',
        ],
        ALLOWED_ATTR: config?.allowedAttributes || [
          'href',
          'src',
          'alt',
          'title',
          'class',
          'id',
        ],
        ALLOWED_URI_REGEXP:
          /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      });

      if (cleanHtml !== html) {
        this.logger.warn('HTML content was sanitized', {
          original: html.substring(0, 100),
          sanitized: cleanHtml.substring(0, 100),
        });
      }

      return cleanHtml;
    } catch (error) {
      this.logger.error('Failed to sanitize HTML', {
        error: error.message,
        html,
      });
      return '';
    }
  }

  /**
   * Sanitize with XSS library as fallback
   */
  sanitizeWithXss(html: string, options?: any): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    try {
      const xssOptions = {
        whiteList: {
          p: [],
          br: [],
          strong: [],
          b: [],
          em: [],
          i: [],
          u: [],
          ul: [],
          ol: [],
          li: [],
          h1: [],
          h2: [],
          h3: [],
          h4: [],
          h5: [],
          h6: [],
          blockquote: [],
          code: [],
          pre: [],
          a: ['href', 'title'],
          img: ['src', 'alt', 'title', 'width', 'height'],
          ...options?.whiteList,
        },
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style'],
        allowCommentTag: false,
        ...options,
      };

      return xss(html, xssOptions);
    } catch (error) {
      this.logger.error('Failed to sanitize with XSS library', {
        error: error.message,
      });
      return '';
    }
  }

  /**
   * Sanitize plain text input
   */
  sanitizeText(
    text: string,
    options?: {
      maxLength?: number;
      allowNewlines?: boolean;
      stripHtml?: boolean;
    },
  ): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let sanitized = text;

    // Strip HTML if requested
    if (options?.stripHtml !== false) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove control characters except newlines and tabs
    if (options?.allowNewlines !== false) {
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else {
      sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate if max length specified
    if (options?.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize email addresses
   */
  sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    const sanitized = email.toLowerCase().trim();
    return validator.isEmail(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize URLs
   */
  sanitizeUrl(
    url: string,
    allowedProtocols: string[] = ['http', 'https'],
  ): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const sanitized = url.trim();

    // Check if URL is valid
    if (
      !validator.isURL(sanitized, {
        protocols: allowedProtocols,
        require_protocol: true,
        require_host: true,
        require_valid_protocol: true,
        allow_underscores: false,
        host_whitelist: [],
        host_blacklist: [],
        allow_trailing_dot: false,
        allow_protocol_relative_urls: false,
      })
    ) {
      return '';
    }

    return sanitized;
  }

  /**
   * Sanitize file names
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }

    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

    // Remove control characters and other dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

    // Normalize spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      const name = sanitized.substring(0, 255 - (ext ? ext.length + 1 : 0));
      sanitized = ext ? `${name}.${ext}` : name;
    }

    return sanitized;
  }

  /**
   * Sanitize SQL input (basic protection, should use parameterized queries)
   */
  sanitizeSqlInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove SQL injection patterns
    const sanitized = input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comment start
      .replace(/\*\//g, '') // Remove multi-line comment end
      .replace(/\bUNION\b/gi, '') // Remove UNION
      .replace(/\bSELECT\b/gi, '') // Remove SELECT
      .replace(/\bINSERT\b/gi, '') // Remove INSERT
      .replace(/\bUPDATE\b/gi, '') // Remove UPDATE
      .replace(/\bDELETE\b/gi, '') // Remove DELETE
      .replace(/\bDROP\b/gi, '') // Remove DROP
      .replace(/\bCREATE\b/gi, '') // Remove CREATE
      .replace(/\bALTER\b/gi, '') // Remove ALTER
      .replace(/\bEXEC\b/gi, '') // Remove EXEC
      .replace(/\bEXECUTE\b/gi, ''); // Remove EXECUTE

    return sanitized.trim();
  }

  /**
   * Sanitize NoSQL injection attempts
   */
  sanitizeNoSqlInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeNoSqlInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Remove MongoDB operators
        if (!key.startsWith('$') && !key.includes('.')) {
          sanitized[key] = this.sanitizeNoSqlInput(value);
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Sanitize JSON input
   */
  sanitizeJsonInput(jsonString: string): any {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonString);
      return this.sanitizeNoSqlInput(parsed);
    } catch (error) {
      this.logger.warn('Invalid JSON input', {
        jsonString,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Sanitize search queries
   */
  sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    let sanitized = query
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/data:/gi, '') // Remove data protocol
      .replace(/vbscript:/gi, '') // Remove vbscript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();

    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    return sanitized;
  }

  /**
   * Comprehensive object sanitization
   */
  sanitizeObject(
    obj: any,
    rules: {
      textFields?: string[];
      htmlFields?: string[];
      emailFields?: string[];
      urlFields?: string[];
      maxDepth?: number;
    } = {},
    currentDepth = 0,
  ): any {
    if (currentDepth >= (rules.maxDepth || 10)) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.sanitizeObject(item, rules, currentDepth + 1),
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          if (rules.htmlFields?.includes(key)) {
            sanitized[key] = this.sanitizeHtml(value);
          } else if (rules.emailFields?.includes(key)) {
            sanitized[key] = this.sanitizeEmail(value);
          } else if (rules.urlFields?.includes(key)) {
            sanitized[key] = this.sanitizeUrl(value);
          } else if (rules.textFields?.includes(key)) {
            sanitized[key] = this.sanitizeText(value);
          } else {
            sanitized[key] = this.sanitizeText(value);
          }
        } else {
          sanitized[key] = this.sanitizeObject(value, rules, currentDepth + 1);
        }
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Validate and sanitize file content
   */
  sanitizeFileContent(
    content: Buffer,
    mimeType: string,
  ): {
    isValid: boolean;
    sanitizedContent?: Buffer;
    error?: string;
  } {
    try {
      // Check for malicious file signatures
      const signatures = {
        exe: [0x4d, 0x5a], // MZ header
        php: [0x3c, 0x3f, 0x70, 0x68, 0x70], // <?php
        script: [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script
      };

      for (const [type, signature] of Object.entries(signatures)) {
        if (this.hasSignature(content, signature)) {
          return {
            isValid: false,
            error: `Detected potentially malicious content: ${type}`,
          };
        }
      }

      // For text files, sanitize content
      if (mimeType.startsWith('text/')) {
        const textContent = content.toString('utf8');
        const sanitizedText = this.sanitizeText(textContent, {
          stripHtml: true,
        });
        return {
          isValid: true,
          sanitizedContent: Buffer.from(sanitizedText, 'utf8'),
        };
      }

      return { isValid: true, sanitizedContent: content };
    } catch (error) {
      return {
        isValid: false,
        error: `File sanitization failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if buffer has specific byte signature
   */
  private hasSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize user agent string
   */
  sanitizeUserAgent(userAgent: string): string {
    if (!userAgent || typeof userAgent !== 'string') {
      return '';
    }

    // Remove potentially malicious patterns
    let sanitized = userAgent
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/[<>]/g, '');

    // Limit length
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    return sanitized.trim();
  }

  /**
   * Sanitize IP address
   */
  sanitizeIpAddress(ip: string): string {
    if (!ip || typeof ip !== 'string') {
      return '';
    }

    const cleaned = ip.trim();

    // Validate IPv4 or IPv6
    if (validator.isIP(cleaned)) {
      return cleaned;
    }

    return '';
  }
}
