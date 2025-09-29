# Study Teddy - Comprehensive Testing Guide

This document provides a complete guide to the testing infrastructure for the Study Teddy application, covering unit tests, integration tests, E2E tests, and CI/CD workflows.

## 📋 Table of Contents

- [Testing Overview](#testing-overview)
- [Test Structure](#test-structure)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Test Utilities and Factories](#test-utilities-and-factories)
- [Code Coverage](#code-coverage)
- [CI/CD Integration](#cicd-integration)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Testing Overview

Study Teddy implements a comprehensive testing strategy with 80%+ code coverage requirements for core modules:

### Test Types
- **Unit Tests**: Testing individual components, functions, and services in isolation
- **Integration Tests**: Testing API endpoints, database operations, and service interactions
- **End-to-End Tests**: Testing complete user workflows using Playwright
- **Performance Tests**: Load testing and performance monitoring

### Coverage Targets
- **Authentication Module**: 90% coverage
- **Core Services**: 85% coverage
- **API Endpoints**: 85% coverage
- **React Components**: 85% coverage
- **Utility Functions**: 90% coverage
- **Overall Project**: 80% coverage

## 📁 Test Structure

```
Study Teddy/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   └── **/*.spec.ts          # Unit tests alongside source
│   │   ├── test/
│   │   │   ├── factories/            # Test data factories
│   │   │   ├── helpers/              # Test utilities
│   │   │   ├── integration/          # Integration tests
│   │   │   ├── setup.ts              # Global test setup
│   │   │   └── setup-e2e.ts          # E2E test setup
│   │   ├── jest.config.js            # Jest configuration
│   │   └── jest-e2e.config.js        # E2E Jest configuration
│   └── frontend/
│       ├── __tests__/
│       │   ├── components/           # Component tests
│       │   ├── hooks/                # Hook tests
│       │   ├── lib/                  # Utility tests
│       │   └── pages/                # Page tests
│       ├── e2e/                      # Playwright tests
│       ├── __mocks__/                # Mock files
│       ├── jest.config.js            # Jest configuration
│       └── playwright.config.ts      # Playwright configuration
└── .github/workflows/test.yml        # CI/CD workflow
```

## 🔧 Backend Testing

### Technology Stack
- **Jest**: Test framework
- **Supertest**: HTTP testing
- **NestJS Testing**: Module testing utilities
- **Faker.js**: Test data generation

### Configuration

The backend uses Jest with TypeScript support and comprehensive mocking:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    './src/modules/auth/': { branches: 90, functions: 90, lines: 90, statements: 90 },
    './src/modules/tasks/': { branches: 85, functions: 85, lines: 85, statements: 85 }
  }
};
```

### Test Types

#### Unit Tests
Located alongside source files with `.spec.ts` extension:

```typescript
// src/modules/auth/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: UsersService, useValue: mockUsersService }]
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register user successfully', async () => {
    // Test implementation
  });
});
```

#### Integration Tests
Located in `test/integration/` directory:

```typescript
// test/integration/auth.integration.spec.ts
describe('Auth Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should register user via API', async () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);
  });
});
```

### Test Utilities

#### Factories
```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides?: Partial<MockUser>): MockUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      ...overrides
    };
  }
}
```

#### Test Helpers
```typescript
// test/helpers/test-module.helper.ts
export class TestModuleHelper {
  static createMockDrizzleService() {
    return {
      db: {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        // ... other methods
      }
    };
  }
}
```

### Running Backend Tests

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI mode
npm run test:ci
```

## ⚛️ Frontend Testing

### Technology Stack
- **Jest**: Test framework
- **React Testing Library**: Component testing
- **Jest DOM**: DOM matchers
- **User Event**: User interaction simulation
- **Faker.js**: Test data generation

### Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    './components/': { branches: 85, functions: 85, lines: 85, statements: 85 },
    './hooks/': { branches: 90, functions: 90, lines: 90, statements: 90 }
  }
}

