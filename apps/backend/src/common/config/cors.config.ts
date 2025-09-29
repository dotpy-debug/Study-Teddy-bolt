import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('CORS Configuration');

/**
 * Generate CORS configuration based on environment
 */
export const getCorsConfig = (configService: ConfigService): CorsOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const isStaging = nodeEnv === 'staging';

  // Parse allowed origins from environment variables
  const parseOrigins = (envVar: string): string[] => {
    const origins = configService.get<string>(envVar, '');
    if (!origins) return [];

    return origins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  };

  // Get origins based on environment
  let allowedOrigins: string[] = [];

  if (isProduction) {
    // Production origins
    allowedOrigins = [
      ...parseOrigins('CORS_PRODUCTION_ORIGINS'),
      configService.get<string>('FRONTEND_URL', ''),
      'https://studyteddy.com',
      'https://www.studyteddy.com',
      'https://app.studyteddy.com',
    ].filter(Boolean);
  } else if (isStaging) {
    // Staging origins
    allowedOrigins = [
      ...parseOrigins('CORS_STAGING_ORIGINS'),
      configService.get<string>('FRONTEND_URL', ''),
      'https://staging.studyteddy.com',
      'https://preview.studyteddy.com',
    ].filter(Boolean);
  } else {
    // Development origins
    allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      ...parseOrigins('CORS_DEV_ORIGINS'),
      configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    ].filter(Boolean);
  }

  // Remove duplicates
  allowedOrigins = [...new Set(allowedOrigins)];

  logger.log(`Allowed CORS origins for ${nodeEnv}:`, allowedOrigins);

  // CORS configuration object
  const corsConfig: CorsOptions = {
    // Origin validation
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin && !isProduction) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Check for subdomain wildcards
        const isAllowedSubdomain = allowedOrigins.some((allowedOrigin) => {
          if (allowedOrigin.includes('*')) {
            // Convert wildcard to regex
            const regex = new RegExp(
              allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*'),
            );
            return regex.test(origin);
          }
          return false;
        });

        if (isAllowedSubdomain) {
          callback(null, true);
        } else {
          logger.warn(`CORS: Blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      }
    },

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],

    // Allowed headers
    allowedHeaders: [
      'Accept',
      'Accept-Language',
      'Content-Type',
      'Authorization',
      'Origin',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-XSRF-Token',
      'Cache-Control',
      'Pragma',
      'Expires',
      'If-None-Match',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Device-ID',
      'X-Session-ID',
      'X-Client-Version',
      'X-Platform',
    ],

    // Exposed headers (headers that the browser is allowed to access)
    exposedHeaders: [
      'X-CSRF-Token',
      'X-Request-ID',
      'X-Response-Time',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
      'Content-Range',
      'Content-Length',
      'Content-Type',
      'ETag',
      'Last-Modified',
    ],

    // Max age for preflight caching (in seconds)
    maxAge: isProduction ? 86400 : 3600, // 24 hours in production, 1 hour in dev

    // Success status for legacy browsers
    optionsSuccessStatus: 204,

    // Preflight continue
    preflightContinue: false,
  };

  return corsConfig;
};

/**
 * Validate CORS configuration at startup
 */
export const validateCorsConfig = (configService: ConfigService): void => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  if (!frontendUrl && nodeEnv === 'production') {
    throw new Error(
      'FRONTEND_URL must be configured in production environment',
    );
  }

  const corsConfig = getCorsConfig(configService);

  // Log configuration for debugging
  logger.log('CORS Configuration initialized', {
    environment: nodeEnv,
    credentialsEnabled: corsConfig.credentials,
    maxAge: corsConfig.maxAge,
    methods: corsConfig.methods,
  });
};

/**
 * Get CORS configuration for specific routes
 */
export const getRouteCorsConfig = (
  route: string,
  configService: ConfigService,
): CorsOptions | undefined => {
  const baseConfig = getCorsConfig(configService);

  // Customize CORS for specific routes
  switch (route) {
    case '/api/webhook':
      // Webhooks might need different CORS settings
      return {
        ...baseConfig,
        origin: '*', // Allow any origin for webhooks
        credentials: false, // No credentials for webhooks
      };

    case '/api/public':
      // Public API endpoints
      return {
        ...baseConfig,
        origin: '*', // Allow any origin for public endpoints
        credentials: false,
        methods: ['GET', 'OPTIONS', 'HEAD'],
      };

    case '/api/health':
      // Health check endpoint
      return {
        origin: '*',
        credentials: false,
        methods: ['GET', 'OPTIONS'],
        maxAge: 3600,
      };

    default:
      return baseConfig;
  }
};

/**
 * CORS error handler
 */
export const handleCorsError = (err: Error, origin: string): void => {
  logger.error('CORS Error', {
    message: err.message,
    origin,
    timestamp: new Date().toISOString(),
  });

  // You can add custom error handling here
  // For example, send alerts for repeated CORS violations
};
