# Study Teddy Security Guide

This document outlines security considerations, best practices, and configurations for deploying Study Teddy in production environments.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Environment Security](#environment-security)
3. [Network Security](#network-security)
4. [Application Security](#application-security)
5. [Database Security](#database-security)
6. [Authentication & Authorization](#authentication--authorization)
7. [Data Protection](#data-protection)
8. [Monitoring & Incident Response](#monitoring--incident-response)
9. [Security Checklist](#security-checklist)

## Security Overview

Study Teddy implements multiple layers of security:

- **Application Layer**: Input validation, output encoding, secure coding practices
- **Network Layer**: TLS encryption, firewall rules, rate limiting
- **Infrastructure Layer**: Container security, secrets management
- **Data Layer**: Encryption at rest and in transit, access controls

## Environment Security

### Secret Management

#### Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.local
.env.production
apps/backend/.env
apps/frontend/.env.local
*.pem
*.key
secrets/
```

#### Environment Variable Security

```bash
# Generate strong secrets
openssl rand -base64 32  # For JWT secrets
openssl rand -base64 24  # For database passwords
pwgen -s 32 1           # Alternative password generator

# Set proper file permissions
chmod 600 .env
chmod 600 apps/backend/.env
chmod 600 apps/frontend/.env.local

# Restrict directory access
chmod 700 nginx/ssl/
```

#### Using External Secret Management

For production deployments, consider using:

- **HashiCorp Vault**
- **AWS Secrets Manager**
- **Azure Key Vault**
- **Google Secret Manager**
- **Kubernetes Secrets**

Example with Vault:

```bash
# Store secrets in Vault
vault kv put secret/studyteddy \
  jwt_secret="$(openssl rand -base64 32)" \
  db_password="$(openssl rand -base64 24)" \
  redis_password="$(openssl rand -base64 24)"

# Retrieve in deployment script
export JWT_SECRET=$(vault kv get -field=jwt_secret secret/studyteddy)
export POSTGRES_PASSWORD=$(vault kv get -field=db_password secret/studyteddy)
export REDIS_PASSWORD=$(vault kv get -field=redis_password secret/studyteddy)
```

### Container Security

#### Image Security

```dockerfile
# Use specific versions, not 'latest'
FROM node:20.11.0-alpine

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Use non-root user
USER nestjs

# Remove unnecessary packages
RUN apk del .build-deps
```

#### Docker Security Configuration

```yaml
# docker-compose.prod.yml security settings
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
```

#### Container Scanning

```bash
# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image studyteddy-backend:latest

docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image studyteddy-frontend:latest
```

## Network Security

### TLS/SSL Configuration

#### SSL Certificate Setup

```bash
# Production: Use Let's Encrypt
certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/*.pem
```

#### Nginx Security Configuration

```nginx
# nginx/nginx.conf security enhancements
server {
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # CSP Header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';" always;
}
```

### Firewall Configuration

#### UFW (Ubuntu Firewall)

```bash
# Enable firewall
ufw enable

# Allow SSH (change port if needed)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Deny direct access to application ports
ufw deny 3000/tcp
ufw deny 3001/tcp
ufw deny 5432/tcp
ufw deny 6379/tcp

# Check status
ufw status verbose
```

#### iptables Rules

```bash
#!/bin/bash
# firewall-rules.sh

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Rate Limiting

#### Application-Level Rate Limiting

Backend includes built-in rate limiting:

```typescript
// Backend configuration
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
export class ApiController {
  // API endpoints
}
```

#### Nginx Rate Limiting

```nginx
# nginx/nginx.conf
http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=global:10m rate=50r/s;

    server {
        # Global rate limit
        limit_req zone=global burst=100 nodelay;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
        }

        # Auth endpoints (stricter)
        location /auth/ {
            limit_req zone=auth burst=10 nodelay;
        }
    }
}
```

### DDoS Protection

#### Nginx Configuration

```nginx
# nginx/nginx.conf DDoS protection
http {
    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    limit_conn addr 10;

    # Request size limits
    client_body_buffer_size 128k;
    client_max_body_size 64M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Slow DoS protection
    client_body_timeout 5s;
    client_header_timeout 5s;
}
```

## Application Security

### Input Validation

The application implements comprehensive input validation:

```typescript
// Backend validation example
export class CreateTaskDto {
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => DOMPurify.sanitize(value))
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  @Transform(({ value }) => DOMPurify.sanitize(value))
  description?: string;

  @IsDateString()
  dueDate: string;
}
```

### Output Encoding

```typescript
// Automatic sanitization
import DOMPurify from 'dompurify';

export class SanitizationPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return DOMPurify.sanitize(value);
    }
    return value;
  }
}
```

### CORS Configuration

```typescript
// Backend CORS setup
app.enableCors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
  ],
  maxAge: 86400, // Cache preflight for 24 hours
});
```

### Security Headers

Application automatically sets security headers:

- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables XSS filtering
- **Strict-Transport-Security**: Enforces HTTPS
- **Content-Security-Policy**: Prevents XSS and injection attacks

## Database Security

### PostgreSQL Security

#### User and Access Control

```sql
-- Create dedicated application user
CREATE USER studyteddy_app WITH PASSWORD 'strong_password';

-- Create database
CREATE DATABASE studyteddy OWNER studyteddy_app;

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE studyteddy TO studyteddy_app;
GRANT USAGE ON SCHEMA public TO studyteddy_app;
GRANT CREATE ON SCHEMA public TO studyteddy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO studyteddy_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO studyteddy_app;

-- Create read-only user for analytics
CREATE USER studyteddy_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE studyteddy TO studyteddy_readonly;
GRANT USAGE ON SCHEMA public TO studyteddy_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO studyteddy_readonly;
```

#### PostgreSQL Configuration

```bash
# postgresql.conf security settings
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'ca.crt'
ssl_crl_file = 'root.crl'

# Connection security
listen_addresses = 'localhost'
max_connections = 100
password_encryption = scram-sha-256

# Logging
log_connections = on
log_disconnections = on
log_statement = 'mod'
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

#### Database Encryption

```bash
# Enable encryption at rest
# For cloud providers, enable encryption in their console
# For self-hosted, use LUKS or similar

# Encrypt database backups
gpg --symmetric --cipher-algo AES256 backup.sql
```

### Redis Security

```bash
# redis.conf security settings
bind 127.0.0.1
protected-mode yes
port 0  # Disable default port
unixsocket /var/run/redis/redis.sock
unixsocketperm 700
requirepass your_strong_password

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG "CONFIG_9a8b7c6d5e4f"
```

## Authentication & Authorization

### JWT Security

#### Token Configuration

```typescript
// JWT configuration
{
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: '15m', // Short-lived access tokens
    issuer: 'studyteddy-api',
    audience: 'studyteddy-frontend'
  }
}

// Refresh token configuration
{
  secret: process.env.JWT_REFRESH_SECRET,
  signOptions: {
    expiresIn: '7d', // Longer-lived refresh tokens
    issuer: 'studyteddy-api',
    audience: 'studyteddy-frontend'
  }
}
```

#### Token Validation

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'studyteddy-api',
      audience: 'studyteddy-frontend'
    });
  }

  async validate(payload: any) {
    // Additional validation logic
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || []
    };
  }
}
```

### OAuth Security

#### Google OAuth Configuration

```typescript
// Secure OAuth configuration
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'], // Minimal required scopes
    });
  }
}
```

### Session Security

```typescript
// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'studyteddy:sess:'
  })
}));
```

## Data Protection

### Encryption

#### Sensitive Data Encryption

```typescript
// Encrypt sensitive fields
import * as crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('studyteddy', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('studyteddy', 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### Data Sanitization

```typescript
// Database query sanitization
export class DatabaseService {
  async findUsers(query: any) {
    // Use parameterized queries
    const sanitizedQuery = this.sanitizeQuery(query);
    return this.db.query('SELECT * FROM users WHERE email = $1', [sanitizedQuery.email]);
  }

  private sanitizeQuery(query: any): any {
    // Remove SQL injection attempts
    const sanitized = {};
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/['"`;]/g, '');
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
```

### GDPR Compliance

```typescript
// Data anonymization for GDPR
export class GDPRService {
  async anonymizeUser(userId: string): Promise<void> {
    const anonymizedEmail = `deleted-${Date.now()}@example.com`;
    const anonymizedName = 'Deleted User';

    await this.db.update('users', {
      id: userId,
      email: anonymizedEmail,
      name: anonymizedName,
      deleted_at: new Date(),
      anonymized: true
    });

    // Anonymize related data
    await this.anonymizeUserTasks(userId);
    await this.anonymizeUserChats(userId);
  }

  async exportUserData(userId: string): Promise<any> {
    const userData = await this.db.query(`
      SELECT u.*, t.title, t.description, c.message
      FROM users u
      LEFT JOIN tasks t ON u.id = t.user_id
      LEFT JOIN chats c ON u.id = c.user_id
      WHERE u.id = $1
    `, [userId]);

    return {
      exportDate: new Date().toISOString(),
      userData: userData
    };
  }
}
```

## Monitoring & Incident Response

### Security Monitoring

#### Failed Authentication Monitoring

```typescript
// Monitor failed login attempts
@Injectable()
export class SecurityMonitoringService {
  private failedAttempts = new Map<string, number>();

  async logFailedLogin(email: string, ip: string): Promise<void> {
    const key = `${email}:${ip}`;
    const attempts = this.failedAttempts.get(key) || 0;
    this.failedAttempts.set(key, attempts + 1);

    if (attempts >= 5) {
      await this.alertSecurityTeam({
        type: 'SUSPICIOUS_LOGIN_ACTIVITY',
        email,
        ip,
        attempts: attempts + 1,
        timestamp: new Date()
      });
    }
  }

  private async alertSecurityTeam(incident: any): Promise<void> {
    // Send alert to security team
    await this.notificationService.sendAlert(incident);

    // Log to security system
    this.logger.warn('Security incident detected', incident);
  }
}
```

#### Intrusion Detection

```bash
#!/bin/bash
# security-monitor.sh

# Monitor for suspicious patterns
tail -f /var/log/nginx/access.log | while read line; do
  # Check for SQL injection attempts
  if echo "$line" | grep -qi "union\|select\|drop\|insert"; then
    echo "ALERT: Possible SQL injection attempt: $line" | mail -s "Security Alert" admin@yourdomain.com
  fi

  # Check for XSS attempts
  if echo "$line" | grep -qi "script\|javascript\|onload"; then
    echo "ALERT: Possible XSS attempt: $line" | mail -s "Security Alert" admin@yourdomain.com
  fi

  # Check for brute force attempts
  ip=$(echo "$line" | awk '{print $1}')
  if [ $(grep "$ip" /var/log/nginx/access.log | grep "401\|403" | wc -l) -gt 10 ]; then
    echo "ALERT: Possible brute force from $ip" | mail -s "Security Alert" admin@yourdomain.com
  fi
done
```

### Incident Response

#### Security Incident Playbook

```bash
#!/bin/bash
# incident-response.sh

INCIDENT_TYPE=$1
SEVERITY=$2

case $INCIDENT_TYPE in
  "data_breach")
    echo "CRITICAL: Data breach detected"
    # Immediate actions
    ./scripts/lockdown-system.sh
    ./scripts/notify-stakeholders.sh "data_breach" $SEVERITY
    ./scripts/preserve-evidence.sh
    ;;

  "unauthorized_access")
    echo "HIGH: Unauthorized access detected"
    # Block suspicious IPs
    ./scripts/block-ips.sh
    # Force password reset for affected users
    ./scripts/force-password-reset.sh
    ;;

  "ddos_attack")
    echo "MEDIUM: DDoS attack detected"
    # Enable additional rate limiting
    ./scripts/enable-ddos-protection.sh
    # Scale up infrastructure
    ./scripts/scale-up.sh
    ;;
esac
```

### Logging and Auditing

```typescript
// Security audit logging
@Injectable()
export class AuditService {
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const auditLog = {
      timestamp: new Date(),
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      ip: event.ip,
      userAgent: event.userAgent,
      success: event.success,
      details: event.details
    };

    // Log to database
    await this.db.insert('audit_logs', auditLog);

    // Log to external SIEM if configured
    if (process.env.SIEM_ENDPOINT) {
      await this.sendToSIEM(auditLog);
    }
  }
}
```

## Security Checklist

### Pre-Deployment Security Checklist

- [ ] **Environment Security**
  - [ ] All secrets generated with strong randomness
  - [ ] Environment files have restricted permissions (600)
  - [ ] No secrets committed to version control
  - [ ] External secret management configured (production)

- [ ] **Network Security**
  - [ ] SSL/TLS certificates installed and valid
  - [ ] Firewall rules configured
  - [ ] Rate limiting enabled
  - [ ] DDoS protection configured

- [ ] **Application Security**
  - [ ] Input validation implemented
  - [ ] Output encoding configured
  - [ ] CORS properly configured
  - [ ] Security headers enabled
  - [ ] Error handling doesn't leak information

- [ ] **Database Security**
  - [ ] Database user has minimal privileges
  - [ ] Connection encrypted
  - [ ] Audit logging enabled
  - [ ] Backup encryption configured

- [ ] **Authentication Security**
  - [ ] JWT tokens properly configured
  - [ ] OAuth securely implemented
  - [ ] Session security configured
  - [ ] Password policies enforced

- [ ] **Monitoring**
  - [ ] Security monitoring configured
  - [ ] Failed login monitoring enabled
  - [ ] Audit logging implemented
  - [ ] Incident response plan ready

### Regular Security Maintenance

#### Weekly Tasks
- [ ] Review security logs
- [ ] Check for failed authentication attempts
- [ ] Verify SSL certificate validity
- [ ] Update container images

#### Monthly Tasks
- [ ] Security vulnerability scan
- [ ] Review and rotate secrets
- [ ] Audit user permissions
- [ ] Test backup and recovery

#### Quarterly Tasks
- [ ] Penetration testing
- [ ] Security policy review
- [ ] Incident response drill
- [ ] Security training for team

### Security Contact Information

- **Security Team**: security@yourdomain.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Incident Reporting**: incidents@yourdomain.com

---

*Last updated: 2024-12-15*

*For questions about this security guide, contact the security team.*