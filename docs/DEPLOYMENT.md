# Study Teddy Deployment Guide

This comprehensive guide covers deploying the Study Teddy application in production environments using Docker containers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Methods](#deployment-methods)
5. [Security Considerations](#security-considerations)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Troubleshooting](#troubleshooting)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Scaling and Performance](#scaling-and-performance)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **Docker**: Version 24.0.0 or higher
- **Docker Compose**: Version 2.0.0 or higher
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 20GB free space
- **Network**: Ports 80, 443, 3000, 3001, 5432, 6379 available

### Required Services

- **PostgreSQL**: Database server (or managed database service)
- **Redis**: Caching and session storage (or managed Redis service)
- **SSL Certificates**: For HTTPS in production
- **Domain Name**: For production deployment

### External Service Accounts

- **Google OAuth**: Google Cloud Console project with OAuth 2.0 credentials
- **OpenAI**: API key for AI features
- **SMTP Service**: Email service provider (Gmail, SendGrid, etc.)

## Quick Start

### Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd study-teddy

# Copy environment templates
cp .env.production.template .env
cp studyteddy-backend/.env.production.template studyteddy-backend/.env
cp studyteddy-frontend/.env.production.template studyteddy-frontend/.env.local

# Configure environment variables (see Environment Configuration section)
# Edit .env, studyteddy-backend/.env, and studyteddy-frontend/.env.local

# Build and start development environment
./scripts/build.sh development
./scripts/deploy.sh development
```

### Production Environment

```bash
# Configure production environment variables
cp .env.production.template .env
# Edit .env with production values

# Generate SSL certificates (or copy your own)
mkdir -p nginx/ssl
# Add your SSL certificates as nginx/ssl/cert.pem and nginx/ssl/key.pem

# Build and deploy production
./scripts/build.sh production
./scripts/deploy.sh production
```

## Environment Configuration

### Core Environment Variables

#### Root .env File

```bash
# Database Configuration
POSTGRES_DB=studyteddy
POSTGRES_USER=studyteddy_user
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
POSTGRES_PORT=5432

# Redis Configuration
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_PORT=6379

# Application URLs
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com

# Security Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=CHANGE_THIS_JWT_SECRET
JWT_REFRESH_SECRET=CHANGE_THIS_REFRESH_SECRET
NEXTAUTH_SECRET=CHANGE_THIS_NEXTAUTH_SECRET

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

### Generating Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for JWT_REFRESH_SECRET
openssl rand -base64 32  # Use for NEXTAUTH_SECRET

# Generate database password
openssl rand -base64 24  # Use for POSTGRES_PASSWORD

# Generate Redis password
openssl rand -base64 24  # Use for REDIS_PASSWORD
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback/google` (frontend)
   - `https://api.yourdomain.com/auth/google/callback` (backend)
6. Copy Client ID and Client Secret to environment variables

### OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and verify email
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to `OPENAI_API_KEY` environment variable

## Deployment Methods

### Docker Compose Deployment (Recommended)

#### Production Deployment

```bash
# 1. Configure environment
cp .env.production.template .env
# Edit .env with your production values

# 2. Setup SSL certificates
mkdir -p nginx/ssl
# Copy your SSL certificates:
# - nginx/ssl/cert.pem (certificate)
# - nginx/ssl/key.pem (private key)

# 3. Build and deploy
./scripts/build.sh production
./scripts/deploy.sh production

# 4. Verify deployment
curl -f https://yourdomain.com/health
curl -f https://api.yourdomain.com/health
```

#### Development Deployment

```bash
# 1. Configure development environment
cp .env.production.template .env
# Edit .env with development values

# 2. Build and deploy
./scripts/build.sh development
./scripts/deploy.sh development

# 3. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### Manual Docker Deployment

```bash
# Build images
docker build -t studyteddy-backend ./studyteddy-backend
docker build -t studyteddy-frontend ./studyteddy-frontend

# Run PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=studyteddy \
  -e POSTGRES_USER=studyteddy_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16-alpine

# Run Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --requirepass your_redis_password

# Run Backend
docker run -d --name backend \
  --link postgres:postgres \
  --link redis:redis \
  -e DATABASE_URL=postgresql://studyteddy_user:your_password@postgres:5432/studyteddy \
  -e REDIS_URL=redis://default:your_redis_password@redis:6379 \
  -p 3001:3001 \
  studyteddy-backend

# Run Frontend
docker run -d --name frontend \
  --link backend:backend \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -p 3000:3000 \
  studyteddy-frontend
```

### Kubernetes Deployment

See [k8s/README.md](k8s/README.md) for Kubernetes deployment manifests and instructions.

## Security Considerations

### SSL/TLS Configuration

#### Production SSL Setup

```bash
# Option 1: Use Let's Encrypt (recommended)
# Install certbot
sudo apt update && sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

#### Self-Signed Certificates (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Security Headers

The application includes security headers:

- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing protection
- **X-XSS-Protection**: XSS filtering

### Database Security

```bash
# Create dedicated database user
psql -U postgres
CREATE USER studyteddy_user WITH PASSWORD 'strong_password';
CREATE DATABASE studyteddy OWNER studyteddy_user;
GRANT ALL PRIVILEGES ON DATABASE studyteddy TO studyteddy_user;
```

### Environment Security

```bash
# Set proper file permissions
chmod 600 .env
chmod 600 studyteddy-backend/.env
chmod 600 studyteddy-frontend/.env.local

# Never commit .env files to version control
echo ".env" >> .gitignore
echo "studyteddy-backend/.env" >> .gitignore
echo "studyteddy-frontend/.env.local" >> .gitignore
```

## Monitoring and Logging

### Application Logs

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Health Monitoring

```bash
# Check application health
curl -f https://yourdomain.com/health
curl -f https://api.yourdomain.com/health

# Check database health
curl -f https://api.yourdomain.com/health/database
```

### Performance Monitoring

#### Enable Application Metrics

Add to your `.env` file:

```bash
# Enable metrics collection
ENABLE_METRICS=true
METRICS_PORT=9090

# Optional: Sentry for error tracking
SENTRY_DSN=your_sentry_dsn
```

#### Prometheus Integration

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Log Aggregation

#### ELK Stack Setup

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
./scripts/migrate.sh backup

# Automated daily backups
echo "0 2 * * * /path/to/study-teddy/scripts/migrate.sh backup" | crontab -

# Restore from backup
./scripts/migrate.sh restore development backup_20231215_120000.sql
```

### Full System Backup

```bash
#!/bin/bash
# backup-system.sh

BACKUP_DIR="/backup/studyteddy/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U studyteddy_user studyteddy > $BACKUP_DIR/database.sql

# Backup volumes
docker run --rm \
  -v studyteddy_postgres_prod_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/postgres_data.tar.gz -C /data .

# Backup configuration
cp -r . $BACKUP_DIR/config/
rm -rf $BACKUP_DIR/config/node_modules
rm -rf $BACKUP_DIR/config/.git

echo "Backup completed: $BACKUP_DIR"
```

### Disaster Recovery

```bash
#!/bin/bash
# restore-system.sh

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: $0 <backup_directory>"
  exit 1
fi

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U studyteddy_user -d studyteddy < $BACKUP_DIR/database.sql

# Restore configuration
cp -r $BACKUP_DIR/config/* .

# Start services
docker-compose -f docker-compose.prod.yml up -d

echo "System restored from: $BACKUP_DIR"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database status
docker-compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U studyteddy_user -d studyteddy -c "SELECT 1;"
```

#### 2. Redis Connection Failed

```bash
# Check Redis status
docker-compose -f docker-compose.prod.yml ps redis

# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli -a your_redis_password ping
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Verify certificate chain
curl -vI https://yourdomain.com

# Test SSL configuration
docker-compose -f docker-compose.prod.yml exec nginx \
  nginx -t
```

#### 4. Memory Issues

```bash
# Check memory usage
docker stats

# Increase container memory limits in docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### 5. Port Conflicts

```bash
# Check port usage
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001

# Use different ports in .env
FRONTEND_PORT=3010
BACKEND_PORT=3011
```

### Debugging Steps

#### Backend Debugging

```bash
# Enable debug logging
echo "LOG_LEVEL=debug" >> studyteddy-backend/.env

# Access backend container
docker-compose -f docker-compose.prod.yml exec backend /bin/sh

# Check backend health endpoint
curl -v http://localhost:3001/health
```

#### Frontend Debugging

```bash
# Check frontend build logs
docker-compose -f docker-compose.prod.yml logs frontend

# Access frontend container
docker-compose -f docker-compose.prod.yml exec frontend /bin/sh

# Check frontend health endpoint
curl -v http://localhost:3000/api/health
```

#### Network Debugging

```bash
# Check container network
docker network ls
docker network inspect study-teddy_studyteddy-network

# Test service connectivity
docker-compose -f docker-compose.prod.yml exec frontend \
  curl -v http://backend:3001/health
```

### Log Analysis

```bash
# Search for errors in logs
docker-compose -f docker-compose.prod.yml logs | grep -i error

# Monitor logs in real-time
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Export logs for analysis
docker-compose -f docker-compose.prod.yml logs > application.log
```

## CI/CD Pipeline

### GitHub Actions Setup

The repository includes GitHub Actions workflows for:

- **Continuous Integration**: Testing, linting, security scanning
- **Continuous Deployment**: Building and deploying to staging/production

#### Required Secrets

Add these secrets to your GitHub repository:

```bash
# Application secrets
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret

# OAuth credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# API keys
OPENAI_API_KEY=your_openai_api_key

# Deployment URLs
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Optional: Slack notifications
SLACK_WEBHOOK_URL=your_slack_webhook

# Optional: Security scanning
SNYK_TOKEN=your_snyk_token
```

#### Manual Deployment Trigger

```bash
# Trigger deployment via GitHub CLI
gh workflow run ci-cd.yml --ref main
```

### Automated Testing

```bash
# Run tests locally before deployment
cd studyteddy-backend && npm test
cd studyteddy-frontend && npm test

# Run integration tests
./scripts/test-integration.sh
```

## Scaling and Performance

### Horizontal Scaling

#### Load Balancer Configuration

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  backend:
    scale: 3
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  frontend:
    scale: 2
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

#### Database Scaling

```bash
# Read replicas for PostgreSQL
# Add to docker-compose.prod.yml
postgres-replica:
  image: postgres:16-alpine
  environment:
    POSTGRES_MASTER_SERVICE: postgres
    POSTGRES_REPLICA_USER: replica_user
    POSTGRES_REPLICA_PASSWORD: replica_password
```

### Performance Optimization

#### Database Optimization

```sql
-- PostgreSQL performance tuning
-- Add to postgresql.conf

shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection pooling
max_connections = 100
```

#### Redis Optimization

```bash
# Redis performance tuning
# Add to redis.conf

maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

#### CDN Integration

```bash
# Environment variables for CDN
NEXT_PUBLIC_CDN_URL=https://cdn.yourdomain.com
STATIC_FILES_CDN=https://static.yourdomain.com
```

### Monitoring Performance

```bash
# Container resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Application performance metrics
curl -s https://api.yourdomain.com/metrics | grep response_time

# Database performance
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U studyteddy_user -d studyteddy -c "
    SELECT query, mean_time, calls
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;"
```

---

## Support and Maintenance

### Regular Maintenance Tasks

```bash
# Weekly tasks
docker system prune -f  # Clean up unused containers/images
./scripts/migrate.sh backup  # Database backup
docker-compose -f docker-compose.prod.yml pull  # Update images

# Monthly tasks
# Review security updates
# Update SSL certificates if needed
# Analyze performance metrics
# Review and rotate secrets
```

### Getting Help

- **Documentation**: Check this deployment guide and API documentation
- **Logs**: Always check application logs first
- **Health Checks**: Verify all health endpoints are responding
- **Community**: Check project issues and discussions

### Emergency Contacts

- **Database Issues**: Contact database administrator
- **Network Issues**: Contact infrastructure team
- **Application Issues**: Contact development team

---

*Last updated: 2024-12-15*