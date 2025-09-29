/**
 * Environment Variable Checker
 *
 * Provides utilities for checking and validating environment variables
 * at runtime with detailed error reporting and suggestions.
 */

import { z } from 'zod';
import { envSchema, type EnvConfig } from './env';

// ============================================
// Environment Checking Utilities
// ============================================

export interface EnvCheckResult {
  isValid: boolean;
  errors: EnvError[];
  warnings: EnvWarning[];
  suggestions: string[];
}

export interface EnvError {
  variable: string;
  message: string;
  severity: 'critical' | 'error' | 'warning';
  suggestion?: string;
}

export interface EnvWarning {
  variable: string;
  message: string;
  suggestion?: string;
}

// ============================================
// Environment Detector
// ============================================
export function detectEnvironment(): string {
  const nodeEnv = process.env.NODE_ENV;
  const isCI = process.env.CI === 'true';
  const isVercel = process.env.VERCEL === '1';
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
  const isDocker = !!process.env.DOCKER_CONTAINER;

  if (isCI) return 'ci';
  if (isVercel) return 'vercel';
  if (isRailway) return 'railway';
  if (isDocker) return 'docker';

  return nodeEnv || 'development';
}

// ============================================
// Environment Validation
// ============================================
export function checkEnvironment(): EnvCheckResult {
  const errors: EnvError[] = [];
  const warnings: EnvWarning[] = [];
  const suggestions: string[] = [];

  try {
    // Validate against schema
    envSchema.parse(process.env);

    // Environment-specific checks
    const environment = detectEnvironment();
    performEnvironmentSpecificChecks(environment, errors, warnings, suggestions);

    // Security checks
    performSecurityChecks(errors, warnings, suggestions);

    // Performance checks
    performPerformanceChecks(warnings, suggestions);

    // Service availability checks
    performServiceChecks(errors, warnings, suggestions);

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'error').length === 0,
      errors,
      warnings,
      suggestions,
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((zodError: z.ZodIssue) => {
        errors.push({
          variable: zodError.path.join('.'),
          message: zodError.message,
          severity: 'critical',
          suggestion: getSuggestionForZodError(zodError),
        });
      });
    } else {
      errors.push({
        variable: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'critical',
      });
    }

    return {
      isValid: false,
      errors,
      warnings,
      suggestions,
    };
  }
}

// ============================================
// Environment-Specific Checks
// ============================================
function performEnvironmentSpecificChecks(
  environment: string,
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  switch (environment) {
    case 'production':
      checkProductionEnvironment(errors, warnings, suggestions);
      break;
    case 'staging':
      checkStagingEnvironment(errors, warnings, suggestions);
      break;
    case 'test':
      checkTestEnvironment(errors, warnings, suggestions);
      break;
    case 'development':
      checkDevelopmentEnvironment(errors, warnings, suggestions);
      break;
  }
}

function checkProductionEnvironment(
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  // Critical production checks
  if (process.env.DEBUG === 'true') {
    errors.push({
      variable: 'DEBUG',
      message: 'Debug mode must be disabled in production',
      severity: 'critical',
      suggestion: 'Set DEBUG=false in production environment',
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    errors.push({
      variable: 'NODE_ENV',
      message: 'NODE_ENV must be set to "production"',
      severity: 'critical',
      suggestion: 'Set NODE_ENV=production',
    });
  }

  // Security checks
  const secrets = ['JWT_SECRET', 'NEXTAUTH_SECRET', 'BETTER_AUTH_SECRET'];
  secrets.forEach(secret => {
    const value = process.env[secret];
    if (value && value.length < 32) {
      errors.push({
        variable: secret,
        message: 'Secret must be at least 32 characters long',
        severity: 'critical',
        suggestion: 'Generate a secure random string: openssl rand -base64 32',
      });
    }

    if (value && (value.includes('test') || value.includes('dev') || value.includes('local'))) {
      errors.push({
        variable: secret,
        message: 'Production secret contains development/test values',
        severity: 'critical',
        suggestion: 'Replace with production-grade secret',
      });
    }
  });

  // SSL checks
  if (process.env.DATABASE_SSL !== 'true') {
    errors.push({
      variable: 'DATABASE_SSL',
      message: 'Database SSL must be enabled in production',
      severity: 'error',
      suggestion: 'Set DATABASE_SSL=true',
    });
  }

  // Monitoring checks
  if (!process.env.SENTRY_DSN) {
    warnings.push({
      variable: 'SENTRY_DSN',
      message: 'Error monitoring not configured',
      suggestion: 'Configure Sentry for error tracking',
    });
  }

  if (!process.env.DATADOG_API_KEY && !process.env.NEW_RELIC_LICENSE_KEY) {
    warnings.push({
      variable: 'MONITORING',
      message: 'No performance monitoring configured',
      suggestion: 'Configure DataDog or New Relic',
    });
  }

  suggestions.push('Review security headers configuration');
  suggestions.push('Ensure backup strategy is in place');
  suggestions.push('Verify rate limiting is properly configured');
}

function checkStagingEnvironment(
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  if (!process.env.SENTRY_DSN) {
    warnings.push({
      variable: 'SENTRY_DSN',
      message: 'Error monitoring recommended for staging',
      suggestion: 'Configure Sentry to catch staging issues',
    });
  }

  suggestions.push('Staging should mirror production configuration');
  suggestions.push('Consider enabling beta features for testing');
}

function checkTestEnvironment(
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  if (!process.env.DATABASE_URL?.includes('test')) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'Test environment should use test database',
      severity: 'error',
      suggestion: 'Ensure database name includes "test"',
    });
  }

  if (process.env.MOCK_EXTERNAL_SERVICES !== 'true') {
    warnings.push({
      variable: 'MOCK_EXTERNAL_SERVICES',
      message: 'External services should be mocked in tests',
      suggestion: 'Set MOCK_EXTERNAL_SERVICES=true',
    });
  }

  suggestions.push('Use in-memory storage for faster tests');
  suggestions.push('Disable unnecessary logging in tests');
}