module.exports = createJestConfig(customJestConfig)
```

### Test Types

#### Component Tests
```typescript
// __tests__/components/task-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/components/tasks/task-card';

describe('TaskCard', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    status: 'pending'
  };

  it('renders task information', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('handles task completion', () => {
    const onComplete = jest.fn();
    render(<TaskCard task={mockTask} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    expect(onComplete).toHaveBeenCalledWith('1');
  });
});
```

#### Hook Tests
```typescript
// __tests__/hooks/use-auth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';

describe('useAuth', () => {
  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' });
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

#### API Client Tests
```typescript
// __tests__/lib/api-client.test.ts
import { ApiClient } from '@/lib/api-client';

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient({ baseURL: 'https://api.test.com' });
    global.fetch = jest.fn();
  });

  it('should make GET request', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });

    const result = await apiClient.get('/endpoint');
    expect(result).toEqual({ data: 'test' });
  });
});
```

### Running Frontend Tests

```bash
# Unit tests
npm run test:unit

# Component tests
npm run test:components

# Hook tests
npm run test:hooks

# Utility tests
npm run test:utils

# Enhanced tests
npm run test:enhanced

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🎭 End-to-End Testing

### Technology Stack
- **Playwright**: E2E testing framework
- **Multiple Browsers**: Chromium, Firefox, Safari
- **Mobile Testing**: iOS and Android simulation

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }, dependencies: ['setup'] },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] }, dependencies: ['setup'] }
  ]
});
```

### Test Examples

#### Authentication Setup
```typescript
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
  await page.getByRole('textbox', { name: /password/i }).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

#### User Journey Tests
```typescript
// e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management Journey', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('complete task creation flow', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: /new task/i }).click();

    await page.getByRole('textbox', { name: /title/i }).fill('Test Task');
    await page.getByRole('textbox', { name: /description/i }).fill('Test Description');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.locator('text=Test Task')).toBeVisible();
  });
});
```

### Running E2E Tests

```bash
# All E2E tests
npm run e2e

# Specific browser
npm run e2e:chromium

# Mobile tests
npm run e2e:mobile

# Debug mode
npm run e2e:debug

# Headed mode (visible browser)
npm run e2e:headed

# UI mode
npm run e2e:ui

# CI mode
npm run test:e2e:ci
```

## 🏭 Test Utilities and Factories

### Data Factories

#### User Factory
```typescript
export class UserFactory {
  static create(overrides?: Partial<MockUser>): MockUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  static createMany(count: number, overrides?: Partial<MockUser>): MockUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithGoogleAuth(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      authProvider: 'google',
      passwordHash: undefined,
      emailVerified: true,
      ...overrides
    });
  }
}
```

#### Task Factory
```typescript
export class TaskFactory {
  static create(overrides?: Partial<MockTask>): MockTask {
    return {
      id: faker.string.uuid(),
      title: faker.company.buzzPhrase(),
      status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      dueDate: faker.date.future(),
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  static createCompleted(overrides?: Partial<MockTask>): MockTask {
    return this.create({
      status: 'completed',
      progressPercentage: 100,
      completedAt: faker.date.recent(),
      ...overrides
    });
  }
}
```

### Test Helpers

#### Module Helper
```typescript
export class TestModuleHelper {
  static async createTestingModule(providers: any[] = []): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: [
        ...providers,
        { provide: DrizzleService, useValue: this.createMockDrizzleService() },
        { provide: CacheService, useValue: this.createMockCacheService() }
      ]
    }).compile();
  }

  static setupDatabaseMocks(drizzleService: any, mocks: Record<string, any>) {
    Object.entries(mocks).forEach(([method, returnValue]) => {
      if (method === 'returning') {
        drizzleService.db[method].mockResolvedValue(returnValue);
      } else {
        drizzleService.db[method].mockReturnValue(returnValue);
      }
    });
    return drizzleService;
  }
}
```

## 📊 Code Coverage

### Coverage Configuration

#### Backend Coverage
```javascript
// jest.config.js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/**/*.interface.ts',
  '!src/**/*.spec.ts',
  '!src/main.ts',
  '!src/**/*.module.ts'
],

