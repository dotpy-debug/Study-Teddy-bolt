import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet, { HelmetOptions } from 'helmet';

const logger = new Logger('Security Headers Configuration');

/**
 * Content Security Policy configuration
 */
export const getCSPConfig = (configService: ConfigService) => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );
  const apiUrl = configService.get<string>('API_URL', 'http://localhost:3001');

  // Parse CDN URLs from environment
  const cdnUrls = configService
    .get<string>('CDN_URLS', '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const directives: Record<string, string[]> = {
    defaultSrc: ["'self'"],

    // Scripts
    scriptSrc: [
      "'self'",
      ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]), // Only in development
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      ...cdnUrls,
    ],

    // Styles
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for many UI libraries
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
      ...cdnUrls,
    ],

    // Images
    imgSrc: ["'self'", 'data:', 'blob:', 'https:', ...cdnUrls],

    // Fonts
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', ...cdnUrls],

    // Connections (API calls, WebSockets)
    connectSrc: [
      "'self'",
      frontendUrl,
      apiUrl,
      'https://api.openai.com',
      'https://api.sentry.io',
      'https://www.google-analytics.com',
      'wss://*.studyteddy.com',
      ...(isProduction ? [] : ['ws://localhost:*', 'http://localhost:*']),
      ...cdnUrls,
    ],

    // Media
    mediaSrc: ["'self'", 'blob:', ...cdnUrls],

    // Objects
    objectSrc: ["'none'"],

    // Frames
    frameSrc: [
      "'self'",
      'https://www.google.com', // For Google OAuth
      'https://accounts.google.com',
    ],

    // Frame ancestors (who can embed this site)
    frameAncestors: isProduction ? ["'none'"] : ["'self'"],

    // Form actions
    formAction: ["'self'"],

    // Base URI
    baseUri: ["'self'"],

    // Manifest
    manifestSrc: ["'self'"],

    // Workers
    workerSrc: ["'self'", 'blob:'],

    // Child sources
    childSrc: ["'self'", 'blob:'],

    // Upgrade insecure requests in production
    ...(isProduction && { upgradeInsecureRequests: [] }),

    // Block all mixed content
    ...(isProduction && { blockAllMixedContent: [] }),
  };

  // Add report URI if configured
  const reportUri = configService.get<string>('CSP_REPORT_URI');
  if (reportUri) {
    directives.reportUri = [reportUri];
  }

  return {
    useDefaults: false,
    directives,
    reportOnly:
      !isProduction && configService.get<boolean>('CSP_REPORT_ONLY', false),
  };
};

/**
 * Complete security headers configuration using Helmet
 */
export const getSecurityHeadersConfig = (configService: ConfigService) => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  return {
    // Content Security Policy
    contentSecurityPolicy: getCSPConfig(configService),

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: isProduction,

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin' as const,
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin' as const,
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: true,
    },

    // Expect-CT
    expectCt: isProduction
      ? {
          maxAge: 86400,
          enforce: true,
          reportUri: configService.get<string>('EXPECT_CT_REPORT_URI', ''),
        }
      : false,

    // Frameguard (X-Frame-Options)
    frameguard: {
      action: 'deny' as const,
    },

    // Hide Powered By
    hidePoweredBy: true,

    // HSTS (HTTP Strict Transport Security)
    hsts: isProduction
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // IE No Open
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none' as const,
    },

    // Referrer Policy
    referrerPolicy: {
      policy: isProduction
        ? ('strict-origin-when-cross-origin' as const)
        : ('no-referrer-when-downgrade' as const),
    },

    // XSS Filter
    xssFilter: true,
  };
};

/**
 * Additional custom security headers
 */
export const getCustomSecurityHeaders = (configService: ConfigService) => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  return {
    // Feature Policy / Permissions Policy
    'Permissions-Policy': [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self)',
      'battery=()',
      'camera=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=(self)',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self)',
      'gamepad=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'speaker-selection=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ].join(', '),

    // Cache Control
    'Cache-Control': isProduction
      ? 'no-cache, no-store, must-revalidate'
      : 'no-cache',

    // Pragma
    Pragma: 'no-cache',

    // Expires
    Expires: '0',

    // X-Content-Type-Options
    'X-Content-Type-Options': 'nosniff',

    // X-DNS-Prefetch-Control
    'X-DNS-Prefetch-Control': 'on',

    // X-Download-Options
    'X-Download-Options': 'noopen',

    // X-Permitted-Cross-Domain-Policies
    'X-Permitted-Cross-Domain-Policies': 'none',

    // Clear-Site-Data (for logout endpoints)
    ...(isProduction && {
      'Clear-Site-Data': '"cache", "cookies", "storage"',
    }),

    // Report-To header for reporting API
    ...(configService.get<string>('REPORTING_API_ENDPOINT') && {
      'Report-To': JSON.stringify({
        group: 'default',
        max_age: 86400,
        endpoints: [
          {
            url: configService.get<string>('REPORTING_API_ENDPOINT'),
          },
        ],
        include_subdomains: true,
      }),
    }),

    // NEL (Network Error Logging)
    ...(configService.get<string>('NEL_REPORT_URI') && {
      NEL: JSON.stringify({
        report_to: 'default',
        max_age: 86400,
        include_subdomains: true,
        failure_fraction: 0.1,
        success_fraction: 0.001,
      }),
    }),
  };
};

/**
 * Apply security headers middleware
 */
export const applySecurityHeaders = (
  app: any,
  configService: ConfigService,
) => {
  const helmetConfig = getSecurityHeadersConfig(configService);
  const customHeaders = getCustomSecurityHeaders(configService);

  // Apply Helmet middleware
  app.use(helmet(helmetConfig));

  // Apply custom headers
  app.use((req: any, res: any, next: any) => {
    Object.entries(customHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    next();
  });

  logger.log('Security headers configured', {
    environment: configService.get<string>('NODE_ENV'),
    hstsEnabled: !!helmetConfig.hsts,
    cspEnabled: !!helmetConfig.contentSecurityPolicy,
  });
};

/**
 * Validate security headers configuration
 */
export const validateSecurityHeaders = (configService: ConfigService) => {
  const nodeEnv = configService.get<string>('NODE_ENV');
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  if (nodeEnv === 'production') {
    if (!frontendUrl) {
      logger.warn('FRONTEND_URL not set - CSP may block legitimate requests');
    }

    const cspReportUri = configService.get<string>('CSP_REPORT_URI');
    if (!cspReportUri) {
      logger.warn(
        'CSP_REPORT_URI not set - CSP violations will not be reported',
      );
    }
  }

  logger.log('Security headers validation completed');
};
