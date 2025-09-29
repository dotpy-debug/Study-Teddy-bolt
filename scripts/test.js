#!/usr/bin/env bun

/**
 * Test Runner Script
 * Runs tests for all packages using appropriate test runners
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const packages = [
  { name: '@studyteddy/backend', path: 'apps/backend', testCommand: 'bun test' },
  { name: '@studyteddy/frontend', path: 'apps/frontend', testCommand: 'bun test' }
];

console.log('🧪 Running tests for all packages...\n');

let hasFailures = false;

for (const pkg of packages) {
  const packageJsonPath = `${pkg.path}/package.json`;
  
  if (!existsSync(packageJsonPath)) {
    console.log(`⚠️  No package.json found in ${pkg.name}, skipping...`);
    continue;
  }
  
  console.log(`🔬 Testing ${pkg.name}...`);
  
  try {
    execSync(pkg.testCommand, {
      cwd: pkg.path,
      stdio: 'inherit'
    });
    
    console.log(`✅ ${pkg.name} tests passed\n`);
  } catch (error) {
    console.error(`❌ ${pkg.name} tests failed\n`);
    hasFailures = true;
  }
}

if (hasFailures) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}