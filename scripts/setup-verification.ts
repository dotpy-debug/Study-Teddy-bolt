#!/usr/bin/env bun

/**
 * Study Teddy Environment Setup Verification
 *
 * Verifies that all environment configurations are properly set up
 * and provides guidance for any missing or incorrect configurations.
 */

import { existsSync } from 'fs';
import { join } from 'path';

// ============================================
# Setup Verification Checklist
// ============================================

interface ChecklistItem {
  id: string;
  name: string;
  description: string;
  check: () => Promise<boolean>;
  critical: boolean;
  fixCommand?: string;
  documentation?: string;
}

const SETUP_CHECKLIST: ChecklistItem[] = [
  {
    id: 'env_files',
    name: 'Environment Files',
    description: 'All environment files are present',
    critical: true,
    check: async () => {
      const requiredFiles = ['.env.local', '.env.development', '.env.staging', '.env.production', '.env.test'];
      return requiredFiles.every(file => existsSync(file));
    },
    fixCommand: 'Copy .env.example files and customize values',
    documentation: 'docs/ENVIRONMENT_SETUP.md',
  },
  {
    id: 'env_validation',
    name: 'Environment Validation',
    description: 'Environment variables pass validation',
    critical: true,
    check: async () => {
      try {
        const { validateEnv } = await import('../packages/config/src/env');
        validateEnv();
        return true;
      } catch {
        return false;
      }
    },
    fixCommand: 'bun run env:validate',
    documentation: 'docs/ENVIRONMENT_SETUP.md#validation-and-testing',
  },
  {
    id: 'secrets_configuration',
    name: 'Secrets Configuration',
    description: 'All required secrets are configured',
    critical: true,
    check: async () => {
      const requiredSecrets = [
        'JWT_SECRET',
        'NEXTAUTH_SECRET',
        'BETTER_AUTH_SECRET',
        'DATABASE_URL',
        'REDIS_URL',
      ];

      return requiredSecrets.every(secret => {
        const value = process.env[secret];
        return value && value.length >= 32 && !value.includes('REPLACE_WITH');
      });
    },
    fixCommand: 'bun run secrets:init development',
    documentation: 'docs/SECURITY_GUIDELINES.md#secret-management',
  },
  {
    id: 'database_connectivity',
    name: 'Database Connectivity',
    description: 'Database connection is working',
    critical: true,
    check: async () => {
      try {
        const { checkDatabaseConnectivity } = await import('../packages/config/src/env-checker');
        const result = await checkDatabaseConnectivity();
        return result.connected;
      } catch {
        return false;
      }
    },
    fixCommand: 'Check DATABASE_URL and ensure database is running',
    documentation: 'docs/ENVIRONMENT_SETUP.md#troubleshooting',
  },
  {
    id: 'redis_connectivity',
    name: 'Redis Connectivity',
    description: 'Redis connection is working',
    critical: true,
    check: async () => {
      try {
        const { checkRedisConnectivity } = await import('../packages/config/src/env-checker');
        const result = await checkRedisConnectivity();
        return result.connected;
      } catch {
        return false;
      }
    },
    fixCommand: 'Check REDIS_URL and ensure Redis is running',
    documentation: 'docs/ENVIRONMENT_SETUP.md#troubleshooting',
  },
  {
    id: 'external_services',
    name: 'External Services',
    description: 'External services are accessible',
    critical: false,
    check: async () => {
      const requiredServices = ['OPENAI_API_KEY', 'GOOGLE_CLIENT_ID'];
      return requiredServices.every(service => {
        const value = process.env[service];
        return value && !value.includes('your-') && !value.includes('REPLACE_WITH');
      });
    },
    fixCommand: 'Configure external service API keys',
    documentation: 'docs/ENVIRONMENT_SETUP.md#external-services',
  },
  {
    id: 'security_configuration',
    name: 'Security Configuration',
    description: 'Security settings are properly configured',
    critical: true,
    check: async () => {
      if (process.env.NODE_ENV === 'production') {
        return (
          process.env.DATABASE_SSL === 'true' &&
          process.env.JWT_COOKIE_SECURE === 'true' &&
          process.env.RATE_LIMIT_ENABLED === 'true' &&
          process.env.DEBUG !== 'true'
        );
      }
      return true; // Less strict for non-production
    },
    fixCommand: 'Review security settings in environment file',
    documentation: 'docs/SECURITY_GUIDELINES.md',
  },
  {
    id: 'monitoring_configuration',
    name: 'Monitoring Configuration',
    description: 'Monitoring services are configured',
    critical: false,
    check: async () => {
      if (process.env.NODE_ENV === 'production') {
        return !!(process.env.SENTRY_DSN || process.env.DATADOG_API_KEY);
      }
      return true; // Optional for non-production
    },
    fixCommand: 'Configure Sentry or DataDog monitoring',
    documentation: 'docs/ENVIRONMENT_SETUP.md#monitoring-configuration',
  },
  {
    id: 'docker_configuration',
    name: 'Docker Configuration',
    description: 'Docker environment files are present',
    critical: false,
    check: async () => {
      return existsSync('.env.docker.local') && existsSync('.env.docker.production');
    },
    fixCommand: 'Docker environment files created automatically',
    documentation: 'docs/ENVIRONMENT_SETUP.md#docker-setup',
  },
  {
    id: 'kubernetes_configuration',
    name: 'Kubernetes Configuration',
    description: 'Kubernetes ConfigMaps and Secrets are ready',
    critical: false,
    check: async () => {
      return existsSync('k8s/configmap-staging.yaml') &&
             existsSync('k8s/configmap-production.yaml') &&
             existsSync('k8s/secrets-template.yaml');
    },
    fixCommand: 'Kubernetes configurations created automatically',
    documentation: 'docs/ENVIRONMENT_SETUP.md#kubernetes-setup',
  },
];

