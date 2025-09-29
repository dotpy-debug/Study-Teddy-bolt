# Study Teddy 🧸📚

> AI-powered study planner that helps students organize their study time and get instant help with academic questions.

[![CI/CD Pipeline](https://github.com/yourusername/studyteddy/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/yourusername/studyteddy/actions/workflows/ci-cd.yml)
[![Code Quality](https://github.com/yourusername/studyteddy/actions/workflows/code-quality.yml/badge.svg)](https://github.com/yourusername/studyteddy/actions/workflows/code-quality.yml)
[![Coverage](https://codecov.io/gh/yourusername/studyteddy/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/studyteddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-11.1.6-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)

## 🚀 Overview

Study Teddy is a comprehensive study management platform that combines task organization with AI-powered learning assistance. Students can create study schedules, track their progress, and get instant help from an AI tutor - all in one place.

### Key Features
- 📅 **Study Planner** - Create and manage study tasks with due dates and priorities
- 🤖 **AI Study Assistant** - Get instant help with homework and concept explanations
- 📊 **Progress Dashboard** - Track study streaks, completion rates, and time spent
- 🔐 **Secure Authentication** - Email/password and Google OAuth support
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│           Study Teddy Monorepo (pnpm + Turbo)      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  Frontend  │  │  Backend   │  │   Packages   │ │
│  │ (Next.js)  │  │ (NestJS)   │  │  (Shared)    │ │
│  └──────┬─────┘  └──────┬─────┘  └──────┬───────┘ │
│         │                │                │         │
│         └────────────────┴────────────────┘         │
│                          │                          │
│    ┌─────────────────────┴──────────────────┐      │
│    │            Infrastructure              │      │
│    ├─────────┬──────────┬─────────┬────────┤      │
│    │Postgres │  Redis   │ MailHog │ MinIO  │      │
│    └─────────┴──────────┴─────────┴────────┘      │
└─────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
study-teddy/
├── apps/
│   ├── backend/             # NestJS backend API
│   └── frontend/            # Next.js frontend application
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   ├── validators/          # Shared validation schemas
│   └── config/              # Shared configuration
├── infrastructure/
│   └── docker/              # Docker configurations
├── docker-compose.yml       # Docker services configuration
├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── package.json             # Monorepo root configuration
└── plan.md               # Detailed implementation plan
```

## 🚀 Quick Start

### Prerequisites

#### Required Software
- **Node.js**: 18.0.0+ (recommended: 18.19.0 as specified in .nvmrc)
- **pnpm**: 8.0.0+ (current project uses 10.15.1)
- **Docker**: Latest stable version with Docker Compose v2.0+
- **PostgreSQL**: 15+ (optional, can use Docker instead)

#### Version Management
```bash
# Using nvm (recommended for Node.js version management)
nvm use  # Uses version from .nvmrc (18.19.0)

# Or install specific version
nvm install 18.19.0
nvm use 18.19.0
```

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/study-teddy.git
cd study-teddy
```

### 2. Install pnpm (if not installed)
```bash
# Install pnpm globally (REQUIRED - do NOT use npm or yarn)
npm install -g pnpm@latest

# Verify installation
pnpm --version  # Should show 8.0.0 or higher
```

### 3. Install Dependencies
```bash
# Install all dependencies for the monorepo
pnpm install

# This installs dependencies for:
# - Root monorepo (Turbo, build tools, linting)
# - apps/backend (NestJS 11.0.1, Drizzle ORM, OpenAI)
# - apps/frontend (Next.js 15.5.3, Radix UI, NextAuth)
# - packages/* (shared TypeScript types and utilities)

# Build shared packages (CRITICAL STEP)
pnpm build
```

**⚠️ IMPORTANT**: Always use `pnpm` - never mix with `npm` or `yarn` to avoid dependency conflicts.

### 4. Environment Setup
```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Required: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
```

### 5. Database Setup
```bash
# Start all Docker services (PostgreSQL, Redis, MailHog, MinIO)
pnpm docker:up

# Or use your own PostgreSQL instance
# Update DATABASE_URL in .env

# Run migrations
pnpm db:push

# (Optional) Open Drizzle Studio
pnpm db:studio
```

### 6. Start Development Servers
```bash
# Start all services with Turbo (recommended)
pnpm dev

# This starts:
# - Backend API server on http://localhost:3001
# - Frontend development server on http://localhost:3000
# - All shared packages in watch mode for hot reloading

# Alternative: Start services individually
pnpm --filter @studyteddy/backend dev    # Backend only
pnpm --filter @studyteddy/frontend dev   # Frontend only
```

### 7. Verification
```bash
# Test backend health
curl http://localhost:3001/health

# Test frontend
open http://localhost:3000

# View API documentation
open http://localhost:3001/api/docs
```

### 8. Access Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Database Studio**: http://localhost:4983 (run `pnpm db:studio`)
- **pgAdmin**: http://localhost:5050
- **Adminer**: http://localhost:8080
- **MailHog**: http://localhost:8025
- **MinIO Console**: http://localhost:9001

## 📋 Detailed Setup Guide

For comprehensive setup instructions, troubleshooting, and dependency management:

- **[SETUP.md](SETUP.md)** - Complete step-by-step installation guide
- **[DEPENDENCIES.md](DEPENDENCIES.md)** - Detailed dependency analysis and management
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Development workflows and best practices

## 🛠️ Development

### Available Scripts

#### Root Level (Monorepo)
```bash
# Development
pnpm dev            # Start all services with Turbo
pnpm build          # Build all projects in parallel

# Quality Assurance
pnpm lint           # Lint all code
pnpm test           # Run all tests
pnpm test:e2e       # Run e2e tests
pnpm typecheck      # Type check all projects
pnpm format         # Format with Prettier

# Database Management
pnpm db:generate    # Generate Drizzle migrations
pnpm db:push        # Push schema changes to database
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Drizzle Studio

# Infrastructure
pnpm docker:up      # Start Docker services
pnpm docker:down    # Stop Docker services
pnpm docker:logs    # View Docker logs

# Maintenance
pnpm clean          # Clean all build artifacts
pnpm validate:env   # Validate environment configuration
```

#### Individual Workspace Commands
```bash
# Backend (NestJS)
pnpm --filter @studyteddy/backend dev      # Start backend development server
pnpm --filter @studyteddy/backend build    # Build backend for production
pnpm --filter @studyteddy/backend test     # Run backend tests
pnpm --filter @studyteddy/backend lint     # Lint backend code

# Frontend (Next.js)
pnpm --filter @studyteddy/frontend dev     # Start frontend development server
pnpm --filter @studyteddy/frontend build   # Build frontend for production
pnpm --filter @studyteddy/frontend test    # Run frontend tests
pnpm --filter @studyteddy/frontend lint    # Lint frontend code

# Shared Packages
pnpm --filter @studyteddy/shared build     # Build shared utilities
pnpm --filter @studyteddy/validators build # Build validation schemas
```

### API Documentation

Once the backend is running, access the Swagger documentation at:
```
http://localhost:3001/api/docs
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/studyteddy

# Backend
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

See `.env.example` for all available options.

## 🧪 Testing

```bash
# Run all tests across the monorepo
pnpm test

# Run tests for specific workspaces
pnpm --filter @studyteddy/backend test     # Backend unit tests
pnpm --filter @studyteddy/frontend test    # Frontend component tests

# Run tests with coverage
pnpm --filter @studyteddy/backend test:cov # Backend coverage
pnpm --filter @studyteddy/frontend test:coverage # Frontend coverage

# Run E2E tests
pnpm test:e2e

# Watch mode for development
pnpm --filter @studyteddy/backend test:watch
pnpm --filter @studyteddy/frontend test:watch
```

## 📦 Building for Production

```bash
# Build all projects in parallel with Turbo
pnpm build

# Build specific workspaces
pnpm --filter @studyteddy/backend build    # Backend only
pnpm --filter @studyteddy/frontend build   # Frontend only

# Build shared packages first (dependency order)
pnpm --filter "./packages/*" build         # All shared packages
pnpm --filter @studyteddy/shared build     # Specific shared package

# Production build with optimizations
NODE_ENV=production pnpm build

# Analyze frontend bundle size
pnpm --filter @studyteddy/frontend build:analyze
```

## 🚢 Deployment

### Backend (Railway/Render/Docker)
1. Set environment variables in deployment platform
2. Set build command: `pnpm --filter @studyteddy/backend build`
3. Set start command: `pnpm --filter @studyteddy/backend start:prod`
4. Ensure PostgreSQL database is available

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Set build command: `pnpm --filter @studyteddy/frontend build`
3. Set output directory: `apps/frontend/.next`
4. Configure environment variables

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Or use individual Dockerfiles
docker build -f apps/backend/Dockerfile -t studyteddy-backend .
docker build -f apps/frontend/Dockerfile -t studyteddy-frontend .
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

## 📚 Tech Stack

### Backend
- **Framework**: NestJS 11.1.6
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js (JWT + Google OAuth)
- **AI Integration**: OpenAI GPT-3.5
- **Validation**: class-validator

### Frontend
- **Framework**: Next.js 15.5.3 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

### Shared
- **Types**: TypeScript shared types package
- **Validation**: Zod schemas
- **Utilities**: Common helper functions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) for the powerful backend framework
- [Next.js](https://nextjs.org/) for the React framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [OpenAI](https://openai.com/) for AI capabilities

## 📞 Support

For support, email support@studyteddy.com or create an issue in the repository.

---

**Made with ❤️ by the Study Teddy Team**