# Study Teddy - Dokploy Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Application Configuration](#application-configuration)
- [Database Setup](#database-setup)
- [Redis Cache Setup](#redis-cache-setup)
- [Application Deployment](#application-deployment)
- [Domain & SSL Configuration](#domain--ssl-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)

## Prerequisites

1. **Dokploy Installation**: Ensure Dokploy is installed on your server
2. **Domain Name**: Configure your domain DNS to point to your Dokploy server
3. **Server Requirements**:
   - Minimum 4GB RAM
   - 20GB storage
   - Ubuntu 20.04 or later
4. **Git Repository**: Fork/clone the repository to your GitHub account

## Environment Variables

Create the following environment variables in Dokploy's environment settings:

### Database Configuration
```env
# PostgreSQL with pgvector
DB_HOST=postgres
DB_PORT=5432
DB_USER=studyteddy
DB_PASSWORD=<generate-strong-password>
DB_NAME=studyteddy_prod
DATABASE_URL=postgresql://studyteddy:<password>@postgres:5432/studyteddy_prod?schema=public&sslmode=prefer
```

### Redis Configuration
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<generate-strong-password>
REDIS_URL=redis://default:<password>@redis:6379
```

### Authentication & Security
```env
# JWT Secrets (generate using: openssl rand -base64 32)
JWT_SECRET=<generate-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<generate-secret>
JWT_REFRESH_EXPIRES_IN=30d

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secret>
```

### Google OAuth
```env
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/callback/google
```

### OpenAI Configuration
```env
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
```

### Email Configuration (Optional)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=<your-email>
EMAIL_PASSWORD=<app-password>
EMAIL_FROM=noreply@studyteddy.com
```

### AWS S3 Storage (Optional)
```env
AWS_S3_BUCKET=studyteddy-uploads
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
```

### Application URLs
```env
# Backend
BACKEND_PORT=3001
BACKEND_URL=https://api.your-domain.com

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
```

### Rate Limiting
```env
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
AI_RATE_LIMIT_TTL=60000
AI_RATE_LIMIT_MAX=10
```

### Monitoring (Optional)
```env
SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
NEW_RELIC_LICENSE_KEY=<your-new-relic-key>
NEXT_PUBLIC_GA_TRACKING_ID=<google-analytics-id>
NEXT_PUBLIC_MIXPANEL_TOKEN=<mixpanel-token>
```

## Application Configuration

### 1. Create PostgreSQL Database

In Dokploy, create a new PostgreSQL service:

```yaml
name: studyteddy-postgres
image: pgvector/pgvector:pg16
port: 5432
environment:
  POSTGRES_USER: studyteddy
  POSTGRES_PASSWORD: ${DB_PASSWORD}
  POSTGRES_DB: studyteddy_prod
  POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
volumes:
  - postgres_data:/var/lib/postgresql/data
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U studyteddy -d studyteddy_prod"]
  interval: 30s
  timeout: 10s
  retries: 5
```

### 2. Create Redis Cache

Create a Redis service:

```yaml
name: studyteddy-redis
image: redis:7-alpine
port: 6379
command: >
  redis-server
  --appendonly yes
  --requirepass ${REDIS_PASSWORD}
  --maxmemory 1gb
  --maxmemory-policy allkeys-lru
volumes:
  - redis_data:/data
healthcheck:
  test: ["CMD", "redis-cli", "--auth", "${REDIS_PASSWORD}", "ping"]
  interval: 30s
  timeout: 10s
  retries: 5
```

### 3. Deploy Backend Application

Create a new application in Dokploy:

```yaml
name: studyteddy-backend
source:
  type: git
  repository: https://github.com/your-username/studyteddy.git
  branch: main
build:
  dockerfile: apps/backend/Dockerfile
  context: .
  target: production
port: 3001
environment:
  NODE_ENV: production
  # Add all backend environment variables here
healthcheck:
  path: /health
  interval: 30s
  timeout: 15s
  retries: 3
resources:
  limits:
    memory: 2G
    cpu: 2.0
  requests:
    memory: 1G
    cpu: 1.0
```

### 4. Deploy Frontend Application

Create another application:

```yaml
name: studyteddy-frontend
source:
  type: git
  repository: https://github.com/your-username/studyteddy.git
  branch: main
build:
  dockerfile: apps/frontend/Dockerfile
  context: .
  target: production
  buildArgs:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
port: 3000
environment:
  NODE_ENV: production
  # Add all frontend environment variables here
healthcheck:
  path: /api/health
  interval: 30s
  timeout: 15s
  retries: 3
resources:
  limits:
    memory: 1.5G
    cpu: 1.5
  requests:
    memory: 512M
    cpu: 0.5
```

## Database Setup

After deploying PostgreSQL, run these migrations:

1. Connect to your Dokploy server via SSH
2. Access the PostgreSQL container:
```bash
docker exec -it studyteddy-postgres psql -U studyteddy -d studyteddy_prod
```

3. Enable pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

4. Run database migrations from backend container:
```bash
docker exec -it studyteddy-backend bun run db:migrate
```

## Domain & SSL Configuration

### 1. Configure Domain in Dokploy

For the frontend application:
- Domain: `your-domain.com`
- Enable SSL: Yes (Let's Encrypt)
- Force HTTPS: Yes

For the backend application:
- Domain: `api.your-domain.com`
- Enable SSL: Yes (Let's Encrypt)
- Force HTTPS: Yes

### 2. Configure CORS

Ensure your backend CORS settings allow your frontend domain:

```env
CORS_ORIGIN=https://your-domain.com
ALLOWED_HOSTS=your-domain.com,api.your-domain.com
```

## Monitoring Setup

### 1. Deploy Prometheus (Optional)

```yaml
name: studyteddy-prometheus
image: prom/prometheus:latest
port: 9090
volumes:
  - ./monitoring/prometheus:/etc/prometheus
  - prometheus_data:/prometheus
command:
  - '--config.file=/etc/prometheus/prometheus.yml'
  - '--storage.tsdb.retention.time=30d'
```

### 2. Deploy Grafana (Optional)

```yaml
name: studyteddy-grafana
image: grafana/grafana:latest
port: 3000
environment:
  GF_SECURITY_ADMIN_USER: admin
  GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
volumes:
  - grafana_data:/var/lib/grafana
  - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
```

## Backup Strategy

### 1. Database Backup Script

Create a backup job in Dokploy:

```yaml
name: postgres-backup
schedule: "0 2 * * *"  # Daily at 2 AM
image: postgres:16-alpine
command: |
  pg_dump -h studyteddy-postgres -U studyteddy -d studyteddy_prod |
  gzip > /backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz
environment:
  PGPASSWORD: ${DB_PASSWORD}
volumes:
  - ./backups:/backups
```

### 2. Redis Backup

```yaml
name: redis-backup
schedule: "0 3 * * *"  # Daily at 3 AM
image: redis:7-alpine
command: |
  redis-cli -h studyteddy-redis -a ${REDIS_PASSWORD} --rdb /backups/redis-$(date +%Y%m%d).rdb
volumes:
  - ./backups:/backups
```

## Deployment Commands

### Initial Deployment

1. Push your code to GitHub
2. In Dokploy, create applications following the configuration above
3. Set all environment variables
4. Deploy in this order:
   - PostgreSQL
   - Redis
   - Backend
   - Frontend

### Update Deployment

```bash
# From your local machine
git push origin main

# In Dokploy
# Trigger rebuild for backend and frontend applications
```

### Database Migrations

```bash
# SSH into your server
ssh your-server

# Run migrations
docker exec -it studyteddy-backend bun run db:migrate
```

## Health Checks

Monitor your application health:

- Backend Health: `https://api.your-domain.com/health`
- Frontend Health: `https://your-domain.com/api/health`
- Database: Check PostgreSQL logs in Dokploy
- Redis: Check Redis logs in Dokploy

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check network connectivity between services

2. **Redis Connection Issues**
   - Verify REDIS_PASSWORD is set correctly
   - Check Redis logs for authentication errors

3. **Build Failures**
   - Check build logs in Dokploy
   - Verify all environment variables are set
   - Ensure sufficient server resources

4. **OAuth Not Working**
   - Verify Google OAuth credentials
   - Check redirect URLs match your domain
   - Ensure NEXTAUTH_URL is correct

### Logs Access

```bash
# View backend logs
docker logs -f studyteddy-backend --tail 100

# View frontend logs
docker logs -f studyteddy-frontend --tail 100

# View database logs
docker logs -f studyteddy-postgres --tail 50

# View Redis logs
docker logs -f studyteddy-redis --tail 50
```

## Performance Optimization

1. **Enable CDN** for static assets
2. **Configure caching** headers in Nginx
3. **Set up rate limiting** to prevent abuse
4. **Enable compression** for API responses
5. **Use connection pooling** for database

## Security Checklist

- [ ] All secrets are generated securely
- [ ] HTTPS is enforced on all domains
- [ ] Database backups are encrypted
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Regular security updates are applied

## Support

For deployment issues:
1. Check Dokploy logs
2. Review application logs
3. Verify environment variables
4. Check network connectivity
5. Review this guide for configuration

## Scaling

When you need to scale:

1. **Horizontal Scaling**: Deploy multiple backend instances with load balancer
2. **Database Scaling**: Consider read replicas for PostgreSQL
3. **Cache Scaling**: Implement Redis clustering
4. **CDN**: Use Cloudflare or similar for global distribution

---

**Note**: Replace all placeholder values (marked with `<>`) with your actual configuration values before deployment.