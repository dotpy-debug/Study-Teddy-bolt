import { z } from 'zod';

// ============================================
// Base Environment Schema
// ============================================
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['local', 'development', 'staging', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('Study Teddy'),
  APP_VERSION: z.string().default('1.0.0'),
  DEBUG: z.string().transform(val => val === 'true').default(false),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// ============================================
// Server Configuration Schema
// ============================================
const serverSchema = z.object({
  PORT: z.string().transform(Number).default(3001),
  HOST: z.string().default('localhost'),
  BACKEND_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
});

// ============================================
// Database Configuration Schema
// ============================================
const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.string().transform(Number).optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_USERNAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_SSL: z.string().transform(val => val === 'true').default(true),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.string().transform(val => val === 'true').default(true),
  DATABASE_POOL_MIN: z.string().transform(Number).default(2),
  DATABASE_POOL_MAX: z.string().transform(Number).default(10),
  DATABASE_LOG: z.string().transform(val => val === 'true').default(false),
});

// ============================================
// Redis Configuration Schema
// ============================================
const redisSchema = z.object({
  REDIS_URL: z.string().min(1, 'Redis URL is required'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(Number).optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default(0),
  REDIS_TTL: z.string().transform(Number).default(3600),
});

// ============================================
// Authentication Configuration Schema
// ============================================
const authSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_EXPIRE_TIME: z.string().default('7d'),
  JWT_REFRESH_EXPIRE_TIME: z.string().default('30d'),
  JWT_COOKIE_SECURE: z.string().transform(val => val === 'true').default(true),
  JWT_COOKIE_HTTP_ONLY: z.string().transform(val => val === 'true').default(true),
  JWT_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  BETTER_AUTH_SECRET: z.string().min(32, 'Better Auth secret must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url(),

  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
});

// ============================================
// OAuth Configuration Schema
// ============================================
const oauthSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  GOOGLE_CALLBACK_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1, 'Public Google Client ID is required'),
});

// ============================================
// AI Services Configuration Schema
// ============================================
const aiServicesSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).default(1000),
  OPENAI_TEMPERATURE: z.string().transform(Number).default(0.7),
  OPENAI_RATE_LIMIT_RPM: z.string().transform(Number).optional(),
  OPENAI_ORGANIZATION_ID: z.string().optional(),

  DEEPSEEK_API_KEY: z.string().min(1, 'DeepSeek API key is required'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com/v1'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
});

// ============================================
// Email Configuration Schema
// ============================================
const emailSchema = z.object({
  SMTP_HOST: z.string().min(1, 'SMTP host is required'),
  SMTP_PORT: z.string().transform(Number).default(587),
  SMTP_SECURE: z.string().transform(val => val === 'true').default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email('Invalid email format'),

  RESEND_API_KEY: z.string().optional(),
});

// ============================================
// Storage Configuration Schema
// ============================================
const storageSchema = z.object({
  STORAGE_PROVIDER: z.enum(['local', 's3', 'memory']).default('local'),
  STORAGE_LOCAL_PATH: z.string().optional(),
  STORAGE_LOCAL_URL: z.string().url().optional(),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_CLOUDFRONT_DOMAIN: z.string().optional(),
  AWS_S3_ENCRYPTION: z.string().optional(),
});

// ============================================
// Security Configuration Schema
// ============================================
const securitySchema = z.object({
  CORS_ORIGIN: z.string(),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default(true),
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default(true),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
  HELMET_ENABLED: z.string().transform(val => val === 'true').default(true),
  CSRF_ENABLED: z.string().transform(val => val === 'true').default(true),
  CSP_ENABLED: z.string().transform(val => val === 'true').default(false),
  HSTS_ENABLED: z.string().transform(val => val === 'true').default(false),
  XSS_PROTECTION: z.string().transform(val => val === 'true').default(true),
});

