#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all required environment variables are set for production deployment
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Required environment variables for each service
const requiredVars = {
  backend: [
    'DATABASE_URL',
    'JWT_SECRET',
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'FRONTEND_URL',
    'CORS_ORIGINS'
  ],
  frontend: [
    'NEXT_PUBLIC_API_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ]
};

// Optional but recommended variables
const recommendedVars = {
  backend: [
    'LOG_LEVEL',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
    'AI_RATE_LIMIT_WINDOW_MS',
    'AI_RATE_LIMIT_MAX_REQUESTS'
  ],
  frontend: [
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_SITE_NAME',
    'NEXT_PUBLIC_SITE_DESCRIPTION',
    'NEXT_PUBLIC_ENABLE_ANALYTICS'
  ]
};

function validateEnvironmentVariables(service, vars, isRequired = true) {
  log(`\n${isRequired ? '🔍' : '💡'} Checking ${isRequired ? 'required' : 'recommended'} ${service} variables:`, 'blue');
  
  let allValid = true;
  const missing = [];
  const present = [];
  
  vars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
      log(`  ✅ ${varName}`, 'green');
    } else {
      missing.push(varName);
      if (isRequired) {
        log(`  ❌ ${varName} (MISSING)`, 'red');
        allValid = false;
      } else {
        log(`  ⚠️  ${varName} (not set)`, 'yellow');
      }
    }
  });
  
  return { allValid, missing, present };
}

function validateSecretStrength(varName, minLength = 32) {
  const value = process.env[varName];
  if (!value) return false;
  
  if (value.length < minLength) {
    log(`  ⚠️  ${varName} is shorter than recommended ${minLength} characters`, 'yellow');
    return false;
  }
  
  // Check for common weak values
  const weakValues = [
    'your-secret-key',
    'change-this',
    'secret',
    'password',
    '123456',
    'test'
  ];
  
  if (weakValues.some(weak => value.toLowerCase().includes(weak))) {
    log(`  ⚠️  ${varName} appears to contain a weak/default value`, 'yellow');
    return false;
  }
  
  return true;
}

function validateUrls() {
  log('\n🌐 Validating URLs:', 'blue');
  
  const urls = [
    'NEXT_PUBLIC_API_URL',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_APP_URL',
    'FRONTEND_URL',
    'GOOGLE_CALLBACK_URL'
  ];
  
  urls.forEach(urlVar => {
    const url = process.env[urlVar];
    if (url) {
      try {
        new URL(url);
        if (url.startsWith('https://') || url.includes('localhost')) {
          log(`  ✅ ${urlVar}: ${url}`, 'green');
        } else {
          log(`  ⚠️  ${urlVar}: ${url} (should use HTTPS in production)`, 'yellow');
        }
      } catch (error) {
        log(`  ❌ ${urlVar}: ${url} (invalid URL format)`, 'red');
      }
    }
  });
}

function validateSecrets() {
  log('\n🔐 Validating secret strength:', 'blue');
  
  const secrets = [
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ];
  
  secrets.forEach(secret => {
    if (process.env[secret]) {
      if (validateSecretStrength(secret)) {
        log(`  ✅ ${secret} (strong)`, 'green');
      }
    }
  });
}

function generateMissingSecrets() {
  log('\n🔑 Generating missing secrets:', 'blue');
  
  const crypto = require('crypto');
  
  const secrets = ['JWT_SECRET', 'NEXTAUTH_SECRET'];
  
  secrets.forEach(secret => {
    if (!process.env[secret] || !validateSecretStrength(secret, 32)) {
      const generated = crypto.randomBytes(32).toString('base64');
      log(`  ${secret}=${generated}`, 'cyan');
    }
  });
}

function checkDatabaseConnection() {
  log('\n🗄️  Database configuration:', 'blue');
  
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      log(`  ✅ Database URL format is valid`, 'green');
      log(`  📊 Host: ${url.hostname}`, 'cyan');
      log(`  📊 Database: ${url.pathname.slice(1)}`, 'cyan');
      
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        log(`  ⚠️  Using localhost database in production check`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ Invalid database URL format`, 'red');
    }
  }
}

function main() {
  log('🚀 Study Teddy Production Environment Validation', 'magenta');
  log('================================================', 'magenta');
  
  const service = process.argv[2] || 'all';
  const generateSecrets = process.argv.includes('--generate-secrets');
  
  let overallValid = true;
  
  if (service === 'all' || service === 'backend') {
    const backendResult = validateEnvironmentVariables('backend', requiredVars.backend);
    validateEnvironmentVariables('backend', recommendedVars.backend, false);
    overallValid = overallValid && backendResult.allValid;
  }
  
  if (service === 'all' || service === 'frontend') {
    const frontendResult = validateEnvironmentVariables('frontend', requiredVars.frontend);
    validateEnvironmentVariables('frontend', recommendedVars.frontend, false);
    overallValid = overallValid && frontendResult.allValid;
  }
  
  validateUrls();
  validateSecrets();
  checkDatabaseConnection();
  
  if (generateSecrets) {
    generateMissingSecrets();
  }
  
  log('\n================================================', 'magenta');
  
  if (overallValid) {
    log('✅ All required environment variables are configured!', 'green');
    log('🚀 Ready for production deployment', 'green');
  } else {
    log('❌ Some required environment variables are missing', 'red');
    log('🔧 Please configure the missing variables before deployment', 'yellow');
    
    if (!generateSecrets) {
      log('💡 Run with --generate-secrets to generate missing secrets', 'cyan');
    }
    
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node validate-production-env.js [service] [options]

Arguments:
  service           backend|frontend|all (default: all)

Options:
  --generate-secrets  Generate missing secret values
  --help, -h         Show this help message

Examples:
  node validate-production-env.js
  node validate-production-env.js backend
  node validate-production-env.js --generate-secrets
`);
  process.exit(0);
}

main();