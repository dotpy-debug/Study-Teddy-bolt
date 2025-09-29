#!/usr/bin/env bun

/**
 * Type Fixes Script
 * Fixes common type issues after Bun migration and React 19 upgrade
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

console.log('🔧 Fixing type issues after Bun migration...\n');

// Fix 1: Install missing dependencies
console.log('📦 Installing missing dependencies...');
try {
  // Install missing Radix UI toast
  execSync('bun add @radix-ui/react-toast', { stdio: 'inherit' });
  
  // Install Playwright for testing
  execSync('bun add -D @playwright/test', { stdio: 'inherit' });
  
  console.log('✅ Missing dependencies installed\n');
} catch (error) {
  console.warn('⚠️  Warning: Some dependencies failed to install\n');
}

// Fix 2: Update supertest imports in backend tests
console.log('🔧 Fixing supertest imports...');
const testFiles = [
  'apps/backend/test/tasks.e2e-spec.ts',
  'apps/backend/test/dashboard.e2e-spec.ts',
  'apps/backend/test/auth-flow.e2e-spec.ts',
  'apps/backend/test/auth.e2e-spec.ts',
  'apps/backend/test/ai.e2e-spec.ts',
  'apps/backend/test/app.e2e-spec.ts'
];

testFiles.forEach(file => {
  if (existsSync(file)) {
    try {
      let content = readFileSync(file, 'utf8');
      // Fix supertest import
      content = content.replace(
        "import * as request from 'supertest';",
        "import request from 'supertest';"
      );
      writeFileSync(file, content);
      console.log(`✅ Fixed ${file}`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not fix ${file}`);
    }
  }
});

// Fix 3: Create type declaration files for missing types
console.log('\n🔧 Creating type declarations...');

// Create global types file
const globalTypes = `// Global type declarations for Study Teddy

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
  
  interface Error {
    digest?: string;
  }
}

// Extend NextRequest for missing properties
declare module 'next/server' {
  interface NextRequest {
    ip?: string;
  }
}

// Axios config extensions
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export {};
`;

writeFileSync('apps/frontend/types/global.d.ts', globalTypes);
console.log('✅ Created global type declarations');

// Fix 4: Update React 19 component types
console.log('\n🔧 Updating React 19 compatibility...');

// Create React 19 compatibility file
const reactCompat = `// React 19 compatibility helpers

import { ReactNode } from 'react';

// Button props compatibility
export interface ButtonProps {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

// Loading component type
export type LoadingComponent = () => ReactNode;

// Teddy mood type
export type TeddyMood = 'happy' | 'excited' | 'focused' | 'encouraging' | 'sleepy' | 'confused';
`;

writeFileSync('apps/frontend/types/react-compat.d.ts', reactCompat);
console.log('✅ Created React 19 compatibility types');

console.log('\n🎉 Type fixes completed!');
console.log('\n📋 Manual fixes still needed:');
console.log('1. Review and fix API result types in hooks');
console.log('2. Update Teddy component state management');
console.log('3. Fix database query types in backend');
console.log('4. Update component prop interfaces');
console.log('\n💡 Run "bun run typecheck" to see remaining issues.');