# Security Configuration Guide

## Overview

This document provides comprehensive security configuration for the Study Teddy application, covering CSRF protection, CORS configuration, security headers, and secrets management.

## Table of Contents

1. [CSRF Protection](#csrf-protection)
2. [CORS Configuration](#cors-configuration)
3. [Security Headers](#security-headers)
4. [Secrets Management](#secrets-management)
5. [Environment Variables](#environment-variables)
6. [Deployment Checklist](#deployment-checklist)

## CSRF Protection

### Backend Configuration

CSRF protection is implemented using a double-submit cookie pattern with token validation.

#### Key Components

- **CSRFService**: Manages token generation, validation, and rotation
- **CSRFMiddleware**: Validates CSRF tokens for state-changing requests
- **Token Storage**: In-memory store with TTL and automatic cleanup

#### Configuration

```env
# CSRF Configuration
CSRF_ENABLED=true
CSRF_TOKEN_TTL=3600000  # 1 hour in milliseconds
CSRF_COOKIE_NAME=XSRF-TOKEN
CSRF_HEADER_NAME=X-XSRF-TOKEN
CSRF_DOUBLE_SUBMIT=true
CSRF_SAME_SITE=strict  # strict, lax, or none
```

#### Excluded Paths

The following endpoints are excluded from CSRF protection:
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/google`
- `/api/auth/refresh`
- `/api/auth/forgot-password`
- `/api/health`
- `/api/docs`

### Frontend Implementation

The frontend automatically handles CSRF tokens for all state-changing requests.

#### Usage

```typescript
import { api } from '@/lib/api/secure-client';

// Automatic CSRF protection
const response = await api.post('/tasks', {
  title: 'New Task'
});

// Manual CSRF token handling
import csrf from '@/lib/security/csrf';
const token = await csrf.getToken();
```

## CORS Configuration

### Environment-Based Origins

CORS is configured differently for each environment:

#### Production
```env
CORS_PRODUCTION_ORIGINS=https://studyteddy.com,https://www.studyteddy.com,https://app.studyteddy.com
```

#### Staging
```env
CORS_STAGING_ORIGINS=https://staging.studyteddy.com,https://preview.studyteddy.com
```

#### Development
```env
CORS_DEV_ORIGINS=http://localhost:3000,http://localhost:3001
```

### CORS Headers

```javascript
{
  origin: [/* Validated origins */],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Accept',
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-XSRF-Token',
    'Cache-Control',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Response-Time',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining'
  ],
  maxAge: 86400 // 24 hours in production
}
```

## Security Headers

### Content Security Policy (CSP)

Production CSP configuration:

```javascript
{
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  connectSrc: ["'self'", API_URL, 'https://api.openai.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: []
}
```

### HSTS Configuration

```javascript
{
  maxAge: 31536000,        // 1 year
  includeSubDomains: true,
  preload: true
}
```

### Additional Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

## Secrets Management

### Generating Secrets

Generate all required secrets:

```bash
npm run secrets:generate generate
```

This creates:
- JWT secrets
- Encryption keys
- Session secrets
- Database passwords
- API keys

### Secret Rotation

Initialize rotation tracking:

```bash
npm run secrets:rotate init
```

Rotate specific secret:

```bash
npm run secrets:rotate rotate JWT_SECRET
```

Rotate all secrets:

```bash
npm run secrets:rotate rotate
```

Check rotation status:

```bash
npm run secrets:rotate status
```

### Rotation Schedule

| Secret | Rotation Interval | Grace Period |
|--------|------------------|--------------|
| JWT_SECRET | 30 days | 24 hours |
| JWT_REFRESH_SECRET | 30 days | 24 hours |
| ENCRYPTION_KEY | 90 days | 72 hours |
| SESSION_SECRET | 30 days | 12 hours |
| CSRF_SECRET | 30 days | 12 hours |
| DB_PASSWORD | 60 days | 48 hours |
| API Keys | 90 days | 48 hours |

## Environment Variables

### Required Security Variables

```env
# Node Environment
NODE_ENV=production

# JWT Configuration
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=<generated>
ENCRYPTION_IV=<generated>

# Session
SESSION_SECRET=<generated>
COOKIE_SECRET=<generated>

# CSRF
CSRF_SECRET=<generated>
CSRF_ENABLED=true
CSRF_TOKEN_TTL=3600000

# CORS
FRONTEND_URL=https://studyteddy.com
CORS_PRODUCTION_ORIGINS=https://studyteddy.com,https://www.studyteddy.com

# Security Headers
CSP_REPORT_URI=https://your-csp-report-endpoint.com
EXPECT_CT_REPORT_URI=https://your-ct-report-endpoint.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security Features
SECURITY_RATE_LIMITING=true
SECURITY_INPUT_SANITIZATION=true
SECURITY_LOGGING=true
SECURITY_SUSPICIOUS_DETECTION=true
SECURITY_IP_BLOCKING=true
SECURITY_USER_AGENT_VALIDATION=true
SECURITY_REQUEST_SIZE_LIMIT=true
SECURITY_MAX_REQUEST_SIZE=1048576
SECURITY_CSRF_PROTECTION=true
```

## Deployment Checklist

### Pre-Deployment

- [ ] Generate all production secrets
- [ ] Configure environment-specific CORS origins
- [ ] Set up CSP report endpoint
- [ ] Configure rate limiting thresholds
- [ ] Enable all security features
- [ ] Test CSRF protection
- [ ] Verify CORS configuration
- [ ] Check security headers

### Production Configuration

1. **Generate Production Secrets**
   ```bash
   npm run secrets:generate generate
   cp .env.secrets .env.production
   ```

2. **Configure CORS**
   ```env
   CORS_PRODUCTION_ORIGINS=https://yourdomain.com
   ```

3. **Enable Security Features**
   ```env
   NODE_ENV=production
   CSRF_ENABLED=true
   SECURITY_RATE_LIMITING=true
   SECURITY_INPUT_SANITIZATION=true
   ```

4. **Set Up Monitoring**
   ```env
   CSP_REPORT_URI=https://your-monitoring.com/csp
   SENTRY_DSN=your-sentry-dsn
   ```

### Post-Deployment

- [ ] Verify HTTPS enforcement
- [ ] Test CSRF token generation
- [ ] Validate CORS behavior
- [ ] Check security headers in response
- [ ] Monitor CSP violations
- [ ] Set up secret rotation schedule
- [ ] Configure monitoring alerts
- [ ] Document emergency procedures

## Security Best Practices

### 1. Secret Management

- Never commit secrets to version control
- Use environment variables for all secrets
- Rotate secrets regularly
- Use strong, randomly generated secrets
- Store secrets securely (e.g., AWS Secrets Manager, HashiCorp Vault)

### 2. HTTPS Enforcement

- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS headers
- Consider HSTS preload list

### 3. Input Validation

- Validate all user input
- Sanitize HTML content
- Use parameterized queries
- Implement rate limiting

### 4. Authentication & Authorization

- Use secure session management
- Implement proper token expiration
- Use secure password hashing (bcrypt)
- Implement multi-factor authentication

### 5. Monitoring & Logging

- Log security events
- Monitor for suspicious activity
- Set up alerting for security violations
- Regular security audits

## Troubleshooting

### CSRF Token Issues

**Problem**: CSRF validation failures
**Solution**:
1. Check token expiration settings
2. Verify cookie configuration
3. Ensure frontend is sending token correctly
4. Check for clock synchronization issues

### CORS Errors

**Problem**: Cross-origin requests blocked
**Solution**:
1. Verify origin is in allowed list
2. Check credentials configuration
3. Ensure preflight requests are handled
4. Verify headers are allowed

### Security Header Conflicts

**Problem**: CSP blocking legitimate resources
**Solution**:
1. Check CSP directives
2. Add trusted sources to whitelist
3. Use report-only mode for testing
4. Monitor CSP reports

## Additional Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Security Headers](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

## Support

For security-related questions or to report vulnerabilities:
- Email: security@studyteddy.com
- Security Policy: [SECURITY.md](./SECURITY.md)
- Bug Bounty: [https://studyteddy.com/security/bug-bounty](https://studyteddy.com/security/bug-bounty)