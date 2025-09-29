const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  displayName: 'StudyTeddy Backend',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  extensionsToTreatAsEsm: ['.ts'],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts'
  ],

  // Exclude E2E tests for unit testing
  testPathIgnorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    'test/.*\\.e2e-spec\\.ts'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts'
  ],

  // Module resolution
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/'
    }),
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura',
    'json-summary'
  ],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/db/migrations/**',
    '!src/db/seeds/**',
    '!src/types/**',
    '!src/constants/**'
  ],

  // Coverage thresholds for comprehensive testing
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/modules/auth/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/modules/users/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/modules/tasks/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/modules/focus-sessions/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/modules/ai/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Test environment configuration
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Watch configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Parallel execution
  maxWorkers: '50%',

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Global test configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false
    }
  }
};