// ============================================
// Monitoring Configuration Schema
// ============================================
const monitoringSchema = z.object({
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_ENABLED: z.string().transform(val => val === 'true').default(false),
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.string().transform(Number).default(0.1),
  SENTRY_RELEASE: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  DATADOG_API_KEY: z.string().optional(),
  DATADOG_APP_KEY: z.string().optional(),
  DATADOG_ENABLED: z.string().transform(val => val === 'true').default(false),
  DATADOG_SERVICE: z.string().optional(),

  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  NEW_RELIC_APP_NAME: z.string().optional(),

  NEXT_PUBLIC_GA_TRACKING_ID: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
});

// ============================================
// Feature Flags Schema
// ============================================
const featureFlagsSchema = z.object({
  FEATURE_AI_TUTOR: z.string().transform(val => val === 'true').default(true),
  FEATURE_FLASHCARDS: z.string().transform(val => val === 'true').default(true),
  FEATURE_ANALYTICS: z.string().transform(val => val === 'true').default(true),
  FEATURE_GAMIFICATION: z.string().transform(val => val === 'true').default(true),
  FEATURE_CALENDAR_INTEGRATION: z.string().transform(val => val === 'true').default(true),
  FEATURE_FILE_UPLOAD: z.string().transform(val => val === 'true').default(true),
  FEATURE_REAL_TIME_SYNC: z.string().transform(val => val === 'true').default(true),
  FEATURE_BETA_FEATURES: z.string().transform(val => val === 'true').default(false),
  FEATURE_A_B_TESTING: z.string().transform(val => val === 'true').default(false),
  FEATURE_MAINTENANCE_MODE: z.string().transform(val => val === 'true').default(false),
});

// ============================================
// Performance Configuration Schema
// ============================================
const performanceSchema = z.object({
  CACHE_TTL: z.string().transform(Number).default(300),
  SESSION_TIMEOUT: z.string().transform(Number).default(1800000),
  REQUEST_TIMEOUT: z.string().transform(Number).default(30000),
  HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default(true),
  METRICS_ENABLED: z.string().transform(val => val === 'true').default(true),
  PERFORMANCE_MONITORING: z.string().transform(val => val === 'true').default(false),
  CONNECTION_POOLING: z.string().transform(val => val === 'true').default(true),
  COMPRESSION_ENABLED: z.string().transform(val => val === 'true').default(true),
  GZIP_ENABLED: z.string().transform(val => val === 'true').default(true),
  BROTLI_ENABLED: z.string().transform(val => val === 'true').default(false),
});

// ============================================
// Development Tools Schema
// ============================================
const devToolsSchema = z.object({
  API_DOCS_ENABLED: z.string().transform(val => val === 'true').default(false),
  SWAGGER_ENABLED: z.string().transform(val => val === 'true').default(false),
  HOT_RELOAD_ENABLED: z.string().transform(val => val === 'true').default(false),
  SOURCE_MAPS_ENABLED: z.string().transform(val => val === 'true').default(true),
});

// ============================================
// Testing Configuration Schema
// ============================================
const testingSchema = z.object({
  MOCK_EXTERNAL_SERVICES: z.string().transform(val => val === 'true').default(false),
  MOCK_AI_RESPONSES: z.string().transform(val => val === 'true').default(false),
  MOCK_EMAIL_SENDING: z.string().transform(val => val === 'true').default(false),
  MOCK_FILE_UPLOADS: z.string().transform(val => val === 'true').default(false),
  MOCK_CALENDAR_API: z.string().transform(val => val === 'true').default(false),
  TEST_DATABASE_AUTO_CREATE: z.string().transform(val => val === 'true').default(false),
  TEST_DATABASE_AUTO_DROP: z.string().transform(val => val === 'true').default(false),
});

