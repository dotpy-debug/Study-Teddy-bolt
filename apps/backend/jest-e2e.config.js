const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  displayName: 'StudyTeddy Backend E2E',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  // Test file patterns for E2E tests only
  testMatch: [
    '<rootDir>/test/**/*.e2e-spec.ts'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup-e2e.ts'
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

  // Coverage configuration for E2E tests
  collectCoverage: false, // E2E tests focus on integration, not coverage

  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
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

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Watch configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Timeout for E2E tests (longer)
  testTimeout: 60000,

  // Verbose output
  verbose: true,

  // Force exit
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Sequential execution for E2E tests
  maxWorkers: 1,

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit-e2e.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};