const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'StudyTeddy Frontend',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',

  // Module name mappings
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@studyteddy/shared$': '<rootDir>/__mocks__/@studyteddy/shared.js',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@features/(.*)$': '<rootDir>/features/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1',
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/lib/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/hooks/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/features/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/services/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/performance/'
  ],

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
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'features/**/*.{js,jsx,ts,tsx}',
    'services/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/coverage/**',
    '!**/.next/**',
    '!**/e2e/**',
    '!**/tests/**',
    '!app/layout.tsx',
    '!app/loading.tsx',
    '!app/error.tsx',
    '!app/not-found.tsx'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './lib/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@radix-ui|framer-motion|recharts))'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test timeout
  testTimeout: 10000,

  // Watch configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],

  // Reporters
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

  // Verbose output
  verbose: true,

  // Clear mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}

module.exports = createJestConfig(customJestConfig)