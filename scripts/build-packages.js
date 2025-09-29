#!/usr/bin/env bun

/**
 * Build Packages Script
 * Builds all TypeScript packages using Bun's native TypeScript support
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const packages = [
  'packages/shared-types',
  'packages/config', 
  'packages/shared',
  'packages/validators'
];

console.log('🔨 Building TypeScript packages...');

for (const pkg of packages) {
  console.log(`\n📦 Building ${pkg}...`);
  
  const srcDir = join(pkg, 'src');
  const distDir = join(pkg, 'dist');
  
  if (!existsSync(srcDir)) {
    console.log(`⚠️  No src directory found in ${pkg}, skipping...`);
    continue;
  }
  
  // Create dist directory if it doesn't exist
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
  
  try {
    // Use TypeScript compiler directly for better compatibility
    execSync(`tsc`, {
      cwd: pkg,
      stdio: 'inherit'
    });
    
    console.log(`✅ Successfully built ${pkg}`);
  } catch (error) {
    console.error(`❌ Failed to build ${pkg}:`, error.message);
  }
}

console.log('\n🎉 Package build completed!');