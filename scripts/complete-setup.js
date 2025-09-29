#!/usr/bin/env bun

/**
 * Complete Bun Setup and Verification Script
 * Performs full setup, fixes, and verification
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Complete Bun Setup for Study Teddy\n');

const steps = [
  {
    name: 'Clean Installation',
    command: 'bun install',
    description: 'Installing all dependencies with Bun'
  },
  {
    name: 'Build Shared Packages',
    command: 'bun scripts/build-packages.js',
    description: 'Building TypeScript shared packages'
  },
  {
    name: 'Fix Type Issues',
    command: 'bun scripts/fix-types.js',
    description: 'Applying type fixes for React 19 and Bun compatibility'
  },
  {
    name: 'Environment Validation',
    command: 'bun scripts/validate-env.js template',
    description: 'Creating environment template'
  }
];

let completedSteps = 0;

for (const step of steps) {
  console.log(`📋 Step ${completedSteps + 1}: ${step.name}`);
  console.log(`   ${step.description}...`);
  
  try {
    execSync(step.command, { stdio: 'inherit' });
    console.log(`✅ ${step.name} completed successfully\n`);
    completedSteps++;
  } catch (error) {
    console.error(`❌ ${step.name} failed`);
    console.error(`   Command: ${step.command}`);
    console.error(`   Error: ${error.message}\n`);
    
    // Continue with other steps for non-critical failures
    if (step.name !== 'Clean Installation') {
      console.log('⚠️  Continuing with remaining steps...\n');
      continue;
    } else {
      process.exit(1);
    }
  }
}

// Verification steps
console.log('🔍 Verification Steps:\n');

const verificationSteps = [
  {
    name: 'Check Bun Version',
    command: 'bun --version',
    critical: false
  },
  {
    name: 'Verify Package Installation',
    command: 'bun pm ls',
    critical: false
  },
  {
    name: 'Test TypeScript Compilation',
    command: 'bun scripts/typecheck.js',
    critical: false
  }
];

let verificationsPassed = 0;

for (const verification of verificationSteps) {
  console.log(`🔬 ${verification.name}...`);
  
  try {
    execSync(verification.command, { stdio: 'pipe' });
    console.log(`✅ ${verification.name} passed`);
    verificationsPassed++;
  } catch (error) {
    if (verification.critical) {
      console.error(`❌ ${verification.name} failed (critical)`);
      process.exit(1);
    } else {
      console.warn(`⚠️  ${verification.name} failed (non-critical)`);
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SETUP SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Setup Steps Completed: ${completedSteps}/${steps.length}`);
console.log(`🔍 Verifications Passed: ${verificationsPassed}/${verificationSteps.length}`);

if (completedSteps === steps.length) {
  console.log('\n🎉 Bun migration completed successfully!');
} else {
  console.log('\n⚠️  Bun migration completed with some issues');
}

console.log('\n📋 Next Steps:');
console.log('1. 🔧 Fix any remaining type errors: bun run typecheck');
console.log('2. 🚀 Start development: bun run dev');
console.log('3. 🏗️  Build applications: bun run build');
console.log('4. 🧪 Run tests: bun run test');
console.log('5. 📝 Set up environment: cp .env.example .env');

console.log('\n💡 Useful Commands:');
console.log('• bun scripts/build-packages.js  - Rebuild shared packages');
console.log('• bun scripts/typecheck.js       - Check types');
console.log('• bun scripts/validate-env.js    - Validate environment');
console.log('• bun run dev --filter=backend   - Start backend only');
console.log('• bun run dev --filter=frontend  - Start frontend only');

console.log('\n🔗 Resources:');
console.log('• Bun Documentation: https://bun.sh/docs');
console.log('• React 19 Guide: https://react.dev/blog/2024/04/25/react-19');
console.log('• Migration Guide: ./BUN_MIGRATION_COMPLETE.md');