# 🚀 StudyTeddy Vercel Deployment

## Quick Start

Get StudyTeddy deployed to production in under 10 minutes:

```bash
# 1. Clone and install
git clone https://github.com/your-username/studyteddy.git
cd studyteddy
bun install

# 2. Set up database
bun scripts/setup-neon-database.js

# 3. Configure Vercel
bun scripts/setup-vercel-env.js

# 4. Deploy
bun scripts/deploy-to-vercel.js production
```

## 📋 Deployment Checklist

### Prerequisites
- [ ] Neon database created
- [ ] Vercel account connected
- [ ] Environment variables configured
- [ ] Sentry monitoring set up
- [ ] Domain configured (optional)

### Deployment Steps
- [ ] Database migrations applied
- [ ] Performance budgets met
- [ ] All tests passing
- [ ] Environment variables validated
- [ ] Monitoring configured

### Post-Deployment
- [ ] Health checks passing
- [ ] Performance metrics within limits
- [ ] Error monitoring active
- [ ] Backup strategy in place

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │    │   Vercel Edge    │    │   Neon DB       │
│                 │───▶│                  │───▶│                 │
│ • Next.js App   │    │ • Global CDN     │    │ • PostgreSQL    │
│ • API Routes    │    │ • Serverless     │    │ • Connection    │
│ • Turborepo     │    │ • Auto-scaling   │    │   Pooling       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐            │
         │              │   Monitoring     │            │
         └──────────────│                  │────────────┘
                        │ • Sentry         │
                        │ • Vercel Analytics│
                        │ • Performance    │
                        └──────────────────┘
```

## 🔧 Configuration Files

### Core Configuration
- [`vercel.json`](./vercel.json) - Vercel deployment settings
- [`next.config.js`](./apps/frontend/next.config.js) - Next.js optimization
- [`turbo.json`](./turbo.json) - Monorepo build configuration

### Environment Templates
- [`.env.vercel.template`](./.env.vercel.template) - Vercel environment variables
- [`apps/frontend/.env.production.template`](./apps/frontend/.env.production.template) - Frontend production config

### GitHub Actions
- [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) - CI/CD pipeline

## 📊 Performance Requirements

### Bundle Size Budgets
- **Total**: < 250KB gzipped
- **Main chunk**: < 150KB gzipped
- **Vendor chunk**: < 100KB gzipped
- **CSS**: < 20KB gzipped

### Performance Targets
- **p95 latency**: < 300ms
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### Monitoring
- Real-time error tracking
- Performance monitoring
- Core Web Vitals tracking
- Custom metrics dashboard

## 🗄️ Database Configuration

### Neon PostgreSQL
- **Connection pooling** enabled
- **SSL** required
- **Backup** strategy implemented
- **Migration** management

### Connection Settings
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/studyteddy?sslmode=require&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/studyteddy?sslmode=require
```

## 🔐 Security Configuration

### Environment Variables
- All secrets stored in Vercel environment variables
- Different values for preview/production
- No secrets committed to git

### Security Headers
- Content Security Policy
- XSS Protection
- Frame Options
- Content Type Options

### Authentication
- NextAuth.js integration
- Google OAuth configured
- JWT token management
- Session security

## 🚨 Monitoring & Alerts

### Error Tracking (Sentry)
- Automatic error capture
- Performance monitoring
- Release tracking
- Custom alerts

### Analytics (Vercel)
- Real-time analytics
- Core Web Vitals
- Geographic insights
- Custom events

### Alert Configuration
- Error rate > 1%
- Response time > 300ms
- Database issues
- Performance degradation

## 📋 Scripts Reference

### Setup Scripts
```bash
bun scripts/setup-neon-database.js     # Database setup
bun scripts/setup-vercel-env.js        # Environment configuration
bun scripts/setup-monitoring.js        # Monitoring setup
bun scripts/setup-staging-environment.js # Staging environment
```

### Deployment Scripts
```bash
bun scripts/deploy-to-vercel.js        # Full deployment
bun scripts/ci-cd-pipeline.js          # Complete pipeline
bun scripts/performance-check.js       # Performance validation
```

### Maintenance Scripts
```bash
bun scripts/backup-restore.js          # Database backups
bun scripts/migration-manager.js       # Database migrations
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
1. **Code Quality**: TypeScript, ESLint, Tests
2. **Build**: Packages and application
3. **Performance**: Bundle size and speed checks
4. **Deploy**: Vercel deployment
5. **Verify**: Post-deployment health checks

### Branch Strategy
- `main` → Production deployment
- `develop` → Staging deployment
- `feature/*` → Preview deployments

## 🏥 Health Checks

### Automatic Monitoring
- API endpoint health
- Database connectivity
- Performance metrics
- Error rates

### Manual Verification
```bash
# Health check endpoint
curl https://studyteddy.vercel.app/api/health

# Performance audit
bun scripts/performance-check.js https://studyteddy.vercel.app

# Database status
bun scripts/migration-manager.js status
```

## 📚 Documentation

### Detailed Guides
- [Complete Deployment Guide](./docs/deployment-guide.md)
- [Environment Variables](./docs/environment-variables.md)
- [Monitoring Setup](./docs/monitoring.md)
- [Staging Environment](./docs/staging-environment.md)

### API Documentation
- Health endpoint: `/api/health`
- Monitoring: `/monitoring`
- Database status: Available via scripts

## 🆘 Troubleshooting

### Common Issues

**Build Failures:**
```bash
bun clean && bun build:packages && bun build
```

**Environment Issues:**
```bash
vercel env ls
bun scripts/setup-vercel-env.js
```

**Database Problems:**
```bash
bun scripts/migration-manager.js status $DATABASE_URL
```

**Performance Issues:**
```bash
ANALYZE=true bun build
bun scripts/performance-check.js
```

### Emergency Contacts
- **Production Issues**: alerts@studyteddy.com
- **Database Issues**: db-team@studyteddy.com
- **Performance Issues**: performance@studyteddy.com

## 🎯 Quick Commands

```bash
# Development
bun dev                    # Start development
bun build                  # Build application
bun test                   # Run tests

# Database
bun db:generate           # Generate migration
bun db:migrate            # Run migrations
bun db:studio             # Database admin

# Deployment
vercel                    # Deploy preview
vercel --prod             # Deploy production
bun scripts/ci-cd-pipeline.js # Full pipeline

# Monitoring
bun scripts/performance-check.js  # Performance check
bun scripts/backup-restore.js backup-all  # Create backup
```

## 📈 Performance Monitoring

### Real-time Dashboards
- [Vercel Analytics](https://vercel.com/dashboard/analytics)
- [Sentry Performance](https://sentry.io/)
- [Neon Monitoring](https://console.neon.tech/)

### Key Metrics
- Response time percentiles
- Error rates and types
- Core Web Vitals scores
- Database performance
- User engagement metrics

---

**Need Help?** Check the [deployment guide](./docs/deployment-guide.md) or contact the team at devops@studyteddy.com

**Production URL**: https://studyteddy.vercel.app
**Staging URL**: https://studyteddy-staging.vercel.app