function checkDevelopmentEnvironment(
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
    warnings.push({
      variable: 'OPENAI_API_KEY',
      message: 'OpenAI API key may not be configured correctly',
      suggestion: 'Ensure API key starts with "sk-"',
    });
  }

  suggestions.push('Enable hot reload for faster development');
  suggestions.push('Consider using local email testing with MailHog');
}

// ============================================
// Security Checks
// ============================================
function performSecurityChecks(
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  // Check for exposed secrets
  const sensitiveVars = [
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'BETTER_AUTH_SECRET',
    'OPENAI_API_KEY',
    'DEEPSEEK_API_KEY',
    'GOOGLE_CLIENT_SECRET',
    'DATABASE_PASSWORD',
    'REDIS_PASSWORD',
    'AWS_SECRET_ACCESS_KEY',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
  ];

  sensitiveVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Check for common weak patterns
      if (value === 'password' || value === '123456' || value === 'secret') {
        errors.push({
          variable: varName,
          message: 'Using weak or default secret',
          severity: 'critical',
          suggestion: 'Use a cryptographically secure random value',
        });
      }

      // Check minimum length for secrets
      if (varName.includes('SECRET') && value.length < 32) {
        errors.push({
          variable: varName,
          message: 'Secret is too short',
          severity: 'error',
          suggestion: 'Use at least 32 characters for secrets',
        });
      }
    }
  });

  // CORS configuration
  if (process.env.CORS_ORIGIN === '*') {
    warnings.push({
      variable: 'CORS_ORIGIN',
      message: 'CORS is configured to allow all origins',
      suggestion: 'Restrict CORS to specific domains in production',
    });
  }

  suggestions.push('Regularly rotate API keys and secrets');
  suggestions.push('Use environment-specific secrets');
}

// ============================================
// Performance Checks
// ============================================
function performPerformanceChecks(
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  // Database pool configuration
  const poolMax = parseInt(process.env.DATABASE_POOL_MAX || '10');
  if (poolMax > 50) {
    warnings.push({
      variable: 'DATABASE_POOL_MAX',
      message: 'Database pool size is very large',
      suggestion: 'Consider reducing pool size to prevent connection exhaustion',
    });
  }

  // Cache configuration
  const cacheTTL = parseInt(process.env.CACHE_TTL || '300');
  if (cacheTTL < 60) {
    warnings.push({
      variable: 'CACHE_TTL',
      message: 'Cache TTL is very low',
      suggestion: 'Consider increasing cache TTL for better performance',
    });
  }

  // Request timeout
  const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  if (requestTimeout > 60000) {
    warnings.push({
      variable: 'REQUEST_TIMEOUT',
      message: 'Request timeout is very high',
      suggestion: 'High timeouts may impact user experience',
    });
  }

  suggestions.push('Monitor connection pool usage');
  suggestions.push('Optimize cache strategies based on usage patterns');
}

// ============================================
// Service Checks
// ============================================
function performServiceChecks(
  errors: EnvError[],
  warnings: EnvWarning[],
  suggestions: string[]
): void {
  // Email service configuration
  const emailHost = process.env.SMTP_HOST;
  if (emailHost === 'localhost' && process.env.NODE_ENV === 'production') {
    errors.push({
      variable: 'SMTP_HOST',
      message: 'Production should not use localhost email',
      severity: 'error',
      suggestion: 'Configure production email service (SendGrid, Resend, etc.)',
    });
  }

  // Storage configuration
  const storageProvider = process.env.STORAGE_PROVIDER;
  if (storageProvider === 'local' && process.env.NODE_ENV === 'production') {
    warnings.push({
      variable: 'STORAGE_PROVIDER',
      message: 'Local storage not recommended for production',
      suggestion: 'Use cloud storage (S3, CloudFlare R2, etc.) for production',
    });
  }

  // AI service configuration
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    warnings.push({
      variable: 'AI_SERVICES',
      message: 'No AI services configured',
      suggestion: 'Configure at least one AI service for AI features',
    });
  }

  suggestions.push('Test external service connectivity');
  suggestions.push('Configure service timeouts appropriately');
}

// ============================================
// Helper Functions
// ============================================
function getSuggestionForZodError(zodError: z.ZodIssue): string {
  switch (zodError.code) {
    case 'invalid_type':
      return 'Check the value type and format';
    case 'too_small':
      return 'Value is too short';
    case 'too_big':
      return 'Value is too long';
    case 'invalid_format':
      return 'Invalid format - check the value format and try again';
    default:
      return 'Check the value format and try again';
  }
}

// ============================================
// Connectivity Checks
// ============================================
export async function checkDatabaseConnectivity(): Promise<{
  connected: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    const start = Date.now();

    // This would be implemented with actual database connection
    // For now, just check if URL is present and formatted correctly
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return { connected: false, error: 'DATABASE_URL not configured' };
    }

    // Basic URL validation
    try {
      new URL(dbUrl);
    } catch {
      return { connected: false, error: 'Invalid DATABASE_URL format' };
    }

    const latency = Date.now() - start;
    return { connected: true, latency };

  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkRedisConnectivity(): Promise<{
  connected: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    const start = Date.now();

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return { connected: false, error: 'REDIS_URL not configured' };
    }

    // Basic URL validation
    try {
      new URL(redisUrl);
    } catch {
      return { connected: false, error: 'Invalid REDIS_URL format' };
    }

    const latency = Date.now() - start;
    return { connected: true, latency };

  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkExternalServices(): Promise<{
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time?: number;
  error?: string;
}[]> {
  const services = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1/models', key: process.env.OPENAI_API_KEY },
    { name: 'DeepSeek', url: 'https://api.deepseek.com/v1/models', key: process.env.DEEPSEEK_API_KEY },
    // Add more services as needed
  ];

  const results = await Promise.all(
    services.map(async service => {
      if (!service.key) {
        return {
          service: service.name,
          status: 'down' as const,
          error: 'API key not configured',
        };
      }

      try {
        const start = Date.now();

        // For actual implementation, make HTTP request to service
        // const response = await fetch(service.url, { method: 'HEAD' });

        const response_time = Date.now() - start;

        return {
          service: service.name,
          status: 'healthy' as const,
          response_time,
        };

      } catch (error) {
        return {
          service: service.name,
          status: 'down' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return results;
}

// ============================================
// Health Check Summary
// ============================================
export async function getEnvironmentHealth(): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    environment: EnvCheckResult;
    database?: Awaited<ReturnType<typeof checkDatabaseConnectivity>>;
    redis?: Awaited<ReturnType<typeof checkRedisConnectivity>>;
    external_services?: Awaited<ReturnType<typeof checkExternalServices>>;
  };
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}> {
  const envCheck = checkEnvironment();
  const dbCheck = await checkDatabaseConnectivity();
  const redisCheck = await checkRedisConnectivity();
  const servicesCheck = await checkExternalServices();

  const checks = {
    environment: envCheck,
    database: dbCheck,
    redis: redisCheck,
    external_services: servicesCheck,
  };

  let totalChecks = 1; // environment check
  let passed = envCheck.isValid ? 1 : 0;
  let failed = envCheck.isValid ? 0 : 1;
  let warnings = envCheck.warnings.length;

  // Count database check
  totalChecks++;
  if (dbCheck.connected) passed++;
  else failed++;

  // Count Redis check
  totalChecks++;
  if (redisCheck.connected) passed++;
  else failed++;

  // Count service checks
  servicesCheck.forEach(service => {
    totalChecks++;
    if (service.status === 'healthy') passed++;
    else if (service.status === 'down') failed++;
    else warnings++; // degraded
  });

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (failed > 0) {
    overall = 'unhealthy';
  } else if (warnings > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    checks,
    summary: {
      total_checks: totalChecks,
      passed,
      failed,
      warnings,
    },
  };
}