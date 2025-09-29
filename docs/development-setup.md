# Study Teddy Development Setup Guide

This guide will help you set up the Study Teddy development environment on your local machine.

## Prerequisites

### Required Software

- **Node.js:** Version 18.0 or higher
- **pnpm:** Version 8.0 or higher (recommended package manager)
- **PostgreSQL:** Version 14 or higher
- **Git:** Latest version

### Optional Tools

- **Docker:** For containerized development
- **VS Code:** Recommended IDE with extensions
- **Postman:** For API testing

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/studyteddy/studyteddy.git
cd studyteddy
```

### 2. Install Dependencies

```bash
# Install all dependencies for the monorepo
pnpm install
```

### 3. Environment Setup

#### Backend Environment

Create `apps/backend/.env`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/studyteddy_dev"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"

# Google OAuth (optional for development)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Server Configuration
PORT=3001
NODE_ENV="development"
API_PREFIX="api"

# CORS Configuration
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"

# Swagger Documentation
SWAGGER_ENABLED="true"

# Demo User (development only)
SEED_DEMO_USER="true"
DEMO_USER_EMAIL="demo@studyteddy.dev"
DEMO_USER_PASSWORD="DemoPass123!"
DEMO_USER_NAME="Demo User"

# Rate Limiting
RATE_LIMIT_TTL=900000  # 15 minutes
RATE_LIMIT_MAX=100     # requests per TTL
AI_RATE_LIMIT_TTL=60000 # 1 minute
AI_RATE_LIMIT_MAX=10   # requests per TTL

# Logging
LOG_LEVEL="debug"
```

#### Frontend Environment

Create `studyteddy-frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# Google OAuth (must match backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"

# App Configuration
NEXT_PUBLIC_APP_NAME="Study Teddy"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development Settings
NODE_ENV="development"
```

### 4. Database Setup

#### Option A: Local PostgreSQL

1. **Install PostgreSQL:**
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database and user
   CREATE DATABASE studyteddy_dev;
   CREATE USER studyteddy WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE studyteddy_dev TO studyteddy;
   \q
   ```

#### Option B: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run --name studyteddy-postgres \
  -e POSTGRES_DB=studyteddy_dev \
  -e POSTGRES_USER=studyteddy \
  -e POSTGRES_PASSWORD=your-password \
  -p 5432:5432 \
  -d postgres:14
```

### 5. Database Migration

```bash
# Navigate to backend directory
cd apps/backend

# Generate and run migrations
pnpm db:generate
pnpm db:push

# Verify database setup
pnpm db:studio  # Opens Drizzle Studio
```

### 6. Start Development Servers

#### Option A: Start All Services

```bash
# From project root
pnpm dev
```

This starts:
- Backend API server on `http://localhost:3001`
- Frontend Next.js app on `http://localhost:3000`

#### Option B: Start Services Individually

```bash
# Terminal 1: Backend
cd apps/backend
pnpm dev

# Terminal 2: Frontend
cd studyteddy-frontend
pnpm dev
```

### 7. Verify Setup

1. **Backend API:** Visit `http://localhost:3001/api/health`
2. **Swagger Docs:** Visit `http://localhost:3001/api/docs`
3. **Frontend App:** Visit `http://localhost:3000`
4. **Demo Login:** Use `demo@studyteddy.dev` / `DemoPass123!`

## Project Structure

```
studyteddy/
├── apps/
│   ├── backend/                 # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/         # Feature modules
│   │   │   ├── common/          # Shared utilities
│   │   │   ├── db/              # Database configuration
│   │   │   └── main.ts          # Application entry point
│   │   ├── test/                # E2E tests
│   │   └── package.json
│   └── frontend/                # Legacy frontend (being phased out)
├── studyteddy-frontend/         # Next.js application
│   ├── app/                     # Next.js App Router
│   ├── components/              # React components
│   ├── lib/                     # Utilities and API client
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript definitions
├── packages/                    # Shared packages
│   ├── config/                  # Shared configuration
│   ├── shared/                  # Shared utilities
│   ├── shared-types/            # Shared TypeScript types
│   └── validators/              # Shared validation schemas
├── docs/                        # Documentation
├── scripts/                     # Build and deployment scripts
└── package.json                 # Monorepo configuration
```

## Development Workflow

### Code Quality

#### ESLint and Prettier

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

#### Pre-commit Hooks

