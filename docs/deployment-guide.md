# StudyTeddy Deployment Guide

## Overview

This guide covers the complete deployment process for StudyTeddy, from initial setup to production operations. The application is deployed using Vercel with a Neon PostgreSQL database and comprehensive monitoring.

## Architecture

### Technology Stack
- **Frontend**: Next.js 15.5.3 with App Router
- **Backend**: API routes in Next.js
- **Database**: PostgreSQL on Neon with connection pooling
- **Deployment**: Vercel
- **Monitoring**: Sentry + Vercel Analytics
- **CI/CD**: GitHub Actions

### Environment Structure
- **Production**: `main` branch → https://studyteddy.vercel.app
- **Staging**: `develop` branch → https://studyteddy-staging.vercel.app
- **Preview**: Pull requests → unique URLs

## Prerequisites

Before deploying, ensure you have:

1. **Accounts Setup**
   - GitHub repository
   - Vercel account
   - Neon database account
   - Sentry account (for monitoring)

2. **Tools Installed**
   - Node.js 18+ and Bun
   - Vercel CLI
   - Git
   - PostgreSQL client tools

3. **Secrets Prepared**
   - OAuth client credentials (Google, GitHub)
   - OpenAI API key
   - Sentry DSN and auth token
   - NextAuth secret

## Initial Setup

### 1. Database Setup

Create your Neon database:

```bash
# Run the interactive setup
bun scripts/setup-neon-database.js

# Or manually configure
# 1. Go to https://console.neon.tech/
# 2. Create project "studyteddy"
# 3. Copy connection strings
```

### 2. Environment Configuration

```bash
# Set up environment variables
bun scripts/setup-vercel-env.js

# This will:
# - Link to Vercel project
# - Configure production/preview environments
# - Validate required variables
```

### 3. Monitoring Setup

```bash
# Configure Sentry and analytics
bun scripts/setup-monitoring.js

# This will:
# - Set up Sentry project
# - Configure error tracking
# - Set up performance monitoring
```

## Deployment Process

### Automated Deployment (Recommended)

The application automatically deploys via GitHub Actions:

1. **Pull Request**: Creates preview deployment
2. **Push to `develop`**: Deploys to staging
3. **Push to `main`**: Deploys to production

### Manual Deployment

For manual deployment:

```bash
# Complete deployment pipeline
bun scripts/ci-cd-pipeline.js production

# Or step by step
bun scripts/deploy-to-vercel.js

# Quick deployment
vercel --prod
```

## Environment Variables

### Required Variables

```bash
# Core Application
NEXTAUTH_URL=https://studyteddy.vercel.app
NEXTAUTH_SECRET=your-32-char-secret
DATABASE_URL=postgresql://user:pass@neon.tech/db?sslmode=require&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://user:pass@neon.tech/db?sslmode=require

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services
OPENAI_API_KEY=sk-your-openai-key

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=studyteddy-frontend
```

### Setting Variables

**Via Script:**
```bash
bun scripts/setup-vercel-env.js
```

**Via Vercel CLI:**
```bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
```

**Via Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select project → Settings → Environment Variables
3. Add variables for production and preview

## Database Management

### Migrations

```bash
# Generate migration from schema changes
bun scripts/migration-manager.js generate

# Run pending migrations
bun scripts/migration-manager.js migrate

# Check migration status
bun scripts/migration-manager.js status

# Rollback migration (if needed)
bun scripts/migration-manager.js rollback migration-file.sql
```

### Backups

```bash
# Create database backup
bun scripts/backup-restore.js backup-db production

# Complete backup (database + config + code)
bun scripts/backup-restore.js backup-all

# Restore from backup
bun scripts/backup-restore.js restore-db backup-file.sql.gz

# List available backups
bun scripts/backup-restore.js list

# Schedule cleanup
bun scripts/backup-restore.js cleanup
```

## Performance Monitoring

### Performance Budgets

The application enforces strict performance budgets:
- Total bundle size: < 250KB gzipped
- API response time: p95 < 300ms
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Performance Checks

```bash
# Run performance validation
bun scripts/performance-check.js https://studyteddy.vercel.app

# Build with analysis
ANALYZE=true bun build

# Monitor in production
# - Vercel Analytics dashboard
# - Sentry performance monitoring
# - Core Web Vitals tracking
```

## Staging Environment

### Setup

```bash
# Configure staging environment
bun scripts/setup-staging-environment.js

# Deploy to staging
git push origin develop
```