// ============================================
// Complete Environment Schema
// ============================================
export const envSchema = baseEnvSchema
  .merge(serverSchema)
  .merge(databaseSchema)
  .merge(redisSchema)
  .merge(authSchema)
  .merge(oauthSchema)
  .merge(aiServicesSchema)
  .merge(emailSchema)
  .merge(storageSchema)
  .merge(securitySchema)
  .merge(monitoringSchema)
  .merge(featureFlagsSchema)
  .merge(performanceSchema)
  .merge(devToolsSchema)
  .merge(testingSchema);

// ============================================
// Environment-specific Schema Refinements
// ============================================
export const productionEnvSchema = envSchema.refine(
  (data) => {
    // Production-specific validations
    if (data.NODE_ENV === 'production') {
      // Ensure secrets are not default values
      if (data.JWT_SECRET.includes('test') || data.JWT_SECRET.includes('dev')) {
        return false;
      }
      if (data.NEXTAUTH_SECRET.includes('test') || data.NEXTAUTH_SECRET.includes('dev')) {
        return false;
      }
      if (data.BETTER_AUTH_SECRET.includes('test') || data.BETTER_AUTH_SECRET.includes('dev')) {
        return false;
      }
      // Ensure SSL is enabled
      if (!data.DATABASE_SSL) {
        return false;
      }
      if (!data.JWT_COOKIE_SECURE) {
        return false;
      }
      // Ensure sensitive features are disabled
      if (data.API_DOCS_ENABLED || data.SWAGGER_ENABLED) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Production environment validation failed',
  }
);

export const stagingEnvSchema = envSchema.refine(
  (data) => {
    // Staging-specific validations
    if (data.NODE_ENV === 'staging') {
      // Ensure monitoring is enabled
      if (!data.SENTRY_ENABLED) {
        return false;
      }
      // Ensure proper SSL configuration
      if (!data.DATABASE_SSL) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Staging environment validation failed',
  }
);

export const testEnvSchema = envSchema.refine(
  (data) => {
    // Test-specific validations
    if (data.NODE_ENV === 'test') {
      // Ensure mocking is enabled for external services
      if (!data.MOCK_EXTERNAL_SERVICES) {
        return false;
      }
      // Ensure test database is configured
      if (!data.DATABASE_URL.includes('test')) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Test environment validation failed',
  }
);

// ============================================
// Type Definitions
// ============================================
export type EnvConfig = z.infer<typeof envSchema>;
export type ProductionEnvConfig = z.infer<typeof productionEnvSchema>;
export type StagingEnvConfig = z.infer<typeof stagingEnvSchema>;
export type TestEnvConfig = z.infer<typeof testEnvSchema>;

// ============================================
// Environment Validation Function
// ============================================
export function validateEnv(env: Record<string, string | undefined> = process.env): EnvConfig {
  try {
    const nodeEnv = env.NODE_ENV || 'development';

    // Choose appropriate schema based on environment
    let schema = envSchema;

    switch (nodeEnv) {
      case 'production':
        schema = productionEnvSchema;
        break;
      case 'staging':
        schema = stagingEnvSchema;
        break;
      case 'test':
        schema = testEnvSchema;
        break;
      default:
        schema = envSchema;
    }

    return schema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
}

// ============================================
// Environment Checker
// ============================================
export function checkRequiredEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// ============================================
// Environment-specific Required Variables
// ============================================
export const REQUIRED_ENV_VARS = {
  local: [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'BETTER_AUTH_SECRET',
  ],
  development: [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'BETTER_AUTH_SECRET',
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ],
  staging: [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'BETTER_AUTH_SECRET',
    'OPENAI_API_KEY',
    'DEEPSEEK_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SENTRY_DSN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ],
  production: [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'BETTER_AUTH_SECRET',
    'OPENAI_API_KEY',
    'DEEPSEEK_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SENTRY_DSN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'RESEND_API_KEY',
    'DATADOG_API_KEY',
  ],
  test: [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'BETTER_AUTH_SECRET',
  ],
} as const;

// ============================================
// Export validated environment
// ============================================
export const env = validateEnv();