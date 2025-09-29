import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ContentSecurityPolicyConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  childSrc: string[];
  workerSrc: string[];
  manifestSrc: string[];
  formAction: string[];
  frameAncestors: string[];
  baseUri: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
  reportUri?: string;
  reportTo?: string;
}

export interface FrontendSecurityConfig {
  csp: ContentSecurityPolicyConfig;
  enableSubresourceIntegrity: boolean;
  enableFeaturePolicy: boolean;
  enableReferrerPolicy: boolean;
  enableXContentTypeOptions: boolean;
  enableXFrameOptions: boolean;
  enableXXSSProtection: boolean;
  enableCrossDomainPolicy: boolean;
  cookieSecurityOptions: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    domain?: string;
    path: string;
    maxAge: number;
  };
  sessionSecurityOptions: {
    regenerateOnAuth: boolean;
    invalidateOnLogout: boolean;
    maxIdleTime: number;
    maxLifetime: number;
    cookieName: string;
  };
}

@Injectable()
export class FrontendSecurityService {
  private readonly logger = new Logger(FrontendSecurityService.name);
  private readonly config: FrontendSecurityConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.initializeConfig();
  }

  /**
   * Generate Content Security Policy header value
   */
  generateCSPHeader(
    customDirectives?: Partial<ContentSecurityPolicyConfig>,
  ): string {
    const csp = { ...this.config.csp, ...customDirectives };
    const directives: string[] = [];

    // Add directive entries
    Object.entries(csp).forEach(([directive, value]) => {
      if (directive === 'upgradeInsecureRequests' && value) {
        directives.push('upgrade-insecure-requests');
      } else if (directive === 'blockAllMixedContent' && value) {
        directives.push('block-all-mixed-content');
      } else if (directive === 'reportUri' && value) {
        directives.push(`report-uri ${value}`);
      } else if (directive === 'reportTo' && value) {
        directives.push(`report-to ${value}`);
      } else if (Array.isArray(value) && value.length > 0) {
        const kebabDirective = directive
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase();
        directives.push(`${kebabDirective} ${value.join(' ')}`);
      }
    });

    return directives.join('; ');
  }

  /**
   * Generate secure cookie configuration
   */
  generateCookieConfig(cookieName?: string): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    domain?: string;
    path: string;
    maxAge: number;
  } {
    return { ...this.config.cookieSecurityOptions };
  }

  /**
   * Generate Feature Policy header value
   */
  generateFeaturePolicyHeader(): string {
    const policies = {
      geolocation: 'none',
      microphone: 'none',
      camera: 'none',
      payment: 'none',
      usb: 'none',
      accelerometer: 'none',
      gyroscope: 'none',
      magnetometer: 'none',
      fullscreen: 'self',
      'picture-in-picture': 'none',
      'ambient-light-sensor': 'none',
      autoplay: 'none',
      'encrypted-media': 'none',
      midi: 'none',
      'speaker-selection': 'none',
      'sync-xhr': 'none',
      vr: 'none',
      'wake-lock': 'none',
      'xr-spatial-tracking': 'none',
    };

    return Object.entries(policies)
      .map(([feature, allowlist]) => `${feature} ${allowlist}`)
      .join(', ');
  }

  /**
   * Generate Permissions Policy header value (newer version of Feature Policy)
   */
  generatePermissionsPolicyHeader(): string {
    const policies = {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: [],
      usb: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
      fullscreen: ['self'],
      'picture-in-picture': [],
      'ambient-light-sensor': [],
      autoplay: [],
      'encrypted-media': [],
      midi: [],
      'speaker-selection': [],
      'sync-xhr': [],
      'web-share': [],
      'xr-spatial-tracking': [],
    };

    return Object.entries(policies)
      .map(([feature, allowlist]) => {
        if (allowlist.length === 0) {
          return `${feature}=()`;
        }
        const formattedAllowlist = allowlist
          .map((origin) => (origin === 'self' ? 'self' : `"${origin}"`))
          .join(' ');
        return `${feature}=(${formattedAllowlist})`;
      })
      .join(', ');
  }

  /**
   * Validate frontend resource integrity
   */
  validateSubresourceIntegrity(resource: {
    url: string;
    hash: string;
    algorithm: 'sha256' | 'sha384' | 'sha512';
  }): boolean {
    // This would typically validate against a whitelist of known good resources
    const trustedDomains = [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      // Add your trusted CDN domains
    ];

    try {
      const url = new URL(resource.url);
      const isDomainTrusted = trustedDomains.some(
        (domain) =>
          url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      );

      if (!isDomainTrusted) {
        this.logger.warn('Untrusted domain for SRI resource', {
          url: resource.url,
          domain: url.hostname,
        });
        return false;
      }

      // Validate hash format
      const hashPattern = /^[A-Za-z0-9+/]+=*$/;
      if (!hashPattern.test(resource.hash)) {
        this.logger.warn('Invalid SRI hash format', {
          url: resource.url,
          hash: resource.hash,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('SRI validation error', {
        url: resource.url,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Generate Subresource Integrity attributes for scripts and stylesheets
   */
  generateSRIAttributes(
    resources: Array<{
      url: string;
      hash: string;
      algorithm: 'sha256' | 'sha384' | 'sha512';
    }>,
  ): Array<{
    url: string;
    integrity: string;
    crossorigin: string;
  }> {
    return resources
      .filter((resource) => this.validateSubresourceIntegrity(resource))
      .map((resource) => ({
        url: resource.url,
        integrity: `${resource.algorithm}-${resource.hash}`,
        crossorigin: 'anonymous',
      }));
  }

  /**
   * Generate secure client-side configuration
   */
  generateClientSecurityConfig(): {
    csp: string;
    enableBrowserFeatures: {
      localStorage: boolean;
      sessionStorage: boolean;
      indexedDB: boolean;
      webWorkers: boolean;
      serviceWorkers: boolean;
      webAssembly: boolean;
      clipboard: boolean;
      notifications: boolean;
      geolocation: boolean;
    };
    securityHeaders: {
      xContentTypeOptions: string;
      xFrameOptions: string;
      xXSSProtection: string;
      referrerPolicy: string;
    };
    cookieSettings: typeof this.config.cookieSecurityOptions;
  } {
    return {
      csp: this.generateCSPHeader(),
      enableBrowserFeatures: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: false,
        webWorkers: false,
        serviceWorkers: true,
        webAssembly: false,
        clipboard: true,
        notifications: true,
        geolocation: false,
      },
      securityHeaders: {
        xContentTypeOptions: 'nosniff',
        xFrameOptions: 'DENY',
        xXSSProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
      },
      cookieSettings: this.config.cookieSecurityOptions,
    };
  }

  /**
   * Validate client-side input before sending to server
   */
  validateClientInput(input: {
    type: 'text' | 'email' | 'url' | 'number' | 'tel' | 'password';
    value: string;
    maxLength?: number;
    pattern?: string;
    required?: boolean;
  }): {
    isValid: boolean;
    sanitizedValue: string;
    errors: string[];
  } {
    const errors: string[] = [];
    let sanitizedValue = input.value;

    // Required validation
    if (input.required && (!input.value || input.value.trim().length === 0)) {
      errors.push('This field is required');
    }

    if (input.value) {
      // Length validation
      if (input.maxLength && input.value.length > input.maxLength) {
        errors.push(`Maximum length is ${input.maxLength} characters`);
      }

      // Type-specific validation
      switch (input.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.value)) {
            errors.push('Invalid email format');
          }
          break;

        case 'url':
          try {
            new URL(input.value);
          } catch {
            errors.push('Invalid URL format');
          }
          break;

        case 'number':
          if (isNaN(Number(input.value))) {
            errors.push('Must be a valid number');
          }
          break;

        case 'tel':
          const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
          if (!phoneRegex.test(input.value)) {
            errors.push('Invalid phone number format');
          }
          break;

        case 'password':
          if (input.value.length < 8) {
            errors.push('Password must be at least 8 characters');
          }
          break;
      }

      // Pattern validation
      if (input.pattern) {
        const regex = new RegExp(input.pattern);
        if (!regex.test(input.value)) {
          errors.push('Invalid format');
        }
      }

      // Basic XSS prevention
      sanitizedValue = input.value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/onload=/gi, '')
        .replace(/onerror=/gi, '');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors,
    };
  }

  /**
   * Generate client-side security headers for API responses
   */
  generateApiSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.enableXContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (this.config.enableXFrameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    if (this.config.enableXXSSProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    if (this.config.enableCrossDomainPolicy) {
      headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    }

    if (this.config.enableFeaturePolicy) {
      headers['Permissions-Policy'] = this.generatePermissionsPolicyHeader();
    }

    // Security headers
    headers['X-Download-Options'] = 'noopen';
    headers['X-DNS-Prefetch-Control'] = 'off';
    headers['Strict-Transport-Security'] =
      'max-age=31536000; includeSubDomains; preload';

    return headers;
  }

  /**
   * Generate secure session configuration
   */
  generateSessionConfig(): typeof this.config.sessionSecurityOptions {
    return { ...this.config.sessionSecurityOptions };
  }

  /**
   * Validate and sanitize URL for safe redirection
   */
  validateRedirectUrl(
    url: string,
    allowedDomains: string[],
  ): {
    isValid: boolean;
    sanitizedUrl?: string;
    reason?: string;
  } {
    try {
      // Check if URL is relative (always allowed)
      if (url.startsWith('/') && !url.startsWith('//')) {
        return {
          isValid: true,
          sanitizedUrl: url,
        };
      }

      const parsedUrl = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          reason: 'Only HTTP and HTTPS protocols are allowed',
        };
      }

      // Check domain whitelist
      const isDomainAllowed = allowedDomains.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`),
      );

      if (!isDomainAllowed) {
        return {
          isValid: false,
          reason: 'Domain not in allowed list',
        };
      }

      return {
        isValid: true,
        sanitizedUrl: url,
      };
    } catch (error) {
      return {
        isValid: false,
        reason: 'Invalid URL format',
      };
    }
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }

  private initializeConfig(): FrontendSecurityConfig {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    return {
      csp: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.openai.com', 'wss:', 'ws:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: isProduction,
        blockAllMixedContent: isProduction,
        reportUri: this.configService.get<string>('CSP_REPORT_URI'),
        reportTo: this.configService.get<string>('CSP_REPORT_TO'),
      },
      enableSubresourceIntegrity: isProduction,
      enableFeaturePolicy: true,
      enableReferrerPolicy: true,
      enableXContentTypeOptions: true,
      enableXFrameOptions: true,
      enableXXSSProtection: true,
      enableCrossDomainPolicy: true,
      cookieSecurityOptions: {
        secure: isProduction,
        httpOnly: true,
        sameSite: 'strict',
        domain: this.configService.get<string>('COOKIE_DOMAIN'),
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      sessionSecurityOptions: {
        regenerateOnAuth: true,
        invalidateOnLogout: true,
        maxIdleTime: 30 * 60 * 1000, // 30 minutes
        maxLifetime: 24 * 60 * 60 * 1000, // 24 hours
        cookieName: 'study-teddy-session',
      },
    };
  }

  /**
   * Get frontend security configuration
   */
  getConfig(): FrontendSecurityConfig {
    return { ...this.config };
  }
}
