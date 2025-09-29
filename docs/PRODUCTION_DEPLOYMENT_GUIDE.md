# StudyTeddy Production Deployment Guide

This comprehensive guide covers all aspects of deploying StudyTeddy to production environments with confidence and reliability.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Strategies](#deployment-strategies)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Procedures](#emergency-procedures)

## Overview

StudyTeddy employs a robust CI/CD pipeline with multiple deployment strategies to ensure zero-downtime deployments, automatic rollbacks, and comprehensive monitoring.

### Architecture Components

- **Frontend**: Next.js application deployed to Vercel/Kubernetes
- **Backend**: Node.js API deployed to Kubernetes
- **Database**: PostgreSQL on AWS RDS
- **Cache**: Redis on ElastiCache
- **Infrastructure**: AWS EKS with Terraform
- **Monitoring**: Prometheus, Grafana, and AlertManager

## Prerequisites

### Required Tools

```bash
# Install required tools
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
curl -sSL https://raw.githubusercontent.com/terraform-docs/terraform-docs/main/scripts/install.sh | sh
```

### Environment Variables

Create a `.env.production` file with all required variables:

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.studyteddy.com
NEXTAUTH_URL=https://studyteddy.com

# Database
DATABASE_URL=postgresql://username:password@host:5432/studyteddy

# Cache
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret

# External Services
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=your-stripe-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Access Requirements

- AWS CLI configured with appropriate permissions
- kubectl configured for the target cluster
- Docker registry access (GitHub Container Registry)
- Vercel CLI access (for frontend deployments)

## Deployment Strategies

### 1. Blue-Green Deployment (Recommended for Production)

Blue-green deployment provides zero-downtime deployments with instant rollback capability.

```bash
# Deploy to production with blue-green strategy
./scripts/deployment/deploy-kubernetes.sh production blue-green v1.2.3
```

**Advantages:**
- Zero downtime
- Instant rollback
- Full environment testing before switch

**Process:**
1. Deploy new version to "green" environment
2. Run health checks and smoke tests
3. Switch traffic from "blue" to "green"
4. Monitor for issues
5. Decommission old "blue" environment

### 2. Rolling Deployment

Rolling deployment gradually replaces instances one by one.

```bash
# Deploy with rolling strategy
./scripts/deployment/deploy-kubernetes.sh production rolling v1.2.3
```

**Advantages:**
- Resource efficient
- Gradual rollout
- Automatic rollback on failure

### 3. Canary Deployment

Canary deployment gradually shifts traffic to the new version.

```bash
# Deploy canary with 10% traffic
./scripts/deployment/deploy-kubernetes.sh production canary v1.2.3
```

**Process:**
1. Deploy new version alongside current
2. Route 10% of traffic to new version
3. Monitor metrics and errors
4. Gradually increase traffic split
5. Complete rollout or rollback based on metrics

## Pre-Deployment Checklist

### Code Quality Gates

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed and approved
- [ ] Security scans passed
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Infrastructure Readiness

- [ ] Database migrations prepared and tested
- [ ] Infrastructure capacity verified
- [ ] SSL certificates valid and not expiring
- [ ] DNS configuration verified
- [ ] CDN cache invalidation plan ready

### Monitoring and Alerting

- [ ] Monitoring dashboards accessible
- [ ] Alert channels configured and tested
- [ ] On-call schedule confirmed
- [ ] Incident response team notified

### Backup and Recovery

- [ ] Database backup completed
- [ ] Configuration backup created
- [ ] Rollback plan documented and tested
- [ ] Recovery time objectives confirmed

## Deployment Process

### Automated Deployment (Recommended)

#### GitHub Actions Workflow

```yaml
# Trigger production deployment
name: Production Deployment
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      version:
        required: true
        description: 'Version to deploy'
```

#### Manual Trigger

```bash
# Create and push a release tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Or trigger via GitHub UI
# Go to Actions → Production Deployment → Run workflow
```

### Manual Deployment

#### Step 1: Prepare Environment

```bash
# Set environment variables
export ENVIRONMENT=production
export VERSION=v1.2.3
export STRATEGY=blue-green

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

#### Step 2: Run Pre-Deployment Checks

```bash
# Run comprehensive health check
./scripts/health-check.ts --env production --comprehensive

# Verify database connectivity
./scripts/database/verify-connection.sh production

# Check resource capacity
kubectl top nodes
kubectl top pods -A
```

#### Step 3: Create Backup

```bash
# Create database backup
./scripts/backup/create-backup.sh production

# Backup Kubernetes configurations
kubectl get all -n studyteddy-production -o yaml > backup-k8s-$(date +%Y%m%d-%H%M%S).yaml
```

#### Step 4: Execute Deployment

```bash
# Deploy backend to Kubernetes
./scripts/deployment/deploy-kubernetes.sh production blue-green $VERSION

# Deploy frontend to Vercel
./scripts/deployment/deploy-vercel.sh production standard $VERSION
```

#### Step 5: Run Database Migrations

```bash
# Run migrations (if any)
cd apps/backend
bun run db:migrate
bun run db:verify
```

### Platform-Specific Deployments

#### Kubernetes Deployment

```bash
# Full Kubernetes deployment with all components
./scripts/deployment/deploy-kubernetes.sh production blue-green v1.2.3

# Deploy specific components
kubectl apply -f k8s/production/backend-deployment.yaml
kubectl apply -f k8s/production/frontend-deployment.yaml
```

#### Docker Compose Deployment

```bash
# For smaller environments or staging
./scripts/deployment/deploy-docker.sh production blue-green v1.2.3
```

#### Vercel Deployment

```bash
# Frontend deployment to Vercel
./scripts/deployment/deploy-vercel.sh production aliased v1.2.3
```

## Post-Deployment Verification

### Automated Verification

The deployment process includes automated verification steps:

```bash
# Health checks run automatically
# - Application endpoints
# - Database connectivity
# - Cache functionality
# - External service integration
```

### Manual Verification

#### Application Health

```bash
# Check application status
curl -f https://api.studyteddy.com/health
curl -f https://studyteddy.com

# Verify specific endpoints
curl -f https://api.studyteddy.com/api/v1/auth/status
curl -f https://api.studyteddy.com/api/v1/users/profile
```

#### Database Verification

```bash
# Check database connectivity and performance
./scripts/database/health-check.sh production

# Verify recent migrations
./scripts/database/migration-status.sh production
```

#### Performance Verification

```bash
# Run performance tests
./scripts/testing/performance-test.sh production

# Check response times
kubectl run test-pod --rm -i --restart=Never --image=curlimages/curl -- \
  curl -w "@curl-format.txt" -o /dev/null -s https://api.studyteddy.com/health
```

#### Monitoring Verification

```bash
# Check monitoring stack
kubectl get pods -n monitoring
kubectl get servicemonitors -n monitoring

# Verify alerts are configured
kubectl get prometheusrules -n monitoring
```

### Smoke Tests

Run comprehensive smoke tests to verify core functionality:

```bash
# User registration and login
./scripts/testing/smoke-test-auth.sh

# Study session creation
./scripts/testing/smoke-test-study-sessions.sh

# Payment processing (if applicable)
./scripts/testing/smoke-test-payments.sh
```

## Rollback Procedures

### Automated Rollback

The deployment system includes automatic rollback triggers:

- Health check failures
- High error rates (>5%)
- Response time degradation (>2x baseline)
- Critical alert triggers

### Manual Rollback

#### Immediate Rollback (Emergency)

```bash
# Immediate rollback to previous version
./scripts/deployment/deploy-kubernetes.sh rollback previous

# Or rollback to specific version
./scripts/deployment/deploy-kubernetes.sh rollback v1.2.2
```

#### Blue-Green Rollback

```bash
# Switch traffic back to blue environment
kubectl patch service backend-production -n studyteddy-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'

kubectl patch service frontend-production -n studyteddy-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'
```

#### Database Rollback

```bash
# Rollback database migrations (if needed)
cd apps/backend
bun run db:rollback

# Restore from backup (if necessary)
./scripts/backup/restore-backup.sh production latest
```

### Rollback Verification

```bash
# Verify rollback completed successfully
./scripts/health-check.ts --env production --post-rollback

# Check application version
curl https://api.studyteddy.com/version
```

## Monitoring and Alerting

### Real-Time Monitoring

#### Grafana Dashboards

Access monitoring dashboards:

- **Application Overview**: https://grafana.studyteddy.com/d/studyteddy-overview
- **Performance Metrics**: https://grafana.studyteddy.com/d/studyteddy-performance
- **Business Metrics**: https://grafana.studyteddy.com/d/studyteddy-business

#### Key Metrics to Monitor

**Application Metrics:**
- Response time (95th percentile < 2s)
- Error rate (< 1%)
- Throughput (requests/second)
- Active users

**Infrastructure Metrics:**
- CPU usage (< 70%)
- Memory usage (< 85%)
- Disk usage (< 80%)
- Network latency

**Business Metrics:**
- User registrations
- Study session completion rate
- Payment success rate
- User engagement metrics

### Alert Configuration

Critical alerts that require immediate attention:

```yaml
# High-priority alerts
- ApplicationDown (Critical)
- HighErrorRate (Warning > 5%, Critical > 15%)
- SlowResponseTime (Warning > 2s, Critical > 5s)
- DatabaseConnectionsHigh (Warning > 80%, Critical > 95%)
- SSLCertificateExpiring (Warning < 30 days)
```

### Incident Response

#### Alert Escalation

1. **Level 1**: Slack notification to #alerts channel
2. **Level 2**: Email to on-call engineer
3. **Level 3**: SMS to incident response team
4. **Level 4**: Phone call to engineering manager

#### Response Times

- **Critical**: 15 minutes
- **High**: 1 hour
- **Medium**: 4 hours
- **Low**: Next business day

## Troubleshooting

### Common Issues

#### Deployment Failures

**Issue**: Pod fails to start
```bash
# Check pod status and logs
kubectl get pods -n studyteddy-production
kubectl describe pod <pod-name> -n studyteddy-production
kubectl logs <pod-name> -n studyteddy-production --previous
```

**Issue**: Database connection failures
```bash
# Check database connectivity
kubectl run db-test --rm -i --restart=Never --image=postgres:16 -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check network policies
kubectl get networkpolicies -n studyteddy-production
```

**Issue**: Service discovery problems
```bash
# Check service endpoints
kubectl get endpoints -n studyteddy-production
kubectl get services -n studyteddy-production

# Test internal connectivity
kubectl run test-pod --rm -i --restart=Never --image=curlimages/curl -- \
  curl -f http://backend-service.studyteddy-production.svc.cluster.local:3000/health
```

#### Performance Issues

**Issue**: High response times
```bash
# Check resource usage
kubectl top pods -n studyteddy-production
kubectl top nodes

# Check database performance
./scripts/database/performance-check.sh production

# Analyze slow queries
./scripts/database/slow-query-analysis.sh production
```

**Issue**: Memory leaks
```bash
# Monitor memory usage over time
kubectl top pods -n studyteddy-production --containers

# Check for memory leaks in application logs
kubectl logs -f deployment/backend-production -n studyteddy-production | grep -i "memory\|heap"
```

### Debugging Tools

#### Log Analysis

```bash
# Stream application logs
kubectl logs -f deployment/backend-production -n studyteddy-production

# Search for specific errors
kubectl logs deployment/backend-production -n studyteddy-production | grep -i error

# Check logs from previous deployment
kubectl logs deployment/backend-production -n studyteddy-production --previous
```

#### Performance Profiling

```bash
# CPU profiling
kubectl exec -it deployment/backend-production -n studyteddy-production -- \
  curl http://localhost:3000/debug/pprof/profile

# Memory profiling
kubectl exec -it deployment/backend-production -n studyteddy-production -- \
  curl http://localhost:3000/debug/pprof/heap
```

#### Network Debugging

```bash
# Test DNS resolution
kubectl run dns-test --rm -i --restart=Never --image=busybox -- \
  nslookup backend-service.studyteddy-production.svc.cluster.local

# Check network connectivity
kubectl run network-test --rm -i --restart=Never --image=nicolaka/netshoot -- \
  ping backend-service.studyteddy-production.svc.cluster.local
```

## Emergency Procedures

### Critical Incident Response

#### Immediate Actions (0-15 minutes)

1. **Assess Impact**
   ```bash
   # Check service status
   ./scripts/health-check.ts --env production --emergency

   # Check error rates
   curl -s "https://api.studyteddy.com/metrics" | grep error_rate
   ```

2. **Implement Emergency Fixes**
   ```bash
   # Scale up resources immediately
   kubectl scale deployment backend-production --replicas=10 -n studyteddy-production

   # Enable maintenance mode (if available)
   kubectl patch configmap app-config -n studyteddy-production \
     -p '{"data":{"maintenance_mode":"true"}}'
   ```

3. **Emergency Rollback**
   ```bash
   # Immediate rollback to last known good version
   ./scripts/deployment/deploy-kubernetes.sh rollback previous
   ```

#### Communication (15-30 minutes)

1. **Internal Communication**
   - Notify incident response team
   - Update status page
   - Brief engineering leadership

2. **External Communication**
   - Update public status page
   - Send user notifications (if required)
   - Prepare customer communication

#### Investigation and Resolution (30+ minutes)

1. **Root Cause Analysis**
   ```bash
   # Collect logs and metrics
   ./scripts/incident/collect-diagnostics.sh production

   # Analyze recent changes
   git log --oneline --since="2 hours ago"
   ```

2. **Permanent Fix**
   - Identify root cause
   - Implement proper fix
   - Test thoroughly
   - Deploy with increased monitoring

### Disaster Recovery

#### Database Recovery

```bash
# Restore from latest backup
./scripts/backup/restore-backup.sh production latest

# Point-in-time recovery (if needed)
./scripts/backup/point-in-time-recovery.sh production "2023-12-01 14:30:00"
```

#### Complete Environment Rebuild

```bash
# Rebuild entire infrastructure
cd infrastructure/terraform
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars

# Redeploy applications
./scripts/deployment/deploy-kubernetes.sh production blue-green latest
```

### Contact Information

#### Escalation Contacts

- **On-Call Engineer**: +1-555-0123
- **Engineering Manager**: manager@studyteddy.com
- **CTO**: cto@studyteddy.com
- **Infrastructure Team**: infra@studyteddy.com

#### External Vendors

- **AWS Support**: Case ID: [Create via console]
- **Vercel Support**: support@vercel.com
- **Database Vendor**: [Contact info]

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Security scans completed
- [ ] Performance benchmarks met
- [ ] Database migrations prepared
- [ ] Backup created
- [ ] Monitoring dashboards ready
- [ ] On-call engineer notified
- [ ] Rollback plan documented

### During Deployment

- [ ] Health checks passing
- [ ] Database migrations applied
- [ ] Services responding correctly
- [ ] Monitoring shows normal metrics
- [ ] No critical alerts triggered
- [ ] User-facing functionality verified

### Post-Deployment

- [ ] Smoke tests completed
- [ ] Performance metrics normal
- [ ] Error rates within acceptable limits
- [ ] User feedback monitored
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Incident response team informed

---

**Note**: This guide should be reviewed and updated regularly to reflect changes in the deployment process, infrastructure, and operational procedures. Last updated: $(date)