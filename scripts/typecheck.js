#!/usr/bin/env bun

/**
 * TypeScript Type Checking Script
 * Handles type checking for all packages using global TypeScript
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const packages = [
  { name: '@studyteddy/shared-types', path: 'packages/shared-types' },
  { name: '@studyteddy/config', path: 'packages/config' },
  { name: '@studyteddy/shared', path: 'packages/shared' },
  { name: '@studyteddy/validators', path: 'packages/validators' },
  { name: '@studyteddy/backend', path: 'apps/backend' },
  { name: '@studyteddy/frontend', path: 'apps/frontend' }
];

console.log('🔍 Running TypeScript type checking...');

let hasErrors = false;

for (const pkg of packages) {
  const tsconfigPath = `${pkg.path}/tsconfig.json`;
  
  if (!existsSync(tsconfigPath)) {
    console.log(`⚠️  No tsconfig.json found in ${pkg.name}, skipping...`);
    continue;
  }
  
  console.log(`\n📋 Type checking ${pkg.name}...`);
  
  try {
    execSync(`tsc --noEmit`, {
      cwd: pkg.path,
      stdio: 'inherit'
    });
    
    console.log(`✅ ${pkg.name} type check passed`);
  } catch (error) {
    console.error(`❌ ${pkg.name} type check failed`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('\n❌ Type checking completed with errors');
  process.exit(1);
} else {
  console.log('\n✅ All type checks passed!');
}