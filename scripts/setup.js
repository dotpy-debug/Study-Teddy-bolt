#!/usr/bin/env bun

/**
 * Complete Setup Script for Study Teddy
 * Handles installation, building, and verification
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Setting up Study Teddy with Bun...\n');

// Step 1: Clean installation
console.log('📦 Step 1: Installing dependencies...');
try {
  // Remove old lock files
  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  lockFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`🗑️  Removing ${file}...`);
      execSync(`rm -f ${file}`);
    }
  });

  execSync('bun install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 2: Build shared packages
console.log('🔨 Step 2: Building shared packages...');
try {
  execSync('bun scripts/build-packages.js', { stdio: 'inherit' });
  console.log('✅ Shared packages built successfully!\n');
} catch (error) {
  console.error('❌ Failed to build shared packages:', error.message);
  process.exit(1);
}

// Step 3: Type checking
console.log('🔍 Step 3: Running type checks...');
try {
  execSync('bun scripts/typecheck.js', { stdio: 'inherit' });
  console.log('✅ Type checking passed!\n');
} catch (error) {
  console.warn('⚠️  Warning: Type checking failed. You may need to fix some type issues.\n');
}

// Step 4: Lint check
console.log('🧹 Step 4: Running linter...');
try {
  execSync('bun run lint', { stdio: 'inherit' });
  console.log('✅ Linting passed!\n');
} catch (error) {
  console.warn('⚠️  Warning: Linting failed. You may need to fix some lint issues.\n');
}

console.log('🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Start development: bun run dev');
console.log('2. Build for production: bun run build');
console.log('3. Run tests: bun run test');
console.log('4. Check database setup: bun run db:generate');
console.log('\n💡 Tip: Use "bun run build:packages" to rebuild shared packages when needed.');