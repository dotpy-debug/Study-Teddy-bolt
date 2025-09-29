# Study Teddy Environment Setup Guide

This comprehensive guide covers environment configuration for all deployment stages of the Study Teddy application.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Files Overview](#environment-files-overview)
- [Required Variables by Environment](#required-variables-by-environment)
- [Setup Instructions](#setup-instructions)
- [Security Guidelines](#security-guidelines)
- [Validation and Testing](#validation-and-testing)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Quick Start

### Local Development Setup

1. **Copy the local environment template:**
   ```bash
   cp .env.local .env
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Validate your environment:**
   ```bash
   bun run scripts/validate-env.ts
   ```

4. **Start the development servers:**
   ```bash
   # Start all services
   docker-compose up -d

   # Or start individual services
   bun run dev:backend
   bun run dev:frontend
   ```

### Production Setup

1. **Copy the production template:**
   ```bash
   cp .env.production .env
   ```

2. **Replace all placeholder values with secure production secrets**

3. **Validate the configuration:**
   ```bash
   bun run scripts/validate-env.ts --env production --strict
   ```

4. **Deploy using your preferred method (Docker, Kubernetes, etc.)**

## Environment Files Overview

| File | Purpose | Security Level |
|------|---------|----------------|
| `.env.local` | Local development | Low (test data) |
| `.env.development` | Development server | Medium |
| `.env.staging` | Pre-production testing | High |
| `.env.production` | Production deployment | Critical |
| `.env.test` | Automated testing | Low (mocked services) |
| `.env.docker.local` | Docker local development | Low |
| `.env.docker.production` | Docker production | Critical |

## Required Variables by Environment

### Core Variables (All Environments)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://host:port

# Authentication
JWT_SECRET=minimum-32-characters-secure-random-string
NEXTAUTH_SECRET=minimum-32-characters-secure-random-string
BETTER_AUTH_SECRET=minimum-32-characters-secure-random-string

# Application URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Development Specific

```bash
# Additional for development
OPENAI_API_KEY=sk-your-development-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DEBUG=true
API_DOCS_ENABLED=true
```

### Production Additional Requirements

```bash
# Monitoring (Required)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your-datadog-api-key

# Email Service (Required)
RESEND_API_KEY=your-resend-api-key

# Storage (Required)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket

# Security (Required)
DATABASE_SSL=true
JWT_COOKIE_SECURE=true
RATE_LIMIT_ENABLED=true
HELMET_ENABLED=true
```

## Setup Instructions

### 1. Local Development

#### Prerequisites
- Node.js 18+
- Bun (latest)
- Docker and Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

#### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd study-teddy
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local .env
   # Edit .env with your local values
   ```

4. **Start infrastructure services:**
   ```bash
   docker-compose up -d postgres redis mailhog
   ```

5. **Run database migrations:**
   ```bash
   cd apps/backend
   bun run db:migrate
   ```

6. **Start the applications:**
   ```bash
   # Terminal 1: Backend
   cd apps/backend
   bun run dev

   # Terminal 2: Frontend
   cd apps/frontend
   bun run dev
   ```

7. **Verify setup:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3001/api/docs
   - MailHog: http://localhost:8025

### 2. Development Server Deployment

#### Using Railway

1. **Create a Railway project:**
   ```bash
   railway login
   railway init
   ```

2. **Set environment variables:**
   ```bash
   # Copy variables from .env.development
   railway variables set NODE_ENV=development
   railway variables set DATABASE_URL=<your-database-url>
   # ... add all required variables
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

#### Using Vercel (Frontend)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd apps/frontend
   vercel --env-file=../../.env.development
   ```

3. **Set environment variables in Vercel dashboard:**
   - Go to your project settings
   - Add all `NEXT_PUBLIC_*` variables
   - Add authentication secrets

### 3. Staging Environment

#### Using Kubernetes

1. **Create namespace:**
   ```bash
   kubectl create namespace studyteddy-staging
   ```

2. **Apply ConfigMaps:**
   ```bash
   kubectl apply -f k8s/configmap-staging.yaml
   ```

3. **Create secrets (replace placeholder values first):**
   ```bash
   # Edit k8s/secrets-template.yaml with actual values
   kubectl apply -f k8s/secrets-staging.yaml
   ```

4. **Deploy applications:**
   ```bash
   kubectl apply -f k8s/deployment-staging.yaml
   kubectl apply -f k8s/service-staging.yaml
   kubectl apply -f k8s/ingress-staging.yaml
   ```

### 4. Production Deployment

#### Security Checklist Before Production

- [ ] All secrets use cryptographically secure random values
- [ ] Database SSL is enabled
- [ ] Rate limiting is configured
- [ ] CORS is restricted to your domain
- [ ] Security headers are enabled
- [ ] Source maps are disabled
- [ ] Debug mode is disabled
- [ ] API documentation is disabled
- [ ] Monitoring is configured (Sentry, DataDog)
- [ ] Backup strategy is in place
- [ ] SSL certificates are valid

#### Docker Production Deployment

1. **Prepare environment:**
   ```bash
   cp .env.docker.production .env
   # Replace ALL placeholder values with secure production secrets
   ```

2. **Validate configuration:**
   ```bash
   bun run scripts/validate-env.ts --env production --strict
   ```

3. **Build and deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

4. **Verify deployment:**
   ```bash
   # Check all services are running
   docker-compose -f docker-compose.prod.yml ps

   # Check logs
   docker-compose -f docker-compose.prod.yml logs -f

   # Run health checks
   curl https://your-domain.com/health
   curl https://api.your-domain.com/health
   ```

## Security Guidelines

### Secret Management

#### Development
- Use test/development keys only
- Never commit real secrets to version control
- Use `.env.local` for local overrides
- Rotate development secrets regularly

#### Production
- Use a dedicated secret management system (AWS Secrets Manager, HashiCorp Vault, etc.)
- Implement secret rotation
- Use different secrets for each environment
- Monitor secret access and usage

### Secret Generation

Generate secure secrets using these commands:

```bash
# JWT secrets (64 characters)
openssl rand -base64 48

# API keys and passwords (32 characters)
openssl rand -base64 24

# Database passwords (24 characters)
openssl rand -base64 18
```

### Environment-Specific Security

#### Local Development
- Use weak secrets (for convenience)
- Disable SSL requirements
- Enable debug features
- Allow all CORS origins

#### Staging
- Use production-like secrets
- Enable SSL
- Restrict CORS
- Enable monitoring
- Test security features

#### Production
- Use cryptographically secure secrets
- Enable all security features
- Restrict access
- Enable comprehensive monitoring
- Regular security audits

## Validation and Testing

### Environment Validation

Run the validation script to check your environment:

```bash
# Validate current environment
bun run scripts/validate-env.ts

# Validate specific environment
bun run scripts/validate-env.ts --env production

# Strict mode (fail on warnings)
bun run scripts/validate-env.ts --strict
```

### Health Checks

Check service connectivity:

```bash
# Check database connection
bun run scripts/health-check.ts --service database

# Check all services
bun run scripts/health-check.ts --all

# Continuous monitoring
bun run scripts/health-check.ts --watch
```

### Testing Environment Variables

```bash
# Run tests with test environment
NODE_ENV=test bun test

# Test environment validation
bun run scripts/validate-env.ts --env test

# Test with mock services
MOCK_EXTERNAL_SERVICES=true bun test
```

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check database URL format
echo $DATABASE_URL

# Test connection
bun run scripts/test-db-connection.ts

# Check network connectivity
telnet database-host 5432
```

#### Redis Connection Errors

```bash
# Check Redis URL
echo $REDIS_URL

# Test Redis connection
redis-cli ping

# Check Redis configuration
redis-cli config get "*"
```

#### Authentication Issues

```bash
# Verify JWT secret length
echo $JWT_SECRET | wc -c  # Should be at least 32

# Test JWT token generation
bun run scripts/test-jwt.ts

# Check OAuth configuration
curl -I "https://accounts.google.com/o/oauth2/auth?client_id=$GOOGLE_CLIENT_ID&response_type=code&scope=email"
```

#### External Service Issues

```bash
# Test OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test email service
bun run scripts/test-email.ts

# Test file storage
bun run scripts/test-storage.ts
```

### Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `DATABASE_URL is required` | Missing database configuration | Set `DATABASE_URL` in your environment file |
| `JWT secret must be at least 32 characters` | Weak JWT secret | Generate a secure secret: `openssl rand -base64 32` |
| `Production environment validation failed` | Using dev secrets in production | Replace all placeholder values with secure secrets |
| `CORS origin mismatch` | Frontend/backend URL mismatch | Ensure `CORS_ORIGIN` matches `FRONTEND_URL` |
| `SSL connection required` | Database SSL not configured | Set `DATABASE_SSL=true` and configure SSL certificates |

### Debugging Environment Issues

1. **Enable debug logging:**
   ```bash
   DEBUG=true LOG_LEVEL=debug bun run dev
   ```

2. **Check environment loading:**
   ```bash
   # Print all environment variables
   bun run scripts/print-env.ts

   # Check specific variable
   echo "API URL: $NEXT_PUBLIC_API_URL"
   ```

3. **Validate configuration schema:**
   ```bash
   # Run validation with detailed output
   bun run scripts/validate-env.ts --verbose
   ```

## Best Practices

### Environment File Management

1. **Use a consistent naming convention:**
   - `.env.local` - Local development
   - `.env.development` - Development server
   - `.env.staging` - Staging environment
   - `.env.production` - Production environment
   - `.env.test` - Testing environment

2. **Document all variables:**
   - Include comments explaining each variable
   - Group related variables together
   - Specify which variables are required vs optional

3. **Version control:**
   - Commit `.env.example` and `.env.*.example` files
   - Never commit actual `.env` files
   - Use `.gitignore` to prevent accidental commits

### Security Best Practices

1. **Secret management:**
   - Use different secrets for each environment
   - Rotate secrets regularly
   - Use a centralized secret management system for production
   - Monitor secret access and usage

2. **Access control:**
   - Limit who can access production environment variables
   - Use role-based access control
   - Audit environment variable changes
   - Implement approval processes for production changes

3. **Validation:**
   - Always validate environment variables on startup
   - Use type-safe environment validation (Zod schemas)
   - Fail fast if required variables are missing
   - Log configuration issues clearly

### Development Workflow

1. **Local development:**
   - Use Docker for consistent local environment
   - Mock external services when possible
   - Use development-specific feature flags
   - Enable debug features and logging

2. **CI/CD integration:**
   - Validate environment configuration in CI
   - Use different environments for different branches
   - Implement automated testing of environment configurations
   - Use infrastructure as code for reproducible deployments

3. **Monitoring:**
   - Monitor environment health continuously
   - Set up alerts for configuration issues
   - Track environment variable changes
   - Monitor secret rotation and expiration

### Performance Considerations

1. **Environment loading:**
   - Load environment variables once at startup
   - Cache validated configuration
   - Fail fast on invalid configuration
   - Use efficient validation schemas

2. **Secret access:**
   - Minimize secret access frequency
   - Cache secrets appropriately
   - Use connection pooling for external services
   - Implement circuit breakers for external dependencies

---

For more detailed information, see:
- [Security Guidelines](SECURITY_GUIDELINES.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)