coverageThreshold: {
  global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  './src/modules/auth/': { branches: 90, functions: 90, lines: 90, statements: 90 },
  './src/modules/tasks/': { branches: 85, functions: 85, lines: 85, statements: 85 }
}
```

#### Frontend Coverage
```javascript
// jest.config.js
collectCoverageFrom: [
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  '!**/*.d.ts',
  '!**/*.stories.{js,jsx,ts,tsx}'
],

coverageThreshold: {
  global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  './components/': { branches: 85, functions: 85, lines: 85, statements: 85 },
  './hooks/': { branches: 90, functions: 90, lines: 90, statements: 90 }
}
```

### Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: Interactive coverage report (`coverage/lcov-report/index.html`)
- **LCOV**: For CI integration (`coverage/lcov.info`)
- **JSON**: For programmatic access (`coverage/coverage-final.json`)
- **Cobertura**: For Azure DevOps/Jenkins (`coverage/cobertura-coverage.xml`)

## 🚀 CI/CD Integration

### GitHub Actions Workflow

The testing workflow includes:

1. **Backend Tests**:
   - PostgreSQL and Redis services
   - Unit, integration, and E2E tests
   - Coverage reporting

2. **Frontend Tests**:
   - Unit and component tests
   - Build verification
   - Coverage reporting

3. **E2E Tests**:
   - Full application testing
   - Multiple browser support
   - Visual regression testing

4. **Security & Quality**:
   - Dependency auditing
   - CodeQL analysis
   - Performance monitoring

### Environment Variables

Required environment variables for CI:

```bash
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/studyteddy_test
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=test-jwt-secret
NEXTAUTH_SECRET=test-nextauth-secret

# Testing
NODE_ENV=test
PLAYWRIGHT_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@studyteddy.com
TEST_USER_PASSWORD=testPassword123
```

## 🏃‍♂️ Running Tests

### Local Development

#### Prerequisites
```bash
# Install dependencies
cd apps/backend && bun install
cd apps/frontend && bun install

# Setup test databases
docker-compose up -d postgres redis

# Install Playwright browsers
cd apps/frontend && bun run playwright:install
```

#### Backend Tests
```bash
cd apps/backend

# Run all tests
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

#### Frontend Tests
```bash
cd apps/frontend

# Run all tests
npm run test

# Run specific test types
npm run test:components
npm run test:hooks
npm run test:utils

# Run E2E tests
npm run e2e

# Generate coverage
npm run test:coverage
```

### CI Environment

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Scheduled nightly runs (for E2E tests)

## ✅ Best Practices

### Test Writing Guidelines

1. **Descriptive Test Names**:
   ```typescript
   // Good
   it('should throw UnauthorizedException when password is invalid')

   // Bad
   it('should fail login')
   ```

2. **Arrange-Act-Assert Pattern**:
   ```typescript
   it('should create task successfully', async () => {
     // Arrange
     const taskDto = { title: 'Test Task', description: 'Test Description' };
     const mockUser = UserFactory.create();

     // Act
     const result = await service.createTask(mockUser.id, taskDto);

     // Assert
     expect(result.title).toBe(taskDto.title);
     expect(result.userId).toBe(mockUser.id);
   });
   ```

