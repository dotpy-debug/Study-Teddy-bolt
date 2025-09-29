#!/usr/bin/env bun

/**
 * Update Dependencies Script
 * Updates all packages to use Bun and latest versions
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting dependency update process...');

// Remove old lock files
const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
lockFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`🗑️  Removing ${file}...`);
    execSync(`rm -f ${file}`);
  }
});

// Remove node_modules for clean install
if (existsSync('node_modules')) {
  console.log('🗑️  Removing node_modules for clean install...');
  execSync('rm -rf node_modules');
}

// Install dependencies with Bun
console.log('📦 Installing dependencies with Bun...');
try {
  execSync('bun install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build shared packages
console.log('🔨 Building shared packages...');
try {
  execSync('bun run build --filter="@studyteddy/*"', { stdio: 'inherit' });
  console.log('✅ Shared packages built successfully!');
} catch (error) {
  console.warn('⚠️  Warning: Some packages failed to build. This might be expected if they depend on each other.');
}

// Run type checking
console.log('🔍 Running type checks...');
try {
  execSync('bun run typecheck', { stdio: 'inherit' });
  console.log('✅ Type checking passed!');
} catch (error) {
  console.warn('⚠️  Warning: Type checking failed. You may need to fix some type issues.');
}

console.log('🎉 Dependency update completed!');
console.log('\nNext steps:');
console.log('1. Review any type errors and fix them');
console.log('2. Test your applications with: bun run dev');
console.log('3. Run tests with: bun run test');