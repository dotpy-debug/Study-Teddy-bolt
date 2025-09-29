# Study Teddy Developer Guide

Welcome to the Study Teddy development team! This comprehensive guide will help you get up and running with the development environment and understand our development workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Code Quality Standards](#code-quality-standards)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing Guidelines](#contributing-guidelines)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js** (v20 LTS or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **Docker** (v24 or higher) - [Download](https://docker.com/)
- **Docker Compose** (v2.20 or higher) - Usually included with Docker
- **Git** (v2.40 or higher) - [Download](https://git-scm.com/)

### Recommended Software

- **Visual Studio Code** with recommended extensions (see `.vscode/extensions.json`)
- **PostgreSQL client** (psql, pgAdmin, or DBeaver)
- **Redis CLI** for debugging cache issues
- **Postman** or **Insomnia** for API testing

### Optional Tools

- **pnpm** (faster package manager) - `npm install -g pnpm`
- **nvm** (Node Version Manager) for managing Node.js versions

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/studyteddy.git
cd studyteddy
```

### 2. Set Up Environment Variables

```bash
# Copy environment template
cp .env.development.example .env

# Generate secure secrets (optional, for production-like setup)
./scripts/env-setup.sh generate

# Edit environment variables
nano .env  # or use your preferred editor
```

### 3. Start Development Environment

```bash
# Install dependencies
npm install

# Start all services with Docker
./scripts/docker-dev.sh up

# OR start services individually
npm run dev
```

### 4. Verify Installation

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Database Admin**: http://localhost:8080 (Adminer)
- **Redis Admin**: http://localhost:8081 (Redis Commander)
- **Email Testing**: http://localhost:8025 (MailHog)

## Project Structure

```
studyteddy/
├── .github/                     # GitHub Actions workflows
├── .husky/                      # Git hooks
├── studyteddy-backend/          # NestJS backend application
├── studyteddy-frontend/         # Next.js frontend application
├── packages/                    # Shared packages
├── scripts/                     # Development scripts
├── nginx/                       # Nginx configuration
└── docs/                        # Additional documentation
```

### Backend Structure (NestJS)

```
studyteddy-backend/
├── src/
│   ├── modules/                 # Feature modules
│   │   ├── auth/               # Authentication
│   │   ├── users/              # User management
│   │   ├── tasks/              # Study tasks
│   │   ├── ai/                 # AI services
│   │   └── dashboard/          # Analytics
│   ├── common/                 # Shared utilities
│   ├── config/                 # Configuration
│   ├── db/                     # Database schema & migrations
│   └── main.ts                 # Application entry point
├── test/                       # Test files
└── drizzle/                    # Database migrations
```

### Frontend Structure (Next.js)

```
studyteddy-frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   │   ├── ui/                # Base UI components (shadcn/ui)
│   │   ├── features/          # Feature-specific components
│   │   └── layout/            # Layout components
│   ├── lib/                    # Utilities and configurations
│   │   ├── api/               # API client
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Utility functions
│   ├── store/                  # State management (Zustand)
│   └── types/                  # TypeScript type definitions
└── e2e/                        # End-to-end tests
```

## Development Workflow

### Branch Strategy

We use Git Flow with the following branches:

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/\***: New features
- **bugfix/\***: Bug fixes
- **hotfix/\***: Critical production fixes
- **release/\***: Prepare releases

### Branch Naming Convention

```
feature/user-authentication
bugfix/session-timeout-issue
hotfix/security-vulnerability-fix
release/v1.2.0
```

### Commit Message Convention

We use Conventional Commits format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

**Examples**:
```
feat(auth): add OAuth 2.0 integration
fix(ui): resolve button alignment issue
docs: update API documentation
test(auth): add unit tests for login service
```

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-new-feature
   ```

2. **Make Changes**
   - Write code following our style guide
   - Add tests for new functionality
   - Update documentation if needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/my-new-feature
   # Create Pull Request on GitHub
   ```

5. **Code Review Process**
   - At least one approval required
   - All CI checks must pass
   - Address review feedback

6. **Merge to Develop**
   - Use "Squash and Merge" for clean history
   - Delete feature branch after merge

## Testing Strategy

### Test Types

1. **Unit Tests**
   - Test individual functions/components
   - Mock external dependencies
   - Fast execution (< 1s per test)

2. **Integration Tests**
   - Test module interactions
   - Use test database
   - Moderate execution time

3. **End-to-End Tests**
   - Test complete user workflows
   - Use Playwright for browser automation
   - Slower execution but comprehensive

### Running Tests

```bash
# All tests
npm test

# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test File Organization

```
# Unit tests
src/components/Button.test.tsx
src/services/AuthService.spec.ts

# Integration tests
test/integration/auth.e2e-spec.ts

# E2E tests
e2e/login.spec.ts
e2e/dashboard.spec.ts
```

### Writing Tests

**Backend Example (Jest)**:
```typescript
describe('AuthService', () => {
  it('should authenticate user with valid credentials', async () => {
    const result = await authService.login('test@example.com', 'password');
    expect(result).toHaveProperty('accessToken');
  });
});
```

**Frontend Example (Vitest)**:
```typescript
describe('LoginForm', () => {
  it('should submit form with valid data', async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });
});
```

## Code Quality Standards

### ESLint Configuration

We use a comprehensive ESLint setup with:
- TypeScript rules
- React/Next.js rules
- Security rules
- Import/export rules
- Code quality rules

### Prettier Configuration

Code formatting is handled by Prettier with these settings:
- Single quotes
- 2-space indentation
- 100 character line length
- Trailing commas (ES5)

### Pre-commit Hooks

Husky runs the following checks before each commit:
- ESLint with auto-fix
- Prettier formatting
- TypeScript type checking
- Unit tests for changed files
- Secret scanning

### Code Review Checklist

- [ ] Follows TypeScript best practices
- [ ] Includes appropriate tests
- [ ] Updates documentation
- [ ] Handles error cases
- [ ] Follows security guidelines
- [ ] Performance considerations
- [ ] Accessibility compliance

## API Documentation

### Backend API

The backend API is documented using Swagger/OpenAPI:
- **Development**: http://localhost:3001/api/docs
- **Staging**: https://api-staging.studyteddy.com/docs
- **Production**: https://api.studyteddy.com/docs

### API Standards

1. **RESTful Design**
   - Use appropriate HTTP methods
   - Consistent resource naming
   - Proper status codes

2. **Request/Response Format**
   ```typescript
   // Request
   POST /api/v1/tasks
   {
     "title": "Study Math",
     "description": "Complete algebra homework",
     "dueDate": "2024-01-15T10:00:00Z"
   }

   // Response
   {
     "id": "123",
     "title": "Study Math",
     "status": "pending",
     "createdAt": "2024-01-10T14:30:00Z"
   }
   ```

3. **Error Handling**
   ```typescript
   // Error Response
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid input data",
       "details": [
         {
           "field": "email",
           "message": "Invalid email format"
         }
       ]
     }
   }
   ```

### Authentication

API uses JWT tokens with refresh token rotation:

```typescript
// Login Response
{
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 604800
}

// Request Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Deployment

### Environments

1. **Development**: Local development environment
2. **Staging**: Pre-production testing environment
3. **Production**: Live production environment

### CI/CD Pipeline

Our GitHub Actions workflow automatically:

1. **On Pull Request**:
   - Runs tests
   - Code quality checks
   - Security scans
   - Build validation

2. **On Push to Develop**:
   - Deploys to staging
   - Runs E2E tests
   - Notifies team

3. **On Push to Main**:
   - Deploys to production
   - Health checks
   - Rollback on failure

### Manual Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (requires approval)
./scripts/deploy.sh production

# Rollback deployment
./scripts/rollback.sh production v1.2.3
```

### Environment Variables

Each environment has its own configuration:
- `.env.development.example` - Development template
- `.env.staging.example` - Staging template
- Production variables managed through GitHub Secrets

## Troubleshooting

### Common Issues

**Database Connection Issues**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -p 5432 -U postgres -d studyteddy_dev

# Reset database
./scripts/docker-dev.sh db-reset
```

**Redis Connection Issues**:
```bash
# Check Redis status
docker exec -it studyteddy-redis redis-cli ping

# Clear Redis cache
docker exec -it studyteddy-redis redis-cli FLUSHALL
```

**Node.js Version Issues**:
```bash
# Check Node.js version
node --version

# Install correct version with nvm
nvm install 20
nvm use 20
```

**Port Conflicts**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Debug Mode

Enable debug logging:
```bash
# Backend debug
DEBUG=studyteddy:* npm run start:dev

# Frontend debug
NEXT_PUBLIC_DEBUG=true npm run dev
```

### Performance Issues

**Database Queries**:
```bash
# Enable query logging
DATABASE_LOGGING=true npm run start:dev

# Run performance tests
npm run test:perf
```

**Bundle Size**:
```bash
# Analyze bundle size
npm run build:analyze

# Check for large dependencies
npx bundlephobia <package-name>
```

## Contributing Guidelines

### Getting Help

1. **Documentation**: Check this guide and related docs
2. **Issues**: Search existing GitHub issues
3. **Discussions**: Use GitHub Discussions for questions
4. **Team Chat**: Slack channel #studyteddy-dev

### Reporting Bugs

Use our bug report template with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots/logs

### Feature Requests

Use our feature request template with:
- Problem description
- Proposed solution
- Alternatives considered
- Implementation impact

### Code Contributions

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure all checks pass
5. Submit pull request
6. Address review feedback

### Documentation Contributions

- Fix typos and improve clarity
- Add examples and use cases
- Update API documentation
- Create tutorials and guides

---

## Additional Resources

- [Architecture Decision Records (ADRs)](./docs/adrs/)
- [API Reference](./docs/api/)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guidelines](./SECURITY.md)
- [Performance Optimization](./docs/performance.md)

---

**Happy coding! 🚀**

For questions or support, reach out to the development team or create an issue on GitHub.