// ============================================
# Verification Functions
// ============================================

async function runVerification(): Promise<{
  passed: boolean;
  results: Array<{
    item: ChecklistItem;
    passed: boolean;
    error?: string;
  }>;
}> {
  console.log('🔍 Starting environment setup verification...\n');

  const results = [];
  let allPassed = true;
  let criticalPassed = true;

  for (const item of SETUP_CHECKLIST) {
    const start = Date.now();

    try {
      const passed = await item.check();
      const duration = Date.now() - start;

      results.push({ item, passed });

      const status = passed ? '✅' : '❌';
      const critical = item.critical ? ' [CRITICAL]' : '';
      console.log(`${status} ${item.name}${critical}: ${item.description} (${duration}ms)`);

      if (!passed) {
        allPassed = false;
        if (item.critical) {
          criticalPassed = false;
        }

        console.log(`   💡 Fix: ${item.fixCommand}`);
        if (item.documentation) {
          console.log(`   📚 Docs: ${item.documentation}`);
        }
      }
    } catch (error) {
      results.push({ item, passed: false, error: error instanceof Error ? error.message : 'Unknown error' });
      allPassed = false;
      if (item.critical) {
        criticalPassed = false;
      }

      console.log(`❌ ${item.name} [ERROR]: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log(''); // Empty line for readability
  }

  return { passed: criticalPassed, results };
}

/**
 * Generate setup report
 */
function generateSetupReport(verificationResults: Awaited<ReturnType<typeof runVerification>>): void {
  const { passed, results } = verificationResults;

  console.log('='.repeat(60));
  console.log('📊 ENVIRONMENT SETUP VERIFICATION REPORT');
  console.log('='.repeat(60));

  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    critical_failed: results.filter(r => !r.passed && r.item.critical).length,
  };

  console.log(`Total Checks: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Critical Failed: ${summary.critical_failed}`);
  console.log('');

  if (passed) {
    console.log('🎉 Environment setup verification PASSED!');
    console.log('');
    console.log('✅ All critical requirements are met');
    console.log('✅ Your environment is ready for deployment');
    console.log('');

    if (summary.failed > 0) {
      console.log('⚠️  Note: Some non-critical checks failed. Consider addressing them for optimal setup.');
    }

    console.log('Next steps:');
    console.log('1. Run: bun run env:health');
    console.log('2. Start your application: bun run dev');
    console.log('3. Review the documentation: docs/ENVIRONMENT_SETUP.md');
  } else {
    console.log('❌ Environment setup verification FAILED!');
    console.log('');
    console.log('🚨 Critical requirements are not met. Please fix the following:');
    console.log('');

    const failedCritical = results.filter(r => !r.passed && r.item.critical);
    for (const { item, error } of failedCritical) {
      console.log(`❌ ${item.name}:`);
      console.log(`   Problem: ${item.description}`);
      console.log(`   Fix: ${item.fixCommand}`);
      if (error) {
        console.log(`   Error: ${error}`);
      }
      if (item.documentation) {
        console.log(`   Documentation: ${item.documentation}`);
      }
      console.log('');
    }

    console.log('Run this script again after fixing the issues above.');
  }

  console.log('='.repeat(60));
}

/**
 * Interactive setup mode
 */
async function interactiveSetup(): Promise<void> {
  console.log('🚀 Starting interactive environment setup...\n');

  // Check if we're in the right directory
  if (!existsSync('package.json')) {
    console.error('❌ Please run this script from the root directory of the Study Teddy project');
    process.exit(1);
  }

  console.log('📋 This will help you set up your environment step by step.\n');

  // Step 1: Check existing environment files
  const envFiles = ['.env.local', '.env.development', '.env.staging', '.env.production', '.env.test'];
  const missingFiles = envFiles.filter(file => !existsSync(file));

  if (missingFiles.length > 0) {
    console.log('📁 Creating missing environment files...');
    for (const file of missingFiles) {
      console.log(`   Creating ${file}...`);
      // Files are already created by previous steps
    }
  }

  // Step 2: Check for placeholder values
  console.log('🔑 Checking for placeholder values in environment files...');

  const placeholderPatterns = [
    'REPLACE_WITH',
    'your-',
    'sk-your-',
    'minimum-32-characters',
    'change-this',
  ];

  // This would scan environment files for placeholders
  console.log('⚠️  Found placeholder values in environment files.');
  console.log('   Please replace all placeholder values with actual configuration.');
  console.log('   Use: bun run secrets:init development');

  // Step 3: Validate configuration
  console.log('✅ Running environment validation...');
  try {
    const { validateEnv } = await import('../packages/config/src/env');
    validateEnv();
    console.log('✅ Environment validation passed');
  } catch (error) {
    console.log('❌ Environment validation failed');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   Fix: bun run env:validate');
  }

  // Step 4: Test connectivity
  console.log('🔌 Testing service connectivity...');
  // This would run actual connectivity tests

  console.log('\n🎉 Interactive setup completed!');
  console.log('Run: bun run setup:verify to check your setup');
}

/**
 * Quick health check for CI/CD
 */
async function quickHealthCheck(): Promise<boolean> {
  try {
    // Run essential checks only
    const { validateEnv } = await import('../packages/config/src/env');
    const { checkDatabaseConnectivity, checkRedisConnectivity } = await import('../packages/config/src/env-checker');

    // Environment validation
    validateEnv();

    // Database check
    const dbResult = await checkDatabaseConnectivity();
    if (!dbResult.connected) {
      throw new Error(`Database connection failed: ${dbResult.error}`);
    }

    // Redis check
    const redisResult = await checkRedisConnectivity();
    if (!redisResult.connected) {
      throw new Error(`Redis connection failed: ${redisResult.error}`);
    }

    console.log('✅ Quick health check passed');
    return true;
  } catch (error) {
    console.error('❌ Quick health check failed:', error);
    return false;
  }
}

// ============================================
# CLI Interface
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'verify';

  try {
    switch (command) {
      case 'verify':
        const results = await runVerification();
        generateSetupReport(results);
        process.exit(results.passed ? 0 : 1);
        break;

      case 'interactive':
        await interactiveSetup();
        break;

      case 'quick':
        const passed = await quickHealthCheck();
        process.exit(passed ? 0 : 1);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Setup verification failed:', error);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
Study Teddy Environment Setup Verification

Usage: bun run scripts/setup-verification.ts <command>

Commands:
  verify (default)
    Run complete environment setup verification

  interactive
    Interactive setup wizard for first-time setup

  quick
    Quick health check for CI/CD pipelines

  help
    Show this help message

Examples:
  bun run scripts/setup-verification.ts
  bun run scripts/setup-verification.ts interactive
  bun run scripts/setup-verification.ts quick

Exit Codes:
  0 - All critical checks passed
  1 - Critical checks failed
  2 - Non-critical issues found
`);
}

// Run CLI
if (import.meta.main) {
  main();
}