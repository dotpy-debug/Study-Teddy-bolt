# Security Guidelines for Environment Configuration

This document outlines security best practices for managing environment variables and secrets in the Study Teddy application.

## Table of Contents

- [Security Principles](#security-principles)
- [Secret Management](#secret-management)
- [Environment-Specific Security](#environment-specific-security)
- [Access Control](#access-control)
- [Monitoring and Auditing](#monitoring-and-auditing)
- [Incident Response](#incident-response)
- [Compliance](#compliance)

## Security Principles

### Defense in Depth

1. **Multiple layers of security:**
   - Environment variable validation
   - Secret encryption at rest and in transit
   - Access control and authentication
   - Network security and isolation
   - Application-level security measures

2. **Least privilege principle:**
   - Grant minimum necessary access to secrets
   - Use role-based access control (RBAC)
   - Implement time-limited access tokens
   - Regular access reviews and audits

3. **Fail-safe defaults:**
   - Secure by default configurations
   - Explicit security settings
   - Fail closed on security errors
   - Conservative timeout values

### Zero Trust Model

1. **Never trust, always verify:**
   - Validate all environment inputs
   - Authenticate all access to secrets
   - Encrypt all data in transit
   - Monitor all access patterns

2. **Assume breach:**
   - Limit blast radius of compromised secrets
   - Implement secret rotation
   - Monitor for unauthorized access
   - Have incident response procedures

## Secret Management

### Secret Classification

| Classification | Examples | Rotation Frequency | Access Level |
|----------------|----------|-------------------|--------------|
| **Critical** | Production database passwords, JWT secrets | Weekly | Highly restricted |
| **Sensitive** | API keys, OAuth secrets | Monthly | Restricted |
| **Internal** | Development API keys | Quarterly | Limited |
| **Public** | Client IDs, public endpoints | As needed | Unrestricted |

### Secret Generation

#### Requirements by Classification

**Critical Secrets:**
- Minimum 64 characters
- Cryptographically secure random generation
- Include special characters, numbers, and mixed case
- No dictionary words or patterns

**Sensitive Secrets:**
- Minimum 32 characters
- Secure random generation
- Mixed case and numbers

**Internal Secrets:**
- Minimum 24 characters
- Random generation
- Development/testing use only

#### Generation Commands

```bash
# Critical secrets (64+ characters)
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64

# Sensitive secrets (32+ characters)
openssl rand -base64 32 | tr -d "=+/"

# Internal secrets (24+ characters)
openssl rand -base64 24

# JWT secrets with special requirements
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Database passwords
pwgen -s 32 1
```

### Secret Storage

#### Local Development
```bash
# Use .env.local (never commit)
# Example structure:
JWT_SECRET=dev-only-secret-not-for-production
DATABASE_URL=postgresql://localhost/studyteddy_dev
```

#### Development/Staging
- Use environment-specific secrets
- Store in secure CI/CD variables
- Use development-grade secret management

#### Production
- **Never store in plain text files**
- Use dedicated secret management systems:
  - AWS Secrets Manager
  - HashiCorp Vault
  - Azure Key Vault
  - Google Secret Manager
  - Kubernetes Secrets (with encryption at rest)

#### Secret Management System Configuration

**AWS Secrets Manager Example:**
```bash
# Store secret
aws secretsmanager create-secret \
  --name "studyteddy/production/database" \
  --description "Production database credentials" \
  --secret-string '{"username":"user","password":"secure_password"}'

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id "studyteddy/production/database" \
  --query SecretString --output text
```

**HashiCorp Vault Example:**
```bash
# Store secret
vault kv put secret/studyteddy/production \
  database_password="secure_password" \
  jwt_secret="secure_jwt_secret"

# Retrieve secret
vault kv get -field=database_password secret/studyteddy/production
```

### Secret Rotation

#### Rotation Schedule

| Secret Type | Frequency | Method |
|-------------|-----------|--------|
| Database passwords | Weekly | Automated with downtime window |
| JWT secrets | Monthly | Blue-green deployment |
| API keys | Monthly | API provider rotation |
| OAuth secrets | Quarterly | Manual coordination |
| Certificates | 90 days | Automated renewal |

#### Rotation Process

1. **Preparation:**
   - Identify all services using the secret
   - Plan deployment strategy
   - Prepare rollback procedures
   - Schedule maintenance window if needed

2. **Generation:**
   - Generate new secret using secure methods
   - Validate secret format and strength
   - Test secret with target service
   - Store in secret management system

3. **Deployment:**
   - Update secret in secret management system
   - Deploy applications with new secret
   - Verify functionality with new secret
   - Remove old secret after grace period

4. **Verification:**
   - Test all affected services
   - Monitor error rates and logs
   - Verify no services using old secret
   - Update documentation

#### Automated Rotation Script Example

```bash
#!/bin/bash
# rotate-jwt-secret.sh

set -euo pipefail

# Generate new JWT secret
NEW_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)

# Update in Kubernetes secret
kubectl patch secret studyteddy-production-secrets \
  -p="{\"data\":{\"JWT_SECRET\":\"$(echo -n $NEW_SECRET | base64)\"}}"

# Trigger rolling update
kubectl rollout restart deployment/studyteddy-backend
kubectl rollout restart deployment/studyteddy-frontend

# Wait for rollout to complete
kubectl rollout status deployment/studyteddy-backend
kubectl rollout status deployment/studyteddy-frontend

# Verify health
curl -f https://api.studyteddy.com/health

echo "JWT secret rotation completed successfully"
```

## Environment-Specific Security

### Local Development

**Security Posture: Relaxed**

```bash
# .env.local
NODE_ENV=local
DEBUG=true
JWT_SECRET=local-dev-secret-not-secure
DATABASE_SSL=false
RATE_LIMIT_ENABLED=false
CORS_ORIGIN=*
API_DOCS_ENABLED=true
```

**Security Measures:**
- Use test data only
- Enable debug features
- Relaxed CORS policies
- Weak secrets acceptable
- No production services

### Development Server

**Security Posture: Moderate**

```bash
# .env.development
NODE_ENV=development
DEBUG=false
JWT_SECRET=dev-server-secure-secret-32-chars
DATABASE_SSL=true
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://dev.studyteddy.com
API_DOCS_ENABLED=true
```

**Security Measures:**
- Secure secrets (not production-grade)
- SSL for all connections
- Basic rate limiting
- Restricted CORS
- Monitoring enabled

### Staging Environment

**Security Posture: High**

```bash
# .env.staging
NODE_ENV=staging
DEBUG=false
JWT_SECRET=staging-ultra-secure-secret-64-characters-cryptographically-random
DATABASE_SSL=true
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://staging.studyteddy.com
API_DOCS_ENABLED=false
HELMET_ENABLED=true
CSP_ENABLED=true
```

**Security Measures:**
- Production-grade secrets
- All security features enabled
- Comprehensive monitoring
- Regular security testing
- Compliance validation

### Production Environment

**Security Posture: Maximum**

```bash
# .env.production
NODE_ENV=production
DEBUG=false
JWT_SECRET=production-maximum-security-secret-cryptographically-secure-64-chars
DATABASE_SSL=true
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://studyteddy.com
API_DOCS_ENABLED=false
SWAGGER_ENABLED=false
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
```

**Security Measures:**
- Maximum security secrets
- All debugging disabled
- Strict security policies
- Comprehensive monitoring
- Regular security audits
- Incident response procedures

## Access Control

### Role-Based Access Control (RBAC)

#### Roles and Permissions

| Role | Environment Access | Secret Access | Deployment Rights |
|------|-------------------|---------------|-------------------|
| **Developer** | Local, Development | Development secrets | Development only |
| **DevOps** | All except Production | All secrets | All environments |
| **SRE** | Production (read-only) | Production secrets (read) | Emergency only |
| **Security** | All (audit) | All secrets (audit) | None |
| **Admin** | All | All | All |

#### Implementation

**Kubernetes RBAC Example:**

```yaml
# Role for developers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: studyteddy-development
  name: developer
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: studyteddy-development
subjects:
- kind: User
  name: developer@studyteddy.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

### Authentication and Authorization

#### Multi-Factor Authentication (MFA)
- **Required for production access**
- **Required for secret management systems**
- **Hardware tokens preferred**
- **Time-based OTP acceptable**

#### API Access Control
```bash
# Service account for applications
apiVersion: v1
kind: ServiceAccount
metadata:
  name: studyteddy-app
  namespace: studyteddy-production

# Limit permissions to required secrets only
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: studyteddy-production
  name: app-secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["studyteddy-production-secrets"]
  verbs: ["get"]
```

### Network Security

#### Environment Isolation
- **Separate VPCs/networks per environment**
- **No direct connectivity between environments**
- **Bastion hosts for administrative access**
- **VPN required for remote access**

#### Service-to-Service Communication
```bash
# Network policies for Kubernetes
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: studyteddy-network-policy
  namespace: studyteddy-production
spec:
  podSelector:
    matchLabels:
      app: studyteddy
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: studyteddy
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

## Monitoring and Auditing

### Security Monitoring

#### Log Events to Monitor
1. **Secret access events**
2. **Failed authentication attempts**
3. **Environment variable changes**
4. **Unauthorized API calls**
5. **Suspicious network activity**

#### Monitoring Configuration

**Sentry Security Monitoring:**
```javascript
// apps/backend/src/monitoring/security.ts
import * as Sentry from '@sentry/node';

export function logSecurityEvent(event: string, details: any) {
  Sentry.addBreadcrumb({
    message: `Security Event: ${event}`,
    level: 'warning',
    data: {
      ...details,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  });

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(`Security Event: ${event}`, 'warning');
  }
}

// Usage
logSecurityEvent('UNAUTHORIZED_SECRET_ACCESS', {
  secret: 'JWT_SECRET',
  user: request.user?.id,
  ip: request.ip,
});
```

**DataDog Security Dashboard:**
```javascript
// apps/backend/src/monitoring/datadog.ts
import { StatsD } from 'node-statsd';

const statsd = new StatsD({
  host: process.env.DATADOG_HOST,
  port: 8125,
});

export function trackSecurityMetric(metric: string, value = 1, tags: string[] = []) {
  statsd.increment(`security.${metric}`, value, tags);
}

// Usage
trackSecurityMetric('secret.access', 1, ['secret:jwt', 'environment:production']);
trackSecurityMetric('auth.failure', 1, ['method:jwt', 'reason:expired']);
```

### Audit Logging

#### Audit Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "SECRET_ACCESS",
  "user": "user@studyteddy.com",
  "service": "backend",
  "environment": "production",
  "secret": "DATABASE_PASSWORD",
  "action": "read",
  "success": true,
  "ip": "10.0.1.100",
  "request_id": "req_123456789"
}
```

#### Audit Trail Implementation
```typescript
// packages/config/src/audit.ts
export interface AuditEvent {
  timestamp: string;
  event: string;
  user?: string;
  service: string;
  environment: string;
  resource: string;
  action: string;
  success: boolean;
  ip?: string;
  requestId?: string;
  details?: Record<string, any>;
}

export class AuditLogger {
  private static instance: AuditLogger;

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public logEvent(event: AuditEvent): void {
    const auditLog = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Log to multiple destinations
    console.log('[AUDIT]', JSON.stringify(auditLog));

    // Send to external audit service
    if (process.env.AUDIT_WEBHOOK_URL) {
      this.sendToAuditService(auditLog);
    }
  }

  private async sendToAuditService(event: AuditEvent): Promise<void> {
    try {
      await fetch(process.env.AUDIT_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AUDIT_WEBHOOK_TOKEN}`,
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send audit event:', error);
    }
  }
}
```

### Alerting

#### Critical Security Alerts

1. **Immediate Alerts (PagerDuty/SMS):**
   - Production secret access by unauthorized users
   - Multiple failed authentication attempts
   - Unexpected environment variable changes
   - Security validation failures

2. **High Priority Alerts (Email/Slack):**
   - Secret rotation failures
   - Certificate expiration warnings
   - Unusual access patterns
   - Compliance violations

3. **Medium Priority Alerts (Dashboard):**
   - Development environment security issues
   - Non-critical configuration changes
   - Performance impact from security measures

#### Alert Configuration

**Kubernetes Alert Rules:**
```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: studyteddy-security-alerts
spec:
  groups:
  - name: security
    rules:
    - alert: UnauthorizedSecretAccess
      expr: increase(secret_access_unauthorized_total[5m]) > 0
      for: 0m
      labels:
        severity: critical
      annotations:
        summary: "Unauthorized access to secrets detected"
        description: "{{ $value }} unauthorized secret access attempts in the last 5 minutes"

    - alert: SecretRotationFailure
      expr: secret_rotation_failed == 1
      for: 0m
      labels:
        severity: high
      annotations:
        summary: "Secret rotation failed"
        description: "Secret rotation failed for {{ $labels.secret_name }}"
```

## Incident Response

### Security Incident Classification

| Severity | Impact | Response Time | Examples |
|----------|--------|---------------|----------|
| **Critical** | Production compromise | Immediate (< 15 min) | Secret exposure, data breach |
| **High** | Potential compromise | 1 hour | Failed rotation, suspicious access |
| **Medium** | Security degradation | 4 hours | Config drift, weak secrets |
| **Low** | Minor security issue | 24 hours | Documentation gaps, test issues |

### Incident Response Procedures

#### Secret Compromise Response

1. **Immediate Actions (0-15 minutes):**
   ```bash
   # Rotate compromised secret immediately
   ./scripts/emergency-secret-rotation.sh --secret JWT_SECRET

   # Block suspicious access
   kubectl patch networkpolicy studyteddy-network-policy \
     --patch '{"spec":{"ingress":[]}}'

   # Scale down affected services
   kubectl scale deployment studyteddy-backend --replicas=0
   ```

2. **Investigation (15-60 minutes):**
   - Review audit logs for access patterns
   - Identify scope of compromise
   - Check for data exfiltration
   - Document timeline of events

3. **Containment (1-4 hours):**
   - Rotate all potentially affected secrets
   - Update firewall rules
   - Patch security vulnerabilities
   - Restore services with new secrets

4. **Recovery (4-24 hours):**
   - Verify system integrity
   - Restore full functionality
   - Update security measures
   - Communicate with stakeholders

#### Emergency Contact Information

```bash
# Store in secure location accessible during emergencies
SECURITY_TEAM_PHONE="+1-555-SECURITY"
DEVOPS_ONCALL_PHONE="+1-555-DEVOPS"
INCIDENT_COMMANDER_PHONE="+1-555-INCIDENT"

# Incident Response Slack Channels
CRITICAL_INCIDENTS="#incident-critical"
SECURITY_INCIDENTS="#security-alerts"
GENERAL_INCIDENTS="#incident-response"
```

### Post-Incident Activities

1. **Root Cause Analysis:**
   - Identify how the incident occurred
   - Review security controls that failed
   - Analyze response effectiveness
   - Document lessons learned

2. **Security Improvements:**
   - Update security policies
   - Implement additional controls
   - Improve monitoring and alerting
   - Enhance training programs

3. **Compliance Reporting:**
   - Notify regulatory bodies if required
   - Update compliance documentation
   - Review legal obligations
   - Communicate with customers

## Compliance

### Regulatory Requirements

#### GDPR (General Data Protection Regulation)
- **Encryption:** All personal data encrypted at rest and in transit
- **Access Controls:** Documented access to personal data
- **Breach Notification:** 72-hour notification requirement
- **Data Minimization:** Only collect necessary environment data

#### SOC 2 (Service Organization Control 2)
- **Security:** Documented security policies and procedures
- **Availability:** Monitoring and incident response procedures
- **Processing Integrity:** Validation of environment configurations
- **Confidentiality:** Protection of confidential information

#### HIPAA (Healthcare Insurance Portability and Accountability Act)
- **Administrative Safeguards:** Policies for environment access
- **Physical Safeguards:** Protection of computing systems
- **Technical Safeguards:** Encryption and access controls

### Compliance Validation

#### Automated Compliance Checks

```bash
#!/bin/bash
# compliance-check.sh

echo "Running SOC 2 compliance checks..."

# Check encryption at rest
if [[ "$DATABASE_SSL" != "true" ]]; then
  echo "FAIL: Database SSL not enabled"
  exit 1
fi

# Check access controls
if [[ -z "$RBAC_ENABLED" ]] || [[ "$RBAC_ENABLED" != "true" ]]; then
  echo "FAIL: RBAC not enabled"
  exit 1
fi

# Check audit logging
if [[ -z "$AUDIT_LOGGING" ]] || [[ "$AUDIT_LOGGING" != "true" ]]; then
  echo "FAIL: Audit logging not enabled"
  exit 1
fi

# Check secret rotation
SECRET_AGE=$(kubectl get secret studyteddy-production-secrets \
  -o jsonpath='{.metadata.creationTimestamp}' | \
  xargs -I {} date -d {} +%s)
CURRENT_TIME=$(date +%s)
AGE_DAYS=$(( (CURRENT_TIME - SECRET_AGE) / 86400 ))

if [[ $AGE_DAYS -gt 90 ]]; then
  echo "FAIL: Secrets older than 90 days"
  exit 1
fi

echo "All compliance checks passed"
```

#### Regular Compliance Audits

1. **Monthly:**
   - Review access logs
   - Check secret rotation
   - Validate configurations

2. **Quarterly:**
   - Full security assessment
   - Compliance gap analysis
   - Third-party audit preparation

3. **Annually:**
   - External security audit
   - Compliance certification renewal
   - Policy and procedure review

---

For implementation details, see:
- [Environment Setup Guide](ENVIRONMENT_SETUP.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Monitoring Guide](MONITORING_GUIDE.md)