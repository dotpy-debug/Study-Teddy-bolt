import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    enabled: boolean;
    directives: {
      defaultSrc: string[];
      scriptSrc: string[];
      styleSrc: string[];
      imgSrc: string[];
      connectSrc: string[];
      fontSrc: string[];
      objectSrc: string[];
      mediaSrc: string[];
      frameSrc: string[];
      workerSrc: string[];
      manifestSrc: string[];
      formAction: string[];
      frameAncestors: string[];
      baseUri: string[];
      upgradeInsecureRequests: boolean;
    };
    reportUri?: string;
    reportOnly: boolean;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameOptions: {
    enabled: boolean;
    action: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
    allowFrom?: string;
  };
  contentTypeOptions: {
    enabled: boolean;
  };
  referrerPolicy: {
    enabled: boolean;
    policy: string;
  };
  permissionsPolicy: {
    enabled: boolean;
    policies: { [feature: string]: string[] };
  };
  crossOriginEmbedderPolicy: {
    enabled: boolean;
    policy: 'require-corp' | 'credentialless';
  };
  crossOriginOpenerPolicy: {
    enabled: boolean;
    policy: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  };
  crossOriginResourcePolicy: {
    enabled: boolean;
    policy: 'same-site' | 'same-origin' | 'cross-origin';
  };
  expectCt: {
    enabled: boolean;
    maxAge: number;
    enforce: boolean;
    reportUri?: string;
  };
}

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);
  private readonly config: SecurityHeadersConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.initializeConfig();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Content Security Policy
      if (this.config.contentSecurityPolicy.enabled) {
        this.setContentSecurityPolicy(res);
      }

      // HTTP Strict Transport Security
      if (this.config.hsts.enabled) {
        this.setHSTS(res);
      }

      // X-Frame-Options
      if (this.config.frameOptions.enabled) {
        this.setFrameOptions(res);
      }

      // X-Content-Type-Options
      if (this.config.contentTypeOptions.enabled) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // Referrer Policy
      if (this.config.referrerPolicy.enabled) {
        res.setHeader('Referrer-Policy', this.config.referrerPolicy.policy);
      }

      // Permissions Policy
      if (this.config.permissionsPolicy.enabled) {
        this.setPermissionsPolicy(res);
      }

      // Cross-Origin Embedder Policy
      if (this.config.crossOriginEmbedderPolicy.enabled) {
        res.setHeader('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy.policy);
      }

      // Cross-Origin Opener Policy
      if (this.config.crossOriginOpenerPolicy.enabled) {
        res.setHeader('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy.policy);
      }

      // Cross-Origin Resource Policy
      if (this.config.crossOriginResourcePolicy.enabled) {
        res.setHeader('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy.policy);
      }

      // Expect-CT
      if (this.config.expectCt.enabled) {
        this.setExpectCT(res);
      }

      // Additional security headers
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('X-DNS-Prefetch-Control', 'off');

      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Set custom server header (optional obfuscation)
      res.setHeader('Server', 'StudyTeddy/1.0');

      next();
    } catch (error) {
      this.logger.error('Security headers middleware error', {
        error: error.message,
        url: req.url,
      });
      next();
    }
  }

  private initializeConfig(): SecurityHeadersConfig {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    return {
      contentSecurityPolicy: {
        enabled: this.configService.get<boolean>('CSP_ENABLED', true),
        directives: {
          defaultSrc: this.configService.get<string>('CSP_DEFAULT_SRC', "'self'").split(' '),
          scriptSrc: this.configService
            .get<string>('CSP_SCRIPT_SRC', "'self' 'unsafe-inline'")
            .split(' '),
          styleSrc: this.configService
            .get<string>('CSP_STYLE_SRC', "'self' 'unsafe-inline'")
            .split(' '),
          imgSrc: this.configService.get<string>('CSP_IMG_SRC', "'self' data: https:").split(' '),
          connectSrc: this.configService
            .get<string>('CSP_CONNECT_SRC', "'self' https://api.openai.com")
            .split(' '),
          fontSrc: this.configService.get<string>('CSP_FONT_SRC', "'self' https: data:").split(' '),
          objectSrc: this.configService.get<string>('CSP_OBJECT_SRC', "'none'").split(' '),
          mediaSrc: this.configService.get<string>('CSP_MEDIA_SRC', "'self'").split(' '),
          frameSrc: this.configService.get<string>('CSP_FRAME_SRC', "'none'").split(' '),
          workerSrc: this.configService.get<string>('CSP_WORKER_SRC', "'self'").split(' '),
          manifestSrc: this.configService.get<string>('CSP_MANIFEST_SRC', "'self'").split(' '),
          formAction: this.configService.get<string>('CSP_FORM_ACTION', "'self'").split(' '),
          frameAncestors: this.configService
            .get<string>('CSP_FRAME_ANCESTORS', "'none'")
            .split(' '),
          baseUri: this.configService.get<string>('CSP_BASE_URI', "'self'").split(' '),
          upgradeInsecureRequests: this.configService.get<boolean>(
            'CSP_UPGRADE_INSECURE_REQUESTS',
            isProduction,
          ),
        },
        reportUri: this.configService.get<string>('CSP_REPORT_URI'),
        reportOnly: this.configService.get<boolean>('CSP_REPORT_ONLY', false),
      },
      hsts: {
        enabled: this.configService.get<boolean>('HSTS_ENABLED', isProduction),
        maxAge: this.configService.get<number>('HSTS_MAX_AGE', 31536000), // 1 year
        includeSubDomains: this.configService.get<boolean>('HSTS_INCLUDE_SUB_DOMAINS', true),
        preload: this.configService.get<boolean>('HSTS_PRELOAD', true),
      },
      frameOptions: {
        enabled: this.configService.get<boolean>('FRAME_OPTIONS_ENABLED', true),
        action: this.configService.get<'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'>(
          'FRAME_OPTIONS_ACTION',
          'DENY',
        ),
        allowFrom: this.configService.get<string>('FRAME_OPTIONS_ALLOW_FROM'),
      },
      contentTypeOptions: {
        enabled: this.configService.get<boolean>('CONTENT_TYPE_OPTIONS_ENABLED', true),
      },
      referrerPolicy: {
        enabled: this.configService.get<boolean>('REFERRER_POLICY_ENABLED', true),
        policy: this.configService.get<string>(
          'REFERRER_POLICY',
          'strict-origin-when-cross-origin',
        ),
      },
      permissionsPolicy: {
        enabled: this.configService.get<boolean>('PERMISSIONS_POLICY_ENABLED', true),
        policies: {
          geolocation: this.configService
            .get<string>('PERMISSIONS_POLICY_GEOLOCATION', 'none')
            .split(' '),
          microphone: this.configService
            .get<string>('PERMISSIONS_POLICY_MICROPHONE', 'none')
            .split(' '),
          camera: this.configService.get<string>('PERMISSIONS_POLICY_CAMERA', 'none').split(' '),
          payment: this.configService.get<string>('PERMISSIONS_POLICY_PAYMENT', 'none').split(' '),
          usb: this.configService.get<string>('PERMISSIONS_POLICY_USB', 'none').split(' '),
          accelerometer: this.configService
            .get<string>('PERMISSIONS_POLICY_ACCELEROMETER', 'none')
            .split(' '),
          gyroscope: this.configService
            .get<string>('PERMISSIONS_POLICY_GYROSCOPE', 'none')
            .split(' '),
          magnetometer: this.configService
            .get<string>('PERMISSIONS_POLICY_MAGNETOMETER', 'none')
            .split(' '),
          fullscreen: this.configService
            .get<string>('PERMISSIONS_POLICY_FULLSCREEN', 'self')
            .split(' '),
        },
      },
      crossOriginEmbedderPolicy: {
        enabled: this.configService.get<boolean>('COEP_ENABLED', false),
        policy: this.configService.get<'require-corp' | 'credentialless'>(
          'COEP_POLICY',
          'require-corp',
        ),
      },
      crossOriginOpenerPolicy: {
        enabled: this.configService.get<boolean>('COOP_ENABLED', true),
        policy: this.configService.get<'same-origin' | 'same-origin-allow-popups' | 'unsafe-none'>(
          'COOP_POLICY',
          'same-origin',
        ),
      },
      crossOriginResourcePolicy: {
        enabled: this.configService.get<boolean>('CORP_ENABLED', true),
        policy: this.configService.get<'same-site' | 'same-origin' | 'cross-origin'>(
          'CORP_POLICY',
          'same-site',
        ),
      },
      expectCt: {
        enabled: this.configService.get<boolean>('EXPECT_CT_ENABLED', isProduction),
        maxAge: this.configService.get<number>('EXPECT_CT_MAX_AGE', 86400), // 24 hours
        enforce: this.configService.get<boolean>('EXPECT_CT_ENFORCE', false),
        reportUri: this.configService.get<string>('EXPECT_CT_REPORT_URI'),
      },
    };
  }

  private setContentSecurityPolicy(res: Response): void {
    const directives: string[] = [];

    Object.entries(this.config.contentSecurityPolicy.directives).forEach(([key, value]) => {
      if (key === 'upgradeInsecureRequests') {
        if (value) {
          directives.push('upgrade-insecure-requests');
        }
      } else {
        const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        if (Array.isArray(value) && value.length > 0) {
          directives.push(`${kebabKey} ${value.join(' ')}`);
        }
      }
    });

    if (this.config.contentSecurityPolicy.reportUri) {
      directives.push(`report-uri ${this.config.contentSecurityPolicy.reportUri}`);
    }

    const headerName = this.config.contentSecurityPolicy.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    res.setHeader(headerName, directives.join('; '));
  }

  private setHSTS(res: Response): void {
    const hstsValue = [
      `max-age=${this.config.hsts.maxAge}`,
      this.config.hsts.includeSubDomains ? 'includeSubDomains' : '',
      this.config.hsts.preload ? 'preload' : '',
    ]
      .filter(Boolean)
      .join('; ');

    res.setHeader('Strict-Transport-Security', hstsValue);
  }

  private setFrameOptions(res: Response): void {
    let frameOptionsValue = this.config.frameOptions.action;

    if (this.config.frameOptions.action === 'ALLOW-FROM' && this.config.frameOptions.allowFrom) {
      frameOptionsValue += ` ${this.config.frameOptions.allowFrom}`;
    }

    res.setHeader('X-Frame-Options', frameOptionsValue);
  }

  private setPermissionsPolicy(res: Response): void {
    const policies: string[] = [];

    Object.entries(this.config.permissionsPolicy.policies).forEach(([feature, allowlist]) => {
      if (allowlist.includes('none')) {
        policies.push(`${feature}=()`);
      } else if (allowlist.includes('*')) {
        policies.push(`${feature}=*`);
      } else {
        const formattedAllowlist = allowlist
          .map((origin) => (origin === 'self' ? 'self' : `"${origin}"`))
          .join(' ');
        policies.push(`${feature}=(${formattedAllowlist})`);
      }
    });

    if (policies.length > 0) {
      res.setHeader('Permissions-Policy', policies.join(', '));
    }
  }

  private setExpectCT(res: Response): void {
    const expectCtValue = [
      `max-age=${this.config.expectCt.maxAge}`,
      this.config.expectCt.enforce ? 'enforce' : '',
      this.config.expectCt.reportUri ? `report-uri="${this.config.expectCt.reportUri}"` : '',
    ]
      .filter(Boolean)
      .join(', ');

    res.setHeader('Expect-CT', expectCtValue);
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }

  /**
   * Update CSP directive
   */
  updateCSPDirective(directive: string, values: string[]): void {
    if (
      this.config.contentSecurityPolicy.directives[
        directive as keyof typeof this.config.contentSecurityPolicy.directives
      ]
    ) {
      (this.config.contentSecurityPolicy.directives as any)[directive] = values;
      this.logger.log('CSP directive updated', { directive, values });
    }
  }
}