3. **Proper Mocking**:
   ```typescript
   // Mock external dependencies
   jest.mock('@/lib/api-client');

   // Use factory functions for test data
   const mockUser = UserFactory.create({ email: 'specific@email.com' });

   // Clear mocks between tests
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

4. **Test Isolation**:
   - Each test should be independent
   - Use `beforeEach` for setup
   - Clean up after tests
   - Avoid test interdependencies

5. **Error Testing**:
   ```typescript
   it('should handle authentication errors', async () => {
     mockAuthService.login.mockRejectedValue(new UnauthorizedException());

     await expect(authController.login(loginDto)).rejects.toThrow(UnauthorizedException);
   });
   ```

### E2E Testing Guidelines

1. **Page Object Pattern**:
   ```typescript
   class LoginPage {
     constructor(private page: Page) {}

     async login(email: string, password: string) {
       await this.page.getByRole('textbox', { name: /email/i }).fill(email);
       await this.page.getByRole('textbox', { name: /password/i }).fill(password);
       await this.page.getByRole('button', { name: /sign in/i }).click();
     }
   }
   ```

2. **Stable Selectors**:
   - Use `data-testid` attributes
   - Prefer role-based selectors
   - Avoid CSS selectors that might change

3. **Wait Strategies**:
   ```typescript
   // Wait for specific elements
   await page.waitForSelector('[data-testid="success-message"]');

   // Wait for URL changes
   await page.waitForURL('/dashboard');

   // Wait for network responses
   await page.waitForResponse('**/api/tasks');
   ```

## 🔧 Troubleshooting

### Common Issues

#### Jest Configuration Issues
```bash
# Clear Jest cache
npx jest --clearCache

# Debug Jest configuration
npx jest --showConfig
```

#### Playwright Issues
```bash
# Reinstall browsers
npx playwright install

# Run with debug output
npx playwright test --debug

# Generate test reports
npx playwright show-report
```

#### Coverage Issues
```bash
# Generate detailed coverage report
npm run test:coverage -- --verbose

# Check uncovered lines
npm run test:coverage -- --coverage --coverageReporters=text
```

#### Database Connection Issues
```bash
# Check database connection
pg_isready -h localhost -p 5432

# Reset test database
npm run db:reset:test
```

### Performance Issues

#### Slow Tests
1. **Identify slow tests**:
   ```bash
   npm test -- --detectSlowTests
   ```

2. **Optimize database operations**:
   - Use transactions for test isolation
   - Mock external services
   - Use in-memory databases for unit tests

3. **Parallel execution**:
   ```bash
   npm test -- --maxWorkers=4
   ```

#### Memory Issues
1. **Increase Node.js memory**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

2. **Clear modules between tests**:
   ```typescript
   afterEach(() => {
     jest.resetModules();
   });
   ```

### Test Environment Setup

#### Local Development Database
```bash
# Start test database
docker run -d \
  --name studyteddy-test-db \
  -e POSTGRES_DB=studyteddy_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:15

# Run migrations
DATABASE_URL=postgres://test:test@localhost:5433/studyteddy_test npm run db:migrate
```

#### Environment Variables
Create `.env.test` files:

```bash
# Backend .env.test
DATABASE_URL=postgres://test:test@localhost:5433/studyteddy_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret
NODE_ENV=test

# Frontend .env.test
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=test-secret
```

## 📈 Metrics and Monitoring

### Test Metrics

Track these key metrics:
- **Code Coverage**: Aim for 80%+ overall, 90%+ for critical modules
- **Test Execution Time**: Monitor and optimize slow tests
- **Test Stability**: Track flaky test rates
- **Bug Detection**: Measure tests' effectiveness in catching regressions

### Coverage Trends

Monitor coverage trends over time:
```bash
# Generate coverage trends report
npm run test:coverage:trends

# Compare coverage between branches
npm run test:coverage:diff main..feature-branch
```

### Performance Monitoring

Track test performance:
```bash
# Generate performance report
npm run test:performance

# Monitor memory usage
npm run test:memory-usage
```

This comprehensive testing guide ensures high-quality, maintainable code with excellent test coverage across the entire Study Teddy application. Regular testing practices help catch bugs early, improve code quality, and provide confidence in deployments.