Husky is configured to run:
- ESLint on staged files
- Prettier formatting
- Type checking
- Commit message validation

### Testing

#### Backend Tests

```bash
cd apps/backend

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

#### Frontend Tests

```bash
cd studyteddy-frontend

# Unit and component tests
pnpm test

# E2E tests with Playwright
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

### Database Management

#### Drizzle ORM Commands

```bash
cd apps/backend

# Generate migration files
pnpm db:generate

# Apply migrations to database
pnpm db:push

# Open database studio
pnpm db:studio

# Drop database (development only)
pnpm db:drop

# Seed database with sample data
pnpm db:seed
```

#### Database Migrations

1. **Modify Schema:**
   ```typescript
   // apps/backend/src/db/schema.ts
   export const newTable = pgTable('new_table', {
     id: uuid('id').defaultRandom().primaryKey(),
     name: varchar('name', { length: 255 }).notNull(),
     createdAt: timestamp('created_at').defaultNow().notNull(),
   });
   ```

2. **Generate Migration:**
   ```bash
   pnpm db:generate
   ```

3. **Apply Migration:**
   ```bash
   pnpm db:push
   ```

### API Development

#### Adding New Endpoints

1. **Create Module:**
   ```bash
   cd apps/backend/src/modules
   mkdir new-feature
   cd new-feature
   ```

2. **Generate Files:**
   ```bash
   # Using NestJS CLI
   nest g module new-feature
   nest g controller new-feature
   nest g service new-feature
   ```

3. **Add Swagger Documentation:**
   ```typescript
   @ApiTags('New Feature')
   @Controller('new-feature')
   export class NewFeatureController {
     @Get()
     @ApiOperation({ summary: 'Get all items' })
     @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
     async findAll() {
       // Implementation
     }
   }
   ```

### Frontend Development

#### Adding New Pages

```bash
cd studyteddy-frontend/app
mkdir new-page
touch new-page/page.tsx
touch new-page/layout.tsx
```

#### Component Development

```typescript
// studyteddy-frontend/components/new-component.tsx
import { FC } from 'react';

interface NewComponentProps {
  title: string;
}

export const NewComponent: FC<NewComponentProps> = ({ title }) => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
};
```

## Environment-Specific Configuration

### Development

- Hot reloading enabled
- Detailed error messages
- Swagger documentation available
- Demo user auto-created
- Debug logging enabled

### Testing

```bash
# Set up test environment
cp apps/backend/.env apps/backend/.env.test

# Modify test-specific variables
DATABASE_URL="postgresql://username:password@localhost:5432/studyteddy_test"
NODE_ENV="test"
```

### Production

See [Production Deployment Guide](./deployment/production-deployment.md) for production setup.

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Test connection
psql -U studyteddy -d studyteddy_dev -h localhost
```

#### Port Conflicts

```bash
# Check what's using port 3000/3001
lsof -i :3000
lsof -i :3001

# Kill processes if needed
kill -9 <PID>
```

#### Node Modules Issues

```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### TypeScript Errors

```bash
# Check TypeScript in all packages
pnpm type-check

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

### Performance Issues

#### Slow Database Queries

1. **Enable Query Logging:**
   ```env
   # apps/backend/.env
   LOG_LEVEL="debug"
   ```

2. **Use Database Studio:**
   ```bash
   pnpm db:studio
   ```

3. **Check Indexes:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM study_tasks WHERE user_id = 'uuid';
   ```

#### Frontend Performance

1. **Bundle Analysis:**
   ```bash
   cd studyteddy-frontend
   pnpm analyze
   ```

2. **Lighthouse Audit:**
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Run audit

## IDE Setup

### VS Code Extensions

Recommended extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Contributing

### Git Workflow

1. **Create Feature Branch:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes and Commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and Create PR:**
   ```bash
   git push origin feature/new-feature
   ```

### Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/config changes

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented

## Getting Help

### Documentation
- [User Guide](./user-guide.md)
- [API Documentation](./api-documentation.md)
- [Deployment Guide](./deployment/production-deployment.md)

### Community
- **GitHub Issues:** Report bugs and request features
- **Discussions:** Ask questions and share ideas
- **Discord:** Real-time chat with the community

### Support
- **Email:** dev-support@studyteddy.com
- **Response Time:** Within 24 hours for development issues

---

*Last updated: [Current Date]*
*Version: 1.0*