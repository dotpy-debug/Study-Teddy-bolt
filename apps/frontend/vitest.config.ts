/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Global setup
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // File patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      'playwright/**',
      'e2e/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '.next/**',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.config.{js,ts}',
        'src/**/*.stories.{js,ts,jsx,tsx}',
        'src/pages/**', // Next.js pages
        'src/app/**/*.{js,ts,jsx,tsx}', // App router files
        'src/lib/utils.ts', // Utility functions
        'src/components/ui/**', // shadcn/ui components
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        'src/components/features/**': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/lib/api/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },

    // Test timeout
    testTimeout: 20000,

    // Watch configuration
    watch: false,

    // Reporter configuration
    reporter: ['default', 'html', 'json'],
    outputFile: {
      html: './test-results/vitest-report.html',
      json: './test-results/vitest-results.json',
    },

    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Mock configuration
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/lib/hooks'),
      '@/utils': path.resolve(__dirname, './src/lib/utils'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },

  define: {
    'process.env.NODE_ENV': '"test"',
  },
});