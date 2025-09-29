#!/usr/bin/env bun

/**
 * Environment Validation Script
 * Validates required environment variables and generates secrets if needed
 */

import { existsSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

const requiredEnvVars = {
  backend: [
    'DATABASE_URL',
    'JWT_SECRET',
    'OPENAI_API_KEY'
  ],
  frontend: [
    'NEXT_PUBLIC_API_URL'
  ],
  optional: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'REDIS_URL',
    'NODE_ENV'
  ]
};

function generateSecret(length = 32) {
  return randomBytes(length).toString('hex');
}

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  const missing = [];
  const warnings = [];
  
  // Check required backend variables
  console.log('📋 Backend variables:');
  requiredEnvVars.backend.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missing.push(varName);
    }
  });
  
  // Check required frontend variables
  console.log('\n📋 Frontend variables:');
  requiredEnvVars.frontend.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missing.push(varName);
    }
  });
  
  // Check optional variables
  console.log('\n📋 Optional variables:');
  requiredEnvVars.optional.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`⚠️  ${varName}: Not set (optional)`);
      warnings.push(varName);
    }
  });
  
  return { missing, warnings };
}

function generateEnvTemplate() {
  console.log('\n📝 Generating .env.example template...');
  
  const template = `# Study Teddy Environment Variables

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/studyteddy"

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET="${generateSecret()}"

# OpenAI API Key
OPENAI_API_KEY="your-openai-api-key-here"

# Frontend API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Environment
NODE_ENV="development"
`;

  writeFileSync('.env.example', template);
  console.log('✅ Created .env.example template');
}

function generateSecrets() {
  console.log('\n🔐 Generating secrets...');
  
  const secrets = {
    JWT_SECRET: generateSecret(32),
    SESSION_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32)
  };
  
  console.log('\n📋 Generated secrets (add these to your .env file):');
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}="${value}"`);
  });
  
  return secrets;
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('generate-secrets')) {
  generateSecrets();
} else if (args.includes('template')) {
  generateEnvTemplate();
} else {
  const { missing, warnings } = validateEnvironment();
  
  if (missing.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
    console.log('\n💡 Tips:');
    console.log('1. Copy .env.example to .env and fill in the values');
    console.log('2. Run "bun run validate:env generate-secrets" to generate secrets');
    console.log('3. Run "bun run validate:env template" to create .env.example');
    process.exit(1);
  } else {
    console.log('\n✅ All required environment variables are set!');
    if (warnings.length > 0) {
      console.log(`\n⚠️  Optional variables not set: ${warnings.join(', ')}`);
    }
  }
}