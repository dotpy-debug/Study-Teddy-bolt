---
inclusion: always
---

# Study Teddy - Technical Stack & Development Guidelines

## Architecture Overview

Full-stack TypeScript monorepo with separate frontend and backend services.

```
Frontend (Next.js) → Backend (NestJS) → Database (PostgreSQL)
                          ↓
                    OpenAI API (GPT-3.5-turbo)
```

## Technology Stack

### Backend (`apps/backend/`)

- **Framework**: NestJS 11.1.6 with TypeScript strict mode
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth (JWT + Google OAuth)
- **AI Integration**: OpenAI API (GPT-3.5-turbo)
- **Validation**: class-validator and class-transformer
- **Security**: bcrypt for password hashing, security middleware
- **Monitoring**: Custom performance and error tracking services

### Frontend (`apps/frontend/`)

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks and Context API
- **HTTP Client**: Optimized API client with error handling
- **UI Components**: Radix UI primitives via shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns
- **Performance**: Custom performance monitoring

### Database Schema

- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Primary Keys**: UUID type for all entities
- **Core Tables**: users, study_tasks, ai_chats, study_sessions
- **Conventions**: snake_case for table/column names, camelCase for TypeScript

## Development Commands

### Package Manager

- **Primary**: Use `bun` for all operations (install, run, build)
- **Legacy**: `pnpm` commands still supported but prefer `bun`

### Monorepo Root

```bash
# Install all dependencies
bun install

# Run all services in development
bun dev

# Build all packages
bun build

# Run setup scripts
bun run setup
```

### Backend (`apps/backend/`)

```bash
# Development server with hot reload
bun dev

# Database operations
bun db:generate    # Generate migrations
bun db:push       # Push schema changes
bun db:migrate    # Run migrations

# Testing
bun test          # Unit tests
bun test:e2e      # End-to-end tests
```

### Frontend (`apps/frontend/`)

```bash
# Development server
bun dev

# Build for production
bun build

# Testing
bun test          # Unit tests with Jest
bun test:e2e      # E2E tests with Playwright
```

## Required Environment Variables

### Backend

- `DATABASE_URL`: PostgreSQL connection string (required)
- `BETTER_AUTH_SECRET`: Secret for Better Auth token signing (required)
- `OPENAI_API_KEY`: OpenAI API key for AI features (required)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (required)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (required)
- `NODE_ENV`: Environment (development/staging/production)
- `PORT`: Server port (default: 3001)

### Frontend

- `NEXT_PUBLIC_API_URL`: Backend API base URL (required)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID (required)
- `NEXT_PUBLIC_BETTER_AUTH_URL`: Better Auth URL (required)
- `NODE_ENV`: Environment (development/staging/production)

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **Linting**: ESLint with consistent rules across packages
- **Formatting**: Prettier for code formatting (auto-format on save)
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Git Hooks**: Husky for pre-commit validation (lint, format, test)
- **Type Safety**: Shared types in `packages/shared-types`

## Development Rules for AI Assistant

### File Operations

- Always use correct paths: `apps/frontend/` and `apps/backend/`
- Follow existing file naming conventions (kebab-case for files, PascalCase for
  components)
- Use TypeScript interfaces and types from `packages/shared-types` when
  available

### Code Generation

- Generate type-safe code with proper error handling
- Use existing patterns from the codebase (check similar files first)
- Implement proper validation using class-validator (backend) or Zod (frontend)
- Follow NestJS module structure for backend features
- Use Next.js App Router conventions for frontend pages

### Database Operations

- Use Drizzle ORM syntax for all database operations
- Follow UUID primary key convention
- Include proper timestamps (createdAt, updatedAt)
- Use snake_case for database schema, camelCase for TypeScript

### API Design

- Follow RESTful conventions with consistent response format
- Implement proper HTTP status codes
- Use DTOs for request/response validation
- Include error handling middleware

### Testing Requirements

- Write unit tests for all services and utilities
- Include integration tests for API endpoints
- Add E2E tests for critical user flows
- Mock external services (OpenAI API) in tests

## AI Integration Guidelines

- Use GPT-3.5-turbo for cost efficiency
- Implement proper error handling for AI service failures
- Cache AI responses where appropriate
- Track usage for cost optimization
- Maintain educational focus in system prompts
- Use streaming responses for better UX
