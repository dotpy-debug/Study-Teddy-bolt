#!/usr/bin/env bun

/**
 * Environment Validation Script
 *
 * This script validates environment variables for all deployment stages
 * and provides detailed feedback on missing or invalid configurations.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateEnv, checkRequiredEnvVars, REQUIRED_ENV_VARS } from '../packages/config/src/env';

// ============================================
// Color Utilities for Console Output
// ============================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// ============================================
// Environment File Loader
// ============================================
function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};

  content.split('\n').forEach((line) => {
    line = line.trim();

    // Skip comments and empty lines
    if (!line || line.startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key.trim()] = value;
    }
  });

  return env;
}

// ============================================
// Environment Validation Functions
// ============================================
function validateEnvironment(envName: string, envVars: Record<string, string>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    total: number;
    required: number;
    missing: number;
    invalid: number;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log(colorize(`\n🔍 Validating ${envName.toUpperCase()} environment...`, 'cyan'));

  try {
    // Check required variables
    const requiredVars = REQUIRED_ENV_VARS[envName as keyof typeof REQUIRED_ENV_VARS] || [];
    const missingVars = requiredVars.filter(varName => !envVars[varName]);

    if (missingVars.length > 0) {
      errors.push(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Validate using Zod schema
    const validatedEnv = validateEnv(envVars);

    // Environment-specific validations
    if (envName === 'production') {
      validateProductionEnvironment(validatedEnv, errors, warnings);
    } else if (envName === 'staging') {
      validateStagingEnvironment(validatedEnv, errors, warnings);
    } else if (envName === 'test') {
      validateTestEnvironment(validatedEnv, errors, warnings);
    }

    const summary = {
      total: Object.keys(envVars).length,
      required: requiredVars.length,
      missing: missingVars.length,
      invalid: errors.length,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary,
    };

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      isValid: false,
      errors,
      warnings,
      summary: {
        total: Object.keys(envVars).length,
        required: 0,
        missing: 0,
        invalid: errors.length,
      },
    };
  }
}

function validateProductionEnvironment(env: any, errors: string[], warnings: string[]): void {
  // Security validations
  if (env.DEBUG) {
    errors.push('DEBUG mode must be disabled in production');
  }

  if (env.API_DOCS_ENABLED || env.SWAGGER_ENABLED) {
    errors.push('API documentation must be disabled in production');
  }

  if (!env.JWT_COOKIE_SECURE) {
    errors.push('JWT cookies must be secure in production');
  }

  if (!env.DATABASE_SSL) {
    errors.push('Database SSL must be enabled in production');
  }

  // Check for default/test secrets
  const secrets = ['JWT_SECRET', 'NEXTAUTH_SECRET', 'BETTER_AUTH_SECRET'];
  secrets.forEach(secret => {
    const value = env[secret];
    if (value && (value.includes('test') || value.includes('dev') || value.includes('local'))) {
      errors.push(`${secret} appears to contain test/dev values in production`);
    }
  });

  // Monitoring requirements
  if (!env.SENTRY_ENABLED) {
    warnings.push('Sentry monitoring is not enabled');
  }

  if (!env.DATADOG_ENABLED) {
    warnings.push('DataDog monitoring is not enabled');
  }

  // Performance warnings
  if (env.LOG_LEVEL === 'debug') {
    warnings.push('Debug logging may impact performance in production');
  }
}

function validateStagingEnvironment(env: any, errors: string[], warnings: string[]): void {
  if (!env.SENTRY_ENABLED) {
    warnings.push('Sentry monitoring should be enabled in staging');
  }

  if (!env.DATABASE_SSL) {
    errors.push('Database SSL should be enabled in staging');
  }

  if (env.FEATURE_BETA_FEATURES && !env.FEATURE_A_B_TESTING) {
    warnings.push('A/B testing should be enabled when beta features are active');
  }
}

function validateTestEnvironment(env: any, errors: string[], warnings: string[]): void {
  if (!env.MOCK_EXTERNAL_SERVICES) {
    warnings.push('External services should be mocked in test environment');
  }

  if (!env.DATABASE_URL.includes('test')) {
    errors.push('Test environment should use a test database');
  }

  if (env.SENTRY_ENABLED) {
    warnings.push('Sentry should typically be disabled in test environment');
  }
}

// ============================================
// Report Generation
// ============================================
function generateReport(results: Array<{
  envName: string;
  result: ReturnType<typeof validateEnvironment>;
}>): void {
  console.log(colorize('\n📊 ENVIRONMENT VALIDATION REPORT', 'bright'));
  console.log('='.repeat(50));

  let allValid = true;
  let totalErrors = 0;
  let totalWarnings = 0;

  results.forEach(({ envName, result }) => {
    const status = result.isValid ?
      colorize('✅ VALID', 'green') :
      colorize('❌ INVALID', 'red');

    console.log(`\n${envName.toUpperCase()}: ${status}`);
    console.log(`  Variables: ${result.summary.total}`);
    console.log(`  Required: ${result.summary.required}`);
    console.log(`  Missing: ${result.summary.missing}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log(colorize('\n  ERRORS:', 'red'));
      result.errors.forEach(error => {
        console.log(colorize(`    • ${error}`, 'red'));
      });
      allValid = false;
      totalErrors += result.errors.length;
    }

    if (result.warnings.length > 0) {
      console.log(colorize('\n  WARNINGS:', 'yellow'));
      result.warnings.forEach(warning => {
        console.log(colorize(`    • ${warning}`, 'yellow'));
      });
      totalWarnings += result.warnings.length;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(colorize('SUMMARY:', 'bright'));
  console.log(`Total Errors: ${colorize(totalErrors.toString(), totalErrors > 0 ? 'red' : 'green')}`);
  console.log(`Total Warnings: ${colorize(totalWarnings.toString(), totalWarnings > 0 ? 'yellow' : 'green')}`);
  console.log(`Overall Status: ${allValid ? colorize('PASS', 'green') : colorize('FAIL', 'red')}`);

  if (!allValid) {
    console.log(colorize('\n⚠️  Please fix the errors above before proceeding with deployment.', 'yellow'));
    process.exit(1);
  } else {
    console.log(colorize('\n🎉 All environment configurations are valid!', 'green'));
  }
}

// ============================================
// Main Validation Function
// ============================================
async function main(): Promise<void> {
  const rootDir = process.cwd();
  const environments = ['local', 'development', 'staging', 'production', 'test'];
  const results: Array<{
    envName: string;
    result: ReturnType<typeof validateEnvironment>;
  }> = [];

  console.log(colorize('🚀 Starting Environment Validation', 'bright'));
  console.log(`Root Directory: ${rootDir}`);

  for (const envName of environments) {
    try {
      const envFilePath = join(rootDir, `.env.${envName}`);

      if (!existsSync(envFilePath)) {
        console.log(colorize(`⏭️  Skipping ${envName} (file not found: ${envFilePath})`, 'yellow'));
        continue;
      }

      const envVars = loadEnvFile(envFilePath);
      const result = validateEnvironment(envName, envVars);

      results.push({ envName, result });

    } catch (error) {
      console.error(colorize(`❌ Error validating ${envName}: ${error}`, 'red'));
      results.push({
        envName,
        result: {
          isValid: false,
          errors: [`Failed to load or parse environment file: ${error}`],
          warnings: [],
          summary: { total: 0, required: 0, missing: 0, invalid: 1 },
        },
      });
    }
  }

  if (results.length === 0) {
    console.log(colorize('⚠️  No environment files found to validate', 'yellow'));
    console.log('Expected files: .env.local, .env.development, .env.staging, .env.production, .env.test');
    process.exit(1);
  }

  generateReport(results);
}

// ============================================
// CLI Arguments Handling
// ============================================
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colorize('Environment Validation Script', 'bright')}

Usage: bun run scripts/validate-env.ts [options]

Options:
  --help, -h     Show this help message
  --env <name>   Validate specific environment only
  --strict       Exit with error on warnings

Examples:
  bun run scripts/validate-env.ts
  bun run scripts/validate-env.ts --env production
  bun run scripts/validate-env.ts --strict
`);
  process.exit(0);
}

if (args.includes('--env')) {
  const envIndex = args.indexOf('--env');
  const envName = args[envIndex + 1];

  if (!envName) {
    console.error(colorize('❌ Environment name required after --env flag', 'red'));
    process.exit(1);
  }

  console.log(colorize(`🔍 Validating single environment: ${envName}`, 'cyan'));
  // TODO: Implement single environment validation
}

// Run the validation
main().catch(error => {
  console.error(colorize(`❌ Validation failed: ${error}`, 'red'));
  process.exit(1);
});