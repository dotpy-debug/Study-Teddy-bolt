# StudyTeddy Incident Response Runbook

This runbook provides step-by-step procedures for responding to production incidents in the StudyTeddy platform.

## Incident Severity Levels

### Critical (P0)
- Complete service outage
- Data loss or corruption
- Security breach
- Payment processing failure

**Response Time**: 15 minutes
**Resolution Time**: 4 hours

### High (P1)
- Significant feature degradation
- High error rates (>5%)
- Performance degradation (>3x normal)
- Database connection issues

**Response Time**: 1 hour
**Resolution Time**: 24 hours

### Medium (P2)
- Minor feature issues
- Moderate performance degradation
- Non-critical service failures

**Response Time**: 4 hours
**Resolution Time**: 72 hours

### Low (P3)
- Cosmetic issues
- Documentation problems
- Minor feature requests

**Response Time**: Next business day
**Resolution Time**: 2 weeks

## Incident Response Team

### Primary Contacts
- **Incident Commander**: eng-manager@studyteddy.com
- **On-Call Engineer**: oncall@studyteddy.com
- **Database Engineer**: dba@studyteddy.com
- **Security Engineer**: security@studyteddy.com
- **DevOps Engineer**: devops@studyteddy.com

### Communication Channels
- **Slack**: #incident-response
- **Emergency Hotline**: +1-555-EMERGENCY
- **Status Page**: https://status.studyteddy.com

## Incident Response Process

### 1. Detection and Alert

#### Monitoring Systems
- Prometheus alerts
- Grafana dashboards
- Sentry error tracking
- User reports
- External monitoring services

#### Initial Response (0-5 minutes)
1. **Acknowledge the alert** in monitoring system
2. **Join incident response channel** (#incident-response)
3. **Assess initial impact** using monitoring dashboards
4. **Determine severity level** based on impact
5. **Page appropriate team members** if P0/P1

### 2. Initial Assessment (5-15 minutes)

#### Health Check Commands
```bash
# Quick system health check
./scripts/health-check.ts --env production --emergency

# Check critical services
kubectl get pods -n studyteddy-production
kubectl get services -n studyteddy-production

# Database connectivity
curl -f https://api.studyteddy.com/health/db

# Cache connectivity
curl -f https://api.studyteddy.com/health/cache

# API responsiveness
curl -w "@curl-format.txt" -o /dev/null -s https://api.studyteddy.com/health
```

#### Key Metrics to Check
- **Error Rate**: Should be < 1%
- **Response Time**: 95th percentile < 2s
- **Availability**: > 99.9%
- **Database Connections**: < 80% of max
- **CPU/Memory Usage**: < 80%

### 3. Impact Assessment (15-30 minutes)

#### User Impact Analysis
```bash
# Check active user count
curl -s https://api.studyteddy.com/metrics | grep active_users

# Check recent error logs
kubectl logs deployment/backend-production -n studyteddy-production --since=30m | grep ERROR

# Check affected endpoints
./scripts/monitoring/endpoint-health.sh
```

#### Business Impact
- Number of affected users
- Critical business functions impacted
- Revenue impact (if applicable)
- Customer complaints/support tickets

### 4. Communication (0-30 minutes)

#### Internal Communication Template
```
🚨 INCIDENT ALERT - P[SEVERITY]

**Summary**: [Brief description of the issue]
**Impact**: [Number of users affected, services down]
**ETA for Resolution**: [Best estimate]
**Incident Commander**: [Name]
**Next Update**: [Time]

**Current Status**: [What's being done]
**Monitoring**: [Link to relevant dashboards]
```

#### External Communication (P0/P1 only)
```bash
# Update status page
curl -X POST "https://api.statuspage.io/v1/pages/PAGE_ID/incidents" \
  -H "Authorization: OAuth TOKEN" \
  -d '{
    "incident": {
      "name": "Service Degradation",
      "status": "investigating",
      "impact_override": "major",
      "body": "We are currently investigating reports of service issues."
    }
  }'
```

### 5. Immediate Mitigation (0-60 minutes)

#### Common Mitigation Actions

##### Service Scaling
```bash
# Scale up backend pods
kubectl scale deployment backend-production --replicas=10 -n studyteddy-production

# Scale up database connections
# (Update connection pool configuration)
```

##### Traffic Management
```bash
# Enable rate limiting
kubectl patch configmap nginx-config -n studyteddy-production \
  -p '{"data":{"rate-limit":"true"}}'

# Route traffic to healthy instances only
kubectl patch service backend-production -n studyteddy-production \
  -p '{"spec":{"selector":{"health":"ready"}}}'
```

##### Emergency Rollback
```bash
# Rollback to previous version
./scripts/deployment/deploy-kubernetes.sh rollback previous

# Verify rollback success
./scripts/health-check.ts --env production --post-rollback
```

##### Database Issues
```bash
# Check database performance
./scripts/database/performance-check.sh production

# Kill long-running queries
./scripts/database/kill-long-queries.sh production

# Restart database connections
kubectl rollout restart deployment backend-production -n studyteddy-production
```

##### Cache Issues
```bash
# Clear Redis cache
kubectl exec deployment/redis-production -n studyteddy-production -- redis-cli FLUSHALL

# Restart cache connections
kubectl rollout restart deployment backend-production -n studyteddy-production
```

### 6. Investigation and Root Cause Analysis

#### Log Analysis
```bash
# Collect comprehensive logs
./scripts/incident/collect-logs.sh production $(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')

# Analyze error patterns
kubectl logs deployment/backend-production -n studyteddy-production --since=1h | \
  grep ERROR | sort | uniq -c | sort -nr

# Check for correlation with deployments
git log --oneline --since="2 hours ago"
```

#### Performance Analysis
```bash
# Check resource usage trends
kubectl top pods -n studyteddy-production --sort-by=cpu
kubectl top pods -n studyteddy-production --sort-by=memory

# Database performance analysis
./scripts/database/slow-query-analysis.sh production

# Network analysis
./scripts/network/latency-check.sh production
```

#### Security Analysis (if applicable)
```bash
# Check for suspicious activity
./scripts/security/audit-logs.sh production

# Verify SSL certificates
./scripts/security/cert-check.sh production

# Check for unauthorized access
./scripts/security/access-analysis.sh production
```

### 7. Resolution Implementation

#### Code Fixes
1. **Identify the root cause**
2. **Develop and test fix** in staging environment
3. **Create hotfix branch** if necessary
4. **Deploy fix** using appropriate strategy
5. **Verify resolution** with comprehensive testing

#### Infrastructure Fixes
```bash
# Update resource limits
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# Update configuration
kubectl patch configmap app-config -n studyteddy-production \
  -p '{"data":{"max_connections":"200"}}'

# Apply security patches
kubectl apply -f k8s/production/security-updates.yaml
```

#### Database Fixes
```bash
# Optimize queries
./scripts/database/optimize-queries.sh production

# Update indexes
./scripts/database/create-indexes.sh production

# Adjust configuration
./scripts/database/update-config.sh production
```

### 8. Verification and Testing

#### Health Verification
```bash
# Comprehensive health check
./scripts/health-check.ts --env production --comprehensive

# Load testing
./scripts/testing/load-test.sh production

# End-to-end testing
./scripts/testing/e2e-test.sh production
```

#### Monitoring Verification
```bash
# Check all metrics are green
./scripts/monitoring/verify-metrics.sh production

# Verify alerts are resolved
./scripts/monitoring/check-alerts.sh production
```

### 9. Post-Incident Activities

#### Immediate (0-2 hours after resolution)
1. **Update stakeholders** about resolution
2. **Update status page** to resolved
3. **Document timeline** and actions taken
4. **Schedule post-mortem** meeting

#### Communication Template (Resolution)
```
✅ INCIDENT RESOLVED - P[SEVERITY]

**Summary**: [Brief description of what was fixed]
**Root Cause**: [What caused the incident]
**Resolution**: [What was done to fix it]
**Duration**: [Total incident duration]
**Post-mortem**: [Link to post-mortem document]

Thank you for your patience during this incident.
```

#### Post-Mortem Process (24-48 hours)
1. **Schedule post-mortem meeting** with all stakeholders
2. **Create post-mortem document** using template
3. **Identify action items** to prevent recurrence
4. **Assign owners** and deadlines for action items
5. **Share learnings** with the broader team

## Specific Incident Procedures

### Application Down

#### Symptoms
- Health check endpoints returning 5xx errors
- Unable to access application
- All pods crashing or not starting

#### Immediate Actions
```bash
# Check pod status
kubectl get pods -n studyteddy-production

# Check recent deployments
kubectl rollout history deployment/backend-production -n studyteddy-production

# Check resource availability
kubectl describe nodes

# Emergency rollback if recent deployment
./scripts/deployment/deploy-kubernetes.sh rollback previous
```

#### Investigation
```bash
# Check pod logs
kubectl logs deployment/backend-production -n studyteddy-production

# Check events
kubectl get events -n studyteddy-production --sort-by='.lastTimestamp'

# Check resource limits
kubectl describe deployment backend-production -n studyteddy-production
```

### High Error Rate

#### Symptoms
- Error rate > 5% for more than 5 minutes
- Increase in 5xx HTTP responses
- User reports of errors

#### Immediate Actions
```bash
# Identify error patterns
kubectl logs deployment/backend-production -n studyteddy-production | grep ERROR | tail -100

# Check database connectivity
curl -f https://api.studyteddy.com/health/db

# Check external service dependencies
./scripts/monitoring/external-deps-check.sh
```

#### Investigation
```bash
# Analyze error logs by endpoint
kubectl logs deployment/backend-production -n studyteddy-production | \
  grep ERROR | awk '{print $5}' | sort | uniq -c | sort -nr

# Check for database issues
./scripts/database/error-analysis.sh production

# Check for third-party service issues
./scripts/monitoring/third-party-status.sh
```

### Database Issues

#### Symptoms
- Database connection errors
- Slow query performance
- High database CPU/memory usage

#### Immediate Actions
```bash
# Check database connectivity
./scripts/database/connection-test.sh production

# Check database performance
./scripts/database/performance-check.sh production

# Kill long-running queries if necessary
./scripts/database/kill-long-queries.sh production
```

#### Investigation
```bash
# Analyze slow queries
./scripts/database/slow-query-analysis.sh production

# Check database locks
./scripts/database/lock-analysis.sh production

# Check connection pool status
./scripts/database/connection-pool-status.sh production
```

### Performance Degradation

#### Symptoms
- Response times > 3x normal
- High CPU/memory usage
- Timeouts and slow page loads

#### Immediate Actions
```bash
# Scale up resources
kubectl scale deployment backend-production --replicas=5 -n studyteddy-production

# Check resource usage
kubectl top pods -n studyteddy-production

# Enable performance profiling
./scripts/performance/enable-profiling.sh production
```

#### Investigation
```bash
# Analyze performance metrics
./scripts/performance/analyze-metrics.sh production

# Check for memory leaks
./scripts/performance/memory-analysis.sh production

# Profile CPU usage
./scripts/performance/cpu-profile.sh production
```

### Security Incidents

#### Symptoms
- Suspicious login attempts
- Unauthorized access
- Security alerts from monitoring

#### Immediate Actions
```bash
# Check security logs
./scripts/security/audit-logs.sh production

# Block suspicious IPs
./scripts/security/block-ip.sh [IP_ADDRESS]

# Force password reset for affected users
./scripts/security/force-password-reset.sh [USER_ID]
```

#### Investigation
```bash
# Analyze access patterns
./scripts/security/access-analysis.sh production

# Check for data breaches
./scripts/security/data-breach-check.sh production

# Verify SSL/TLS configuration
./scripts/security/ssl-check.sh production
```

## Tools and Scripts

### Monitoring Commands
```bash
# Real-time metrics
watch -n 5 'curl -s https://api.studyteddy.com/metrics'

# Database performance
./scripts/database/real-time-stats.sh production

# Network latency
./scripts/network/latency-monitor.sh production
```

### Emergency Contacts
```bash
# Page on-call engineer
./scripts/incident/page-oncall.sh "P0 incident description"

# Send emergency notification
./scripts/incident/emergency-notify.sh "Critical issue details"
```

### Status Updates
```bash
# Update internal status
./scripts/incident/update-internal-status.sh "Status message"

# Update public status page
./scripts/incident/update-public-status.sh "Public message"
```

## Recovery Procedures

### Service Recovery
```bash
# Restart all services
kubectl rollout restart deployment -n studyteddy-production

# Verify service health
./scripts/health-check.ts --env production --post-restart
```

### Database Recovery
```bash
# Restore from backup
./scripts/backup/restore-backup.sh production [BACKUP_ID]

# Verify database integrity
./scripts/database/integrity-check.sh production
```

### Cache Recovery
```bash
# Clear and rebuild cache
./scripts/cache/clear-and-rebuild.sh production

# Warm up cache
./scripts/cache/warmup.sh production
```

## Post-Incident Checklist

### Immediate (0-2 hours)
- [ ] Services fully restored
- [ ] All alerts resolved
- [ ] Stakeholders notified
- [ ] Status page updated
- [ ] Initial timeline documented

### Short-term (24-48 hours)
- [ ] Post-mortem scheduled
- [ ] Root cause identified
- [ ] Action items created
- [ ] Documentation updated

### Long-term (1-2 weeks)
- [ ] Action items completed
- [ ] Process improvements implemented
- [ ] Runbooks updated
- [ ] Team training completed

---

**Emergency Contacts:**
- **Incident Hotline**: +1-555-EMERGENCY
- **Slack**: #incident-response
- **Email**: incident@studyteddy.com

**Last Updated**: $(date)
**Version**: 1.0