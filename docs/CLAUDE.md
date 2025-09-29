# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Study Teddy is an AI-powered study planner application that helps students organize study time and get instant help with questions. The project is built as a **Turborepo monorepo** with Next.js 15.5.3 frontend and NestJS 11.1.6 backend using PostgreSQL and Drizzle ORM.

## Project Structure (Current State)

```
studyteddy/
├── apps/
│   ├── backend/          # NestJS 11.1.6 API server
│   └── frontend/         # Next.js 15.5.3 web application
├── packages/
│   ├── config/           # Shared configuration
│   ├── shared/           # Shared utilities and types
│   ├── shared-types/     # TypeScript type definitions
│   └── validators/       # Shared validation schemas
├── infrastructure/       # Docker and deployment config
├── scripts/             # Build and deployment scripts
└── docs/               # Project documentation
```

## Tech Stack

### Backend (`apps/backend/`)
- **Framework**: NestJS 11.1.6 with TypeScript 5.7.3
- **Database**: PostgreSQL with Drizzle ORM 0.44.5
- **Authentication**: JWT + Google OAuth (Passport.js)
- **AI Integration**: OpenAI 5.20.3 (GPT-3.5 Turbo)
- **Background Jobs**: BullMQ 5.1.5 with Redis
- **Real-time**: WebSockets with Socket.IO 4.8.1
- **Validation**: class-validator 0.14.2 and class-transformer 0.5.1
- **Testing**: Jest 29.7.0 with ts-jest
- **Rate Limiting**: @nestjs/throttler 6.4.0

### Frontend (`apps/frontend/`)
- **Framework**: Next.js 15.5.3 with App Router and React 18.3.1
- **Styling**: Tailwind CSS v4 + Shadcn/ui components
- **Forms**: React Hook Form 7.62.0 with Zod 4.1.8 validation
- **HTTP Client**: Axios 1.12.2
- **Authentication**: NextAuth.js 4.24.11
- **Testing**: Jest 30.1.3 with React Testing Library
- **State Management**: React Context + custom hooks

### Shared Packages
- **Package Manager**: PNPM with workspaces
- **Build System**: Turborepo 1.13.4
- **Linting**: ESLint 9.18.0 with TypeScript 8.44.1
- **Formatting**: Prettier 3.4.2
- **TypeScript**: 5.7.3 across all packages

## Development Commands

### Monorepo Commands (from root)
```bash
# Start all services in development mode
pnpm dev

# Build all packages and applications
pnpm build

# Run linting across all packages
pnpm lint

# Run type checking across all packages
pnpm typecheck

# Run all tests
pnpm test

# Database operations (affects backend)
pnpm db:generate        # Generate Drizzle migrations
pnpm db:push           # Push schema changes to database
pnpm db:studio         # Open Drizzle Studio

# Docker operations
pnpm docker:up         # Start all Docker services
pnpm docker:down       # Stop all Docker services
```

### Backend Commands (`apps/backend/`)
```bash
cd apps/backend

# Development
pnpm dev                 # Start dev server with hot reload (port 3001)
pnpm build              # Build for production
pnpm start:prod         # Start production server

# Database
pnpm db:generate        # Generate Drizzle migrations
pnpm db:push           # Push schema changes to database
pnpm db:migrate        # Run migrations
pnpm db:studio         # Open Drizzle Studio

# Testing & Quality
pnpm test              # Run unit tests with Jest
pnpm test:e2e          # Run e2e tests
pnpm lint              # Run ESLint
pnpm typecheck         # TypeScript type checking
```

### Frontend Commands (`apps/frontend/`)
```bash
cd apps/frontend

# Development
pnpm dev               # Start dev server (port 3000)
pnpm build            # Build for production
pnpm start            # Start production server

# Testing & Quality
pnpm test             # Run Jest tests
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript type checking
```

## Database Schema

The application uses Drizzle ORM with the following main tables:
- **users**: User accounts with Google OAuth support
- **study_tasks**: Study tasks with subjects, due dates, and priorities
- **ai_chats**: AI conversation history with token tracking
- **study_sessions**: Time tracking for study activities

Schema definition: `studyteddy-backend/src/db/schema.ts`
Migrations: `studyteddy-backend/drizzle/migrations/`

## API Structure

### Authentication Endpoints
- POST `/auth/register` - Email/password registration
- POST `/auth/login` - Email/password login
- GET `/auth/google` - Google OAuth redirect
- GET `/auth/google/callback` - OAuth callback
- POST `/auth/refresh` - Refresh JWT token
- GET `/auth/me` - Get current user

### Core API Modules
- `/tasks` - CRUD operations for study tasks
- `/ai/chat` - AI chat interactions with OpenAI
- `/dashboard` - User statistics and analytics
- `/users` - User profile management

## Key Environment Variables

Both applications require `.env` files. Key variables include:

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth credentials

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL

## Architecture Notes

### Backend Architecture
- Modular structure with feature-based modules (auth, tasks, ai, dashboard)
- Guards for JWT authentication on protected routes
- DTOs with class-validator for request validation
- Drizzle ORM for type-safe database queries
- Swagger/OpenAPI documentation at `/api/docs`

### Frontend Architecture
- App Router with route groups for auth and dashboard
- Server and Client Components separation
- Shadcn/ui component library with Radix UI primitives
- Form validation with React Hook Form + Zod
- Axios interceptors for API authentication

### Authentication Flow
1. JWT-based authentication with 7-day expiry
2. Google OAuth 2.0 integration for social login
3. Protected routes using NestJS Guards (backend) and NextAuth middleware (frontend)
4. Refresh token mechanism for session management

## Testing Approach

### Backend
- Unit tests with Jest for services
- E2E tests for API endpoints
- Test files follow `*.spec.ts` pattern

### Frontend
- Component testing with React Testing Library
- E2E tests with Playwright (if configured)

## Development Workflow

1. Start PostgreSQL database
2. Run backend with `npm run start:dev` in `studyteddy-backend/`
3. Run frontend with `npm run dev` in `studyteddy-frontend/`
4. Backend API runs on http://localhost:3001
5. Frontend runs on http://localhost:3000
6. API documentation available at http://localhost:3001/api/docs