### Features

- Separate staging database
- Preview deployments for PRs
- Relaxed rate limits for testing
- Debug mode enabled
- Test data safe environment

## Monitoring and Alerts

### Error Monitoring

**Sentry Integration:**
- Automatic error capture
- Performance monitoring
- Release tracking
- Session replay

**Alert Thresholds:**
- Error rate > 1%
- Response time p95 > 300ms
- Database connection failures
- Security incidents

### Analytics

**Vercel Analytics:**
- Page views and visitors
- Core Web Vitals
- Geographic distribution
- Custom events

**Custom Metrics:**
- User registration rate
- Study session completion
- AI chat usage
- Feature adoption

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear cache and rebuild
bun clean
bun build:packages
bun run build --filter=@studyteddy/frontend
```

**Database Connection Issues:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check migration status
bun scripts/migration-manager.js status $DATABASE_URL
```

**Environment Variable Issues:**
```bash
# Validate environment setup
bun scripts/setup-vercel-env.js

# Check Vercel environment variables
vercel env ls
```

### Performance Issues

**Bundle Size Too Large:**
```bash
# Analyze bundle
ANALYZE=true bun build

# Check bundle sizes
bun scripts/performance-check.js
```

**Slow Response Times:**
```bash
# Check API performance
curl -w "@curl-format.txt" -o /dev/null -s https://studyteddy.vercel.app/api/health

# Monitor in Sentry performance tab
```

### Database Issues

**Migration Failures:**
```bash
# Check pending migrations
bun scripts/migration-manager.js status

# Validate migration
bun scripts/migration-manager.js validate migration-file.sql

# Manual rollback if needed
bun scripts/migration-manager.js rollback migration-file.sql
```

## Security Considerations

### Production Security

1. **Environment Variables**
   - Store secrets in Vercel environment variables
   - Never commit secrets to git
   - Use different values for staging/production

2. **Database Security**
   - Use connection pooling
   - Enable SSL connections
   - Regular security updates

3. **Application Security**
   - HTTPS only in production
   - Security headers configured
   - CSP policies implemented
   - Regular dependency updates

### Incident Response

1. **Immediate Response**
   - Check Sentry for errors
   - Verify Vercel deployment status
   - Monitor user reports

2. **Investigation**
   - Review deployment logs
   - Check database connectivity
   - Analyze performance metrics

3. **Resolution**
   - Rollback if necessary
   - Apply hotfixes
   - Monitor recovery

## Maintenance

### Daily Tasks
- [ ] Review error reports in Sentry
- [ ] Check performance metrics
- [ ] Monitor deployment status
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Performance trend analysis
- [ ] Security dependency updates
- [ ] Capacity planning review
- [ ] Team deployment retrospective

### Monthly Tasks
- [ ] Full backup verification
- [ ] Performance budget review
- [ ] Security audit
- [ ] Documentation updates

## Useful Commands

### Quick Reference

```bash
# Development
bun dev                              # Start development server
bun build                           # Build application
bun test                            # Run tests

# Database
bun db:generate                     # Generate migration
bun db:migrate                      # Run migrations
bun db:studio                       # Open database studio

# Deployment
bun scripts/ci-cd-pipeline.js       # Full deployment pipeline
bun scripts/deploy-to-vercel.js     # Deploy to Vercel
bun scripts/performance-check.js    # Performance validation

# Maintenance
bun scripts/backup-restore.js backup-all    # Create complete backup
bun scripts/migration-manager.js status     # Check migration status
bun scripts/setup-monitoring.js             # Configure monitoring
```

### Environment URLs

- **Production**: https://studyteddy.vercel.app
- **Staging**: https://studyteddy-staging.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech/
- **Sentry Dashboard**: https://sentry.io/

## Support

### Documentation
- [Environment Variables](./environment-variables.md)
- [Monitoring Guide](./monitoring.md)
- [Staging Environment](./staging-environment.md)

### Team Contacts
- **DevOps**: devops@studyteddy.com
- **Backend**: backend@studyteddy.com
- **Frontend**: frontend@studyteddy.com
- **Alerts**: alerts@studyteddy.com

### Emergency Procedures
1. **Production Down**: Contact on-call engineer
2. **Data Issues**: Database team escalation
3. **Security Incident**: Security team immediate notification

---

*This guide is maintained by the StudyTeddy DevOps team. Last updated: $(date)*