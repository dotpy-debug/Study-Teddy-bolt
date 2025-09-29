# Study Teddy - Setup Guide

Complete step-by-step setup instructions for the Study Teddy monorepo. This guide ensures a foolproof setup process for new developers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Verification Steps](#verification-steps)
8. [Troubleshooting](#troubleshooting)
9. [Common Issues](#common-issues)

## Prerequisites

### Required Software

#### Node.js
- **Version**: 18.0.0 or higher (Current project uses v22.19.0)
- **Installation**:
  - Download from [nodejs.org](https://nodejs.org/)
  - Or use a version manager like [nvm](https://github.com/nvm-sh/nvm) (recommended)

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### pnpm Package Manager
- **Version**: 8.0.0 or higher (Current project uses v10.15.1)
- **Installation**:

```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify installation
pnpm --version
```

**CRITICAL**: Do NOT use npm or yarn for this project. Only use pnpm to avoid dependency conflicts.

#### Docker and Docker Compose
- **Docker**: Latest stable version
- **Docker Compose**: v2.0+ (usually bundled with Docker Desktop)
- **Installation**: Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)

#### PostgreSQL (Optional)
- **Version**: 15+ (if not using Docker)
- Can use Docker-based PostgreSQL instead (recommended for development)

## System Requirements

### Minimum Hardware
- **RAM**: 4GB (8GB recommended)
- **Storage**: 2GB free space
- **CPU**: Any modern processor

### Operating Systems
- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 18.04+, or equivalent)

### Port Requirements
Ensure these ports are available:
- **3000**: Frontend (Next.js)
- **3001**: Backend (NestJS)
- **5432**: PostgreSQL
- **6379**: Redis
- **8025**: MailHog
- **9000**: MinIO
- **9001**: MinIO Console

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/studyteddy.git
cd studyteddy
```

### Step 2: Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should output v18.0.0 or higher

# Check pnpm version
pnpm --version
# Should output 8.0.0 or higher

# Check Docker
docker --version
docker-compose --version
```

### Step 3: Install Dependencies

**IMPORTANT**: Always use pnpm, never npm or yarn.

```bash
# Install all dependencies (this may take 5-10 minutes)
pnpm install

# Verify workspace structure
pnpm list --depth=0
```

Expected output should show:
- `@studyteddy/backend`
- `@studyteddy/frontend`
- `@studyteddy/config`
- `@studyteddy/shared`
- `@studyteddy/shared-types`
- `@studyteddy/validators`

### Step 4: Build Shared Packages

```bash
# Build all shared packages first
pnpm build

# This ensures workspace dependencies are available
```

## Environment Configuration

### Step 1: Copy Environment Files

```bash
# Copy root environment file
cp .env.example .env

# Copy backend environment file
cp apps/backend/.env.example apps/backend/.env

# Copy frontend environment file
cp apps/frontend/.env.production.template apps/frontend/.env.local
```

### Step 2: Configure Environment Variables

#### Root .env File
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/studyteddy_dev
POSTGRES_DB=studyteddy_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Development Environment
NODE_ENV=development
```

#### Backend .env File (apps/backend/.env)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/studyteddy_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration (for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@studyteddy.com

# Application Settings
APP_PORT=3001
APP_HOST=0.0.0.0
API_PREFIX=api/v1
```

#### Frontend .env.local File (apps/frontend/.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-change-this

# Google OAuth Configuration (same as backend)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Step 3: Generate Secrets (Optional)

```bash
# Generate random secrets for development
pnpm validate:env:secrets
```

## Database Setup

### Option 1: Using Docker (Recommended)

```bash
# Start all Docker services
pnpm docker:up

# Wait for services to start (usually 30-60 seconds)
# You can check status with:
docker-compose ps

# Initialize database schema
pnpm db:push

# (Optional) Seed with sample data
pnpm db:seed
```

### Option 2: Using Local PostgreSQL

If you prefer to use a local PostgreSQL installation:

```bash
# Create database
createdb studyteddy_dev

# Update DATABASE_URL in .env files to match your local setup
# Example: postgresql://username:password@localhost:5432/studyteddy_dev

# Initialize database schema
pnpm db:push
```

### Verify Database Setup

```bash
# Open Drizzle Studio to browse database
pnpm db:studio
# Opens http://localhost:4983

# Or check database connection
pnpm --filter @studyteddy/backend run db:check
```

## Running the Application

### Development Mode (Recommended)

```bash
# Start all services with Turbo (parallel execution)
pnpm dev
```

This command starts:
- Backend API server on http://localhost:3001
- Frontend development server on http://localhost:3000
- All shared packages in watch mode

### Individual Services

If you need to start services individually:

```bash
# Start backend only
pnpm --filter @studyteddy/backend dev

# Start frontend only
pnpm --filter @studyteddy/frontend dev

# Build and watch shared packages
pnpm --filter @studyteddy/shared dev
pnpm --filter @studyteddy/config dev
pnpm --filter @studyteddy/validators dev
```

## Verification Steps

### 1. Check Service Health

```bash
# Check if all services are running
curl http://localhost:3001/health
# Should return: {"status":"ok"}

curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### 2. Access Web Interfaces

Open these URLs in your browser:

- **Frontend Application**: http://localhost:3000
- **Backend API Documentation**: http://localhost:3001/api/docs
- **Database Studio**: http://localhost:4983 (run `pnpm db:studio`)
- **MailHog** (if using Docker): http://localhost:8025
- **MinIO Console** (if using Docker): http://localhost:9001

### 3. Test API Endpoints

```bash
# Test public endpoint
curl http://localhost:3001/api/v1/health

# Test registration endpoint
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

### 4. Test Database Connection

```bash
# Check database tables
pnpm db:studio

# Run database migrations
pnpm db:generate
pnpm db:push
```

## Troubleshooting

### Common Commands for Debugging

```bash
# Clear all node_modules and reinstall
pnpm clean:deps
pnpm install

# Rebuild all packages
pnpm clean
pnpm build

# Check workspace dependencies
pnpm list --depth=0

# Verify pnpm workspace configuration
pnpm run env:check
```

### Log Files and Debugging

```bash
# View backend logs
pnpm --filter @studyteddy/backend logs

# View Docker service logs
docker-compose logs -f

# Check specific service logs
docker-compose logs postgres
docker-compose logs redis
```

### Database Issues

```bash
# Reset database completely
pnpm docker:down
docker volume prune -f
pnpm docker:up
pnpm db:push

# Check database connection
pnpm --filter @studyteddy/backend run db:check

# View database schema
pnpm db:studio
```

## Common Issues

### Issue 1: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using the port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different ports
export PORT=3001  # for frontend
export BACKEND_PORT=3002  # for backend
```

### Issue 2: pnpm Command Not Found

**Solution**:
```bash
# Install pnpm globally
npm install -g pnpm

# Or use npx
npx pnpm install
```

### Issue 3: Database Connection Failed

**Error**: `ECONNREFUSED` or `connection refused`

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database services
pnpm docker:down
pnpm docker:up

# Check environment variables
cat .env | grep DATABASE_URL
```

### Issue 4: Module Not Found Errors

**Error**: `Cannot resolve dependency` or `Module not found`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml

pnpm install

# Rebuild shared packages
pnpm build
```

### Issue 5: TypeScript Compilation Errors

**Solution**:
```bash
# Build shared packages first
pnpm --filter @studyteddy/shared build
pnpm --filter @studyteddy/shared-types build
pnpm --filter @studyteddy/validators build

# Then build applications
pnpm --filter @studyteddy/backend build
pnpm --filter @studyteddy/frontend build
```

### Issue 6: Environment Variables Not Loading

**Solution**:
```bash
# Verify .env files exist
ls -la .env*
ls -la apps/backend/.env*
ls -la apps/frontend/.env*

# Check file permissions
chmod 644 .env*

# Validate environment setup
pnpm validate:env
```

### Issue 7: Docker Services Won't Start

**Solution**:
```bash
# Clean Docker state
docker-compose down -v
docker system prune -f
docker volume prune -f

# Restart Docker Desktop (if using)
# Then try again
pnpm docker:up
```

## Performance Tips

### Development Optimization

```bash
# Use incremental builds
pnpm build --parallel

# Use watch mode for shared packages
pnpm --filter @studyteddy/shared dev

# Enable fast refresh
export NEXT_DISABLE_SWC=false
```

### Memory Usage

```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
pnpm list --depth=0 --parseable | wc -l
```

## Next Steps

After successful setup:

1. **Read the Development Guide**: Check `DEVELOPER_GUIDE.md` for coding standards
2. **Review the Architecture**: See `README.md` for system overview
3. **Check Dependencies**: Review `DEPENDENCIES.md` for detailed package information
4. **Start Developing**: Create your first feature branch and start coding!

## Getting Help

If you encounter issues not covered in this guide:

1. Check existing GitHub issues
2. Review the `TROUBLESHOOTING.md` file
3. Ask in the project Discord/Slack channel
4. Create a new GitHub issue with:
   - Your operating system
   - Node.js and pnpm versions
   - Complete error messages
   - Steps to reproduce

---

**Happy coding! 🚀**