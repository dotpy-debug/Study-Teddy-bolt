# StudyTeddy Troubleshooting Guide

This guide provides comprehensive troubleshooting procedures for common issues in the StudyTeddy platform.

## Table of Contents

1. [Quick Diagnostic Commands](#quick-diagnostic-commands)
2. [Application Issues](#application-issues)
3. [Database Issues](#database-issues)
4. [Infrastructure Issues](#infrastructure-issues)
5. [Performance Issues](#performance-issues)
6. [Security Issues](#security-issues)
7. [Deployment Issues](#deployment-issues)
8. [Monitoring and Alerting Issues](#monitoring-and-alerting-issues)

## Quick Diagnostic Commands

### System Health Check
```bash
# Comprehensive health check
./scripts/health-check.ts --env production --comprehensive

# Quick service status
kubectl get pods -n studyteddy-production
kubectl get services -n studyteddy-production
kubectl get ingress -n studyteddy-production

# Application endpoints
curl -f https://api.studyteddy.com/health
curl -f https://studyteddy.com
```

### Resource Usage
```bash
# Pod resource usage
kubectl top pods -n studyteddy-production

# Node resource usage
kubectl top nodes

# Detailed resource analysis
kubectl describe nodes
```

### Log Analysis
```bash
# Recent application logs
kubectl logs deployment/backend-production -n studyteddy-production --tail=100

# Error logs only
kubectl logs deployment/backend-production -n studyteddy-production | grep ERROR

# Logs from previous deployment
kubectl logs deployment/backend-production -n studyteddy-production --previous
```

## Application Issues

### Issue: Application Not Responding

#### Symptoms
- HTTP 502/503 errors
- Connection timeouts
- Health check failures

#### Diagnostic Steps
1. **Check pod status**
   ```bash
   kubectl get pods -n studyteddy-production
   kubectl describe pod <pod-name> -n studyteddy-production
   ```

2. **Check service endpoints**
   ```bash
   kubectl get endpoints -n studyteddy-production
   kubectl describe service backend-production -n studyteddy-production
   ```

3. **Check application logs**
   ```bash
   kubectl logs deployment/backend-production -n studyteddy-production --tail=50
   ```

#### Common Causes and Solutions

**Cause: Pod crashing due to OOM (Out of Memory)**
```bash
# Check memory usage
kubectl top pods -n studyteddy-production

# Increase memory limits
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

**Cause: Application startup issues**
```bash
# Check startup logs
kubectl logs deployment/backend-production -n studyteddy-production | head -50

# Check environment variables
kubectl describe deployment backend-production -n studyteddy-production | grep -A 20 "Environment:"
```

**Cause: Database connection failure**
```bash
# Test database connectivity
kubectl run db-test --rm -i --restart=Never --image=postgres:16 -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool status
curl -s https://api.studyteddy.com/debug/db-pool
```

### Issue: Slow Application Response

#### Symptoms
- High response times (>2s)
- Timeouts
- Poor user experience

#### Diagnostic Steps
1. **Check response times**
   ```bash
   # Measure response time
   curl -w "@curl-format.txt" -o /dev/null -s https://api.studyteddy.com/health

   # Check multiple endpoints
   ./scripts/monitoring/response-time-check.sh
   ```

2. **Check resource usage**
   ```bash
   kubectl top pods -n studyteddy-production --containers
   ```

3. **Check database performance**
   ```bash
   ./scripts/database/performance-check.sh production
   ```

#### Solutions

**High CPU usage**
```bash
# Scale horizontally
kubectl scale deployment backend-production --replicas=5 -n studyteddy-production

# Increase CPU limits
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"cpu":"1000m"}}}]}}}}'
```

**Database bottlenecks**
```bash
# Check slow queries
./scripts/database/slow-query-analysis.sh production

# Optimize queries
./scripts/database/optimize-queries.sh production
```

**Cache misses**
```bash
# Check cache hit rate
kubectl exec deployment/redis-production -n studyteddy-production -- \
  redis-cli info stats | grep keyspace

# Warm up cache
./scripts/cache/warmup.sh production
```

### Issue: High Error Rate

#### Symptoms
- Increased 4xx/5xx errors
- Error rate > 1%
- User complaints

#### Diagnostic Steps
1. **Analyze error patterns**
   ```bash
   # Count errors by type
   kubectl logs deployment/backend-production -n studyteddy-production | \
     grep ERROR | awk '{print $5}' | sort | uniq -c | sort -nr

   # Check HTTP status codes
   kubectl logs deployment/nginx-ingress-controller -n ingress-nginx | \
     grep "studyteddy" | awk '{print $9}' | sort | uniq -c | sort -nr
   ```

2. **Check external dependencies**
   ```bash
   # Test external services
   ./scripts/monitoring/external-deps-check.sh

   # Check API rate limits
   curl -I https://api.openai.com/v1/models
   ```

#### Solutions

**API rate limiting**
```bash
# Check current rate limits
curl -s https://api.studyteddy.com/debug/rate-limits

# Adjust rate limiting
kubectl patch configmap app-config -n studyteddy-production \
  -p '{"data":{"rate_limit":"100"}}'
```

**Validation errors**
```bash
# Check validation logs
kubectl logs deployment/backend-production -n studyteddy-production | grep "validation"

# Update validation rules if needed
kubectl apply -f k8s/production/validation-config.yaml
```

## Database Issues

### Issue: Database Connection Errors

#### Symptoms
- "Connection refused" errors
- "Too many connections" errors
- Database timeouts

#### Diagnostic Steps
1. **Test database connectivity**
   ```bash
   # Direct connection test
   kubectl run db-test --rm -i --restart=Never --image=postgres:16 -- \
     psql $DATABASE_URL -c "SELECT version();"

   # Check connection count
   kubectl run db-test --rm -i --restart=Never --image=postgres:16 -- \
     psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Check database status**
   ```bash
   # AWS RDS status (if using RDS)
   aws rds describe-db-instances --db-instance-identifier studyteddy-production

   # Check database logs
   aws logs describe-log-groups --log-group-name-prefix /aws/rds/instance/studyteddy
   ```

#### Solutions

**Too many connections**
```bash
# Kill idle connections
./scripts/database/kill-idle-connections.sh production

# Increase connection pool size
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","env":[{"name":"DB_POOL_SIZE","value":"50"}]}]}}}}'
```

**Connection timeout**
```bash
# Increase connection timeout
kubectl patch configmap app-config -n studyteddy-production \
  -p '{"data":{"db_timeout":"30000"}}'

# Restart application
kubectl rollout restart deployment backend-production -n studyteddy-production
```

### Issue: Slow Database Queries

#### Symptoms
- High database CPU usage
- Slow query warnings in logs
- Application timeouts

#### Diagnostic Steps
1. **Identify slow queries**
   ```bash
   ./scripts/database/slow-query-analysis.sh production
   ```

2. **Check database performance metrics**
   ```bash
   # Check database connections
   ./scripts/database/connection-analysis.sh production

   # Check lock contention
   ./scripts/database/lock-analysis.sh production
   ```

#### Solutions

**Missing indexes**
```bash
# Create missing indexes
./scripts/database/create-indexes.sh production

# Verify index usage
./scripts/database/index-analysis.sh production
```

**Query optimization**
```bash
# Analyze query plans
./scripts/database/explain-queries.sh production

# Update statistics
kubectl run db-maintenance --rm -i --restart=Never --image=postgres:16 -- \
  psql $DATABASE_URL -c "ANALYZE;"
```

### Issue: Database Disk Space

#### Symptoms
- "No space left on device" errors
- Database write failures
- Slow performance

#### Diagnostic Steps
```bash
# Check disk usage (for RDS)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=studyteddy-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

#### Solutions

**Immediate relief**
```bash
# Clean up old data
./scripts/database/cleanup-old-data.sh production

# Vacuum tables
kubectl run db-maintenance --rm -i --restart=Never --image=postgres:16 -- \
  psql $DATABASE_URL -c "VACUUM FULL;"
```

**Long-term solution**
```bash
# Increase storage (RDS)
aws rds modify-db-instance \
  --db-instance-identifier studyteddy-production \
  --allocated-storage 200 \
  --apply-immediately
```

## Infrastructure Issues

### Issue: Kubernetes Nodes Not Ready

#### Symptoms
- Pods stuck in Pending state
- Node NotReady status
- Scheduling failures

#### Diagnostic Steps
1. **Check node status**
   ```bash
   kubectl get nodes
   kubectl describe node <node-name>
   ```

2. **Check node conditions**
   ```bash
   kubectl get nodes -o wide
   kubectl top nodes
   ```

#### Solutions

**Node resource exhaustion**
```bash
# Clean up unused resources
kubectl delete pod --field-selector=status.phase=Succeeded -A

# Scale cluster (if using auto-scaling)
kubectl patch deployment cluster-autoscaler -n kube-system \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"cluster-autoscaler","command":["./cluster-autoscaler","--logtostderr=true","--v=4","--nodes=1:10:your-asg-name"]}]}}}}'
```

**Disk pressure**
```bash
# Clean up Docker images
kubectl debug node/<node-name> -it --image=busybox -- sh
# Inside the debug pod:
chroot /host
docker system prune -f
```

### Issue: Pod Scheduling Problems

#### Symptoms
- Pods stuck in Pending state
- "Insufficient resources" errors
- Pods not starting

#### Diagnostic Steps
```bash
# Check pod events
kubectl describe pod <pod-name> -n studyteddy-production

# Check resource requests vs availability
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check pod resource requirements
kubectl get pod <pod-name> -n studyteddy-production -o yaml | grep -A 10 resources
```

#### Solutions

**Resource constraints**
```bash
# Reduce resource requests
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"requests":{"memory":"256Mi","cpu":"100m"}}}]}}}}'

# Add more nodes (if manual scaling)
# For EKS, update the Auto Scaling Group
```

**Node affinity issues**
```bash
# Check node labels
kubectl get nodes --show-labels

# Remove problematic affinity rules
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"affinity":null}}}}'
```

### Issue: Ingress/Load Balancer Problems

#### Symptoms
- External traffic not reaching application
- SSL certificate errors
- DNS resolution issues

#### Diagnostic Steps
1. **Check ingress status**
   ```bash
   kubectl get ingress -n studyteddy-production
   kubectl describe ingress studyteddy-ingress -n studyteddy-production
   ```

2. **Check load balancer**
   ```bash
   kubectl get services -n studyteddy-production
   kubectl describe service backend-production -n studyteddy-production
   ```

3. **Test DNS resolution**
   ```bash
   nslookup studyteddy.com
   dig studyteddy.com
   ```

#### Solutions

**SSL certificate issues**
```bash
# Check certificate status
kubectl get certificates -n studyteddy-production
kubectl describe certificate studyteddy-tls -n studyteddy-production

# Force certificate renewal
kubectl delete certificate studyteddy-tls -n studyteddy-production
kubectl apply -f k8s/production/certificates.yaml
```

**Ingress controller issues**
```bash
# Check ingress controller logs
kubectl logs deployment/nginx-ingress-controller -n ingress-nginx

# Restart ingress controller
kubectl rollout restart deployment nginx-ingress-controller -n ingress-nginx
```

## Performance Issues

### Issue: High CPU Usage

#### Symptoms
- CPU usage > 80%
- Slow response times
- Application throttling

#### Diagnostic Steps
```bash
# Check CPU usage by pod
kubectl top pods -n studyteddy-production --sort-by=cpu

# Check CPU usage trends
kubectl exec deployment/backend-production -n studyteddy-production -- \
  curl http://localhost:3000/debug/pprof/profile > cpu-profile.prof
```

#### Solutions

**Scale horizontally**
```bash
kubectl scale deployment backend-production --replicas=5 -n studyteddy-production
```

**Optimize code**
```bash
# Enable performance monitoring
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","env":[{"name":"ENABLE_PROFILING","value":"true"}]}]}}}}'
```

### Issue: Memory Leaks

#### Symptoms
- Memory usage continuously growing
- OOM kills
- Performance degradation over time

#### Diagnostic Steps
```bash
# Monitor memory usage over time
watch -n 30 'kubectl top pods -n studyteddy-production'

# Generate heap dump
kubectl exec deployment/backend-production -n studyteddy-production -- \
  curl http://localhost:3000/debug/pprof/heap > heap-profile.prof
```

#### Solutions

**Immediate mitigation**
```bash
# Restart affected pods
kubectl rollout restart deployment backend-production -n studyteddy-production

# Increase memory limits
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

**Long-term fix**
```bash
# Enable garbage collection monitoring
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","env":[{"name":"NODE_OPTIONS","value":"--max-old-space-size=1024 --gc-interval=100"}]}]}}}}'
```

## Security Issues

### Issue: Suspicious Login Activity

#### Symptoms
- High number of failed login attempts
- Login attempts from unusual locations
- Account lockouts

#### Diagnostic Steps
```bash
# Check authentication logs
kubectl logs deployment/backend-production -n studyteddy-production | grep "auth"

# Analyze failed login attempts
./scripts/security/analyze-login-attempts.sh production

# Check for IP patterns
kubectl logs deployment/backend-production -n studyteddy-production | \
  grep "failed login" | awk '{print $8}' | sort | uniq -c | sort -nr
```

#### Solutions

**Block suspicious IPs**
```bash
# Add IP to blocklist
./scripts/security/block-ip.sh 192.168.1.100

# Update rate limiting
kubectl patch configmap security-config -n studyteddy-production \
  -p '{"data":{"login_rate_limit":"5"}}'
```

**Enhanced monitoring**
```bash
# Enable security alerts
kubectl apply -f k8s/production/security-monitoring.yaml

# Force password reset for affected accounts
./scripts/security/force-password-reset.sh user@example.com
```

### Issue: SSL/TLS Certificate Problems

#### Symptoms
- Browser security warnings
- Certificate expired errors
- TLS handshake failures

#### Diagnostic Steps
```bash
# Check certificate expiry
echo | openssl s_client -servername studyteddy.com -connect studyteddy.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
./scripts/security/cert-chain-check.sh studyteddy.com
```

#### Solutions

**Renew certificates**
```bash
# Force certificate renewal (cert-manager)
kubectl delete certificate studyteddy-tls -n studyteddy-production
kubectl apply -f k8s/production/certificates.yaml

# Manual certificate update (if needed)
kubectl create secret tls studyteddy-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n studyteddy-production
```

## Deployment Issues

### Issue: Deployment Rollout Stuck

#### Symptoms
- Deployment shows "Progressing" for extended time
- New pods not starting
- Old pods not terminating

#### Diagnostic Steps
```bash
# Check rollout status
kubectl rollout status deployment/backend-production -n studyteddy-production

# Check deployment events
kubectl describe deployment backend-production -n studyteddy-production

# Check pod status
kubectl get pods -n studyteddy-production -l app=backend-production
```

#### Solutions

**Force rollout restart**
```bash
kubectl rollout restart deployment backend-production -n studyteddy-production
```

**Fix resource constraints**
```bash
# Check if resources are available
kubectl describe nodes | grep -A 5 "Allocated resources"

# Reduce resource requests temporarily
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"requests":{"memory":"256Mi"}}}]}}}}'
```

### Issue: Image Pull Failures

#### Symptoms
- "ImagePullBackOff" errors
- "ErrImagePull" status
- Pods not starting

#### Diagnostic Steps
```bash
# Check pod events
kubectl describe pod <pod-name> -n studyteddy-production

# Check image existence
docker manifest inspect ghcr.io/mohamed-elkholy95/studyteddy/backend:v1.2.3

# Check registry authentication
kubectl get secrets -n studyteddy-production | grep docker
```

#### Solutions

**Fix image reference**
```bash
# Update deployment with correct image
kubectl set image deployment/backend-production \
  backend=ghcr.io/mohamed-elkholy95/studyteddy/backend:v1.2.3 \
  -n studyteddy-production
```

**Fix registry authentication**
```bash
# Create or update registry secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=mohamed-elkholy95 \
  --docker-password=$GITHUB_TOKEN \
  -n studyteddy-production

# Update deployment to use secret
kubectl patch deployment backend-production -n studyteddy-production \
  -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-secret"}]}}}}'
```

## Monitoring and Alerting Issues

### Issue: Alerts Not Firing

#### Symptoms
- Expected alerts not triggering
- Missing notifications
- Silent failures

#### Diagnostic Steps
```bash
# Check Prometheus targets
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring &
curl http://localhost:9090/api/v1/targets

# Check AlertManager status
kubectl port-forward svc/kube-prometheus-stack-alertmanager 9093:9093 -n monitoring &
curl http://localhost:9093/api/v1/status

# Check alert rules
kubectl get prometheusrules -n monitoring
```

#### Solutions

**Fix Prometheus configuration**
```bash
# Check Prometheus config
kubectl get configmap kube-prometheus-stack-prometheus -n monitoring -o yaml

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload
```

**Fix AlertManager routing**
```bash
# Check AlertManager config
kubectl get secret alertmanager-kube-prometheus-stack-alertmanager -n monitoring -o yaml

# Test alert routing
curl -XPOST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"TestAlert","severity":"warning"}}]'
```

### Issue: Missing Metrics

#### Symptoms
- Gaps in monitoring dashboards
- "No data" in Grafana
- Incomplete metric collection

#### Diagnostic Steps
```bash
# Check ServiceMonitor configuration
kubectl get servicemonitors -n monitoring

# Check if metrics endpoints are accessible
kubectl run test-pod --rm -i --restart=Never --image=curlimages/curl -- \
  curl http://backend-production.studyteddy-production.svc.cluster.local:3000/metrics

# Check Prometheus scrape errors
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'
```

#### Solutions

**Fix service discovery**
```bash
# Update ServiceMonitor labels
kubectl patch servicemonitor studyteddy-backend -n monitoring \
  -p '{"metadata":{"labels":{"release":"kube-prometheus-stack"}}}'

# Verify service labels match
kubectl get service backend-production -n studyteddy-production --show-labels
```

**Fix metrics endpoint**
```bash
# Ensure metrics port is exposed
kubectl patch service backend-production -n studyteddy-production \
  -p '{"spec":{"ports":[{"name":"metrics","port":3001,"targetPort":3001}]}}'

# Restart pods to apply changes
kubectl rollout restart deployment backend-production -n studyteddy-production
```

## Useful Scripts and Commands

### Emergency Debugging
```bash
# Create debug pod
kubectl run debug-pod --rm -i --tty --restart=Never \
  --image=nicolaka/netshoot -- /bin/bash

# Access node directly
kubectl debug node/<node-name> -it --image=busybox

# Port forward for local debugging
kubectl port-forward pod/<pod-name> 3000:3000 -n studyteddy-production
```

### Resource Analysis
```bash
# Find resource-hungry pods
kubectl top pods -A --sort-by=cpu | head -20
kubectl top pods -A --sort-by=memory | head -20

# Check resource quotas
kubectl get resourcequota -A

# Analyze pod resource usage over time
kubectl get pods -o custom-columns=NAME:.metadata.name,CPU_REQUEST:.spec.containers[*].resources.requests.cpu,MEMORY_REQUEST:.spec.containers[*].resources.requests.memory -n studyteddy-production
```

### Network Debugging
```bash
# Test internal DNS
kubectl run dns-test --rm -i --restart=Never --image=busybox -- \
  nslookup backend-production.studyteddy-production.svc.cluster.local

# Test connectivity between pods
kubectl run test-connectivity --rm -i --restart=Never --image=nicolaka/netshoot -- \
  ping backend-production.studyteddy-production.svc.cluster.local

# Check network policies
kubectl get networkpolicies -A
```

### Log Analysis
```bash
# Tail logs from multiple pods
kubectl logs -f deployment/backend-production -n studyteddy-production --all-containers=true

# Search logs for specific patterns
kubectl logs deployment/backend-production -n studyteddy-production | grep -E "(ERROR|WARN|FATAL)"

# Export logs for analysis
kubectl logs deployment/backend-production -n studyteddy-production --since=1h > application-logs.txt
```

---

**Quick Reference:**
- **Emergency Contact**: +1-555-EMERGENCY
- **Slack Channel**: #incident-response
- **Monitoring**: https://grafana.studyteddy.com
- **Status Page**: https://status.studyteddy.com

**Last Updated**: $(date)
**Version**: 1.0