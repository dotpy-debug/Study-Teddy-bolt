# Docker Deployment Guide for Study Teddy

This guide provides comprehensive instructions for deploying the Study Teddy application using Docker in development, staging, and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configurations](#environment-configurations)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Security Considerations](#security-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Docker**: Version 20.10+ with Docker Compose v2
- **System Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Disk Space**: Minimum 20GB available storage
- **Operating System**: Linux (Ubuntu 20.04+), macOS 10.15+, or Windows 10+ with WSL2

### External Services (Production)

- **Domain**: Registered domain with DNS control
- **SSL Certificate**: Valid SSL/TLS certificate
- **Email Service**: SendGrid, AWS SES, or similar
- **File Storage**: AWS S3 or compatible object storage
- **Monitoring**: Sentry account for error tracking

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd study-teddy

# Copy environment file
cp .env.docker .env

# Create necessary directories
mkdir -p data/{postgres,redis,uploads,logs,prometheus,grafana}
mkdir -p backups/{postgres,redis}
mkdir -p nginx/ssl
```

### 2. Configure Environment

Edit `.env` file with your specific values:

```bash
# Required changes for production
DB_PASSWORD=your-secure-database-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-super-secure-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
OPENAI_API_KEY=your-openai-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. SSL Certificates

For production, place your SSL certificates:

```bash
# Copy your SSL certificates
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

## Environment Configurations

### Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access services
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Adminer: http://localhost:8080
# MailHog: http://localhost:8025
# Bull Dashboard: http://localhost:3333
```

### Production Environment

```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

## Development Setup

### Features Included

- **Hot Reload**: Both frontend and backend support hot reload
- **Debug Ports**: Backend debugging on port 9229
- **Development Tools**:
  - Adminer for database management
  - MailHog for email testing
  - Redis Commander for Redis management
  - Bull Dashboard for queue monitoring

### Environment Variables

Development-specific environment variables:

```env
NODE_ENV=development
NEXT_PUBLIC_DEMO_MODE=true
LOG_LEVEL=debug
EMAIL_HOST=mailhog
EMAIL_PORT=1025
```

### Database Management

```bash
# Run database migrations
docker-compose -f docker-compose.dev.yml exec backend bun run db:migrate

# Generate new migration
docker-compose -f docker-compose.dev.yml exec backend bun run db:generate

# Access database
docker-compose -f docker-compose.dev.yml exec postgres psql -U studyteddy -d studyteddy_dev
```

## Production Deployment

### Security Setup

1. **Change Default Passwords**:
   ```env
   DB_PASSWORD=secure-production-password
   REDIS_PASSWORD=secure-redis-password
   GF_PASSWORD=secure-grafana-password
   ```

2. **Configure SSL/TLS**:
   - Obtain valid SSL certificates
   - Update nginx configuration
   - Enable HSTS headers

3. **Set Secure Secrets**:
   ```env
   JWT_SECRET=very-long-secure-jwt-secret-minimum-256-bits
   NEXTAUTH_SECRET=very-long-secure-nextauth-secret
   ```

### Production Deployment Steps

1. **Prepare Server**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Add user to docker group
   sudo usermod -aG docker $USER
   ```

2. **Deploy Application**:
   ```bash
   # Clone repository
   git clone <repository-url>
   cd study-teddy

   # Configure environment
   cp .env.docker .env
   # Edit .env with production values

   # Create data directories
   sudo mkdir -p /opt/studyteddy/data/{postgres,redis,uploads,logs,prometheus,grafana}
   sudo mkdir -p /opt/studyteddy/backups/{postgres,redis}

   # Set environment variable for data path
   echo "DATA_PATH=/opt/studyteddy/data" >> .env

   # Deploy
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify Deployment**:
   ```bash
   # Check all services are running
   docker-compose -f docker-compose.prod.yml ps

   # Check logs
   docker-compose -f docker-compose.prod.yml logs -f nginx

   # Test application
   curl -I http://localhost
   ```

### Scaling Services

For high-traffic production environments:

```yaml
# docker-compose.prod.yml scaling example
services:
  backend:
    deploy:
      replicas: 3

  frontend:
    deploy:
      replicas: 2
```

## Security Considerations

### Network Security

- Services use internal Docker networks
- Only necessary ports are exposed
- Nginx reverse proxy handles external traffic

### Container Security

- Non-root users in containers
- Read-only filesystems where possible
- Security options enabled (`no-new-privileges`)
- Resource limits configured

### Data Security

- Encrypted communication (HTTPS/TLS)
- Secure password policies
- Regular security updates
- Environment variables for secrets

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Monitoring and Maintenance

### Health Monitoring

All services include health checks:
- **Backend**: `/health` endpoint
- **Frontend**: Root endpoint
- **Database**: `pg_isready` check
- **Redis**: `ping` command
- **Nginx**: Configuration test

### Backup Strategy

Automated daily backups are configured:

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh
docker-compose -f docker-compose.prod.yml exec redis-backup /usr/local/bin/backup.sh

# Restore from backup
gunzip -c backup-file.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U studyteddy -d studyteddy
```

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# Rotate logs (configure logrotate)
sudo logrotate -f /etc/logrotate.d/docker
```

### Performance Monitoring

Access monitoring tools:
- **Grafana**: Port 3000 (behind nginx)
- **Prometheus**: Port 9090 (internal)
- **Application Metrics**: Built into backend

### Updates and Maintenance

```bash
# Update application
git pull origin main
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Update system dependencies
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up unused resources
docker system prune -f
docker volume prune -f
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Check port usage
   netstat -tulpn | grep :80

   # Change ports in .env file
   HTTP_PORT=8080
   HTTPS_PORT=8443
   ```

2. **Permission Issues**:
   ```bash
   # Fix data directory permissions
   sudo chown -R 1001:1001 data/
   sudo chmod -R 755 data/
   ```

3. **Memory Issues**:
   ```bash
   # Check memory usage
   docker stats

   # Adjust memory limits in docker-compose files
   deploy:
     resources:
       limits:
         memory: 1G
   ```

4. **SSL Certificate Issues**:
   ```bash
   # Test SSL configuration
   docker-compose -f docker-compose.prod.yml exec nginx nginx -t

   # Check certificate validity
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   ```

### Debugging

1. **Service Logs**:
   ```bash
   # All services
   docker-compose -f docker-compose.prod.yml logs

   # Specific service
   docker-compose -f docker-compose.prod.yml logs backend

   # Follow logs in real-time
   docker-compose -f docker-compose.prod.yml logs -f --tail=100
   ```

2. **Container Access**:
   ```bash
   # Access backend container
   docker-compose -f docker-compose.prod.yml exec backend sh

   # Access database
   docker-compose -f docker-compose.prod.yml exec postgres psql -U studyteddy -d studyteddy
   ```

3. **Network Debugging**:
   ```bash
   # Test internal connectivity
   docker-compose -f docker-compose.prod.yml exec backend ping postgres
   docker-compose -f docker-compose.prod.yml exec frontend curl http://backend:3001/health
   ```

### Emergency Procedures

1. **Service Recovery**:
   ```bash
   # Restart single service
   docker-compose -f docker-compose.prod.yml restart backend

   # Rebuild and restart
   docker-compose -f docker-compose.prod.yml up -d --force-recreate backend
   ```

2. **Database Recovery**:
   ```bash
   # Restore from backup
   gunzip -c /path/to/backup.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U studyteddy -d studyteddy
   ```

3. **Full System Recovery**:
   ```bash
   # Stop all services
   docker-compose -f docker-compose.prod.yml down

   # Clean and restart
   docker system prune -f
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Support

For additional support:
- Check application logs first
- Review this documentation
- Check Docker and system logs
- Contact the development team with specific error messages and logs

---

**Note**: This configuration is production-ready but should be customized based on your specific infrastructure requirements and security policies.