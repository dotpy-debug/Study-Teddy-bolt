# SSL Certificate and Domain Configuration

This document outlines the SSL certificate setup and domain configuration for Study Teddy production deployment.

## Overview

Study Teddy uses the following deployment architecture:
- **Frontend**: Deployed on Vercel with automatic SSL
- **Backend**: Deployed on Railway with automatic SSL
- **Domain**: Custom domain with proper SSL certificates

## Vercel SSL Configuration (Frontend)

### Automatic SSL
Vercel provides automatic SSL certificates for all deployments:
- Free SSL certificates via Let's Encrypt
- Automatic renewal
- Support for custom domains
- Wildcard certificates for subdomains

### Custom Domain Setup

1. **Add Domain in Vercel Dashboard**
   ```bash
   # Using Vercel CLI
   vercel domains add yourdomain.com
   vercel domains add www.yourdomain.com
   ```

2. **Configure DNS Records**
   ```
   # A Record
   Type: A
   Name: @
   Value: 76.76.19.61 (Vercel IP)
   
   # CNAME Record
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Environment Variables**
   ```bash
   NEXTAUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

## Railway SSL Configuration (Backend)

### Automatic SSL
Railway provides automatic SSL certificates:
- Free SSL certificates
- Automatic renewal
- Custom domain support

### Custom Domain Setup

1. **Add Domain in Railway Dashboard**
   - Go to your service settings
   - Add custom domain: `api.yourdomain.com`
   - Railway will provide a CNAME target

2. **Configure DNS Records**
   ```
   # CNAME Record for API subdomain
   Type: CNAME
   Name: api
   Value: your-service.railway.app
   ```

3. **Environment Variables**
   ```bash
   FRONTEND_URL=https://yourdomain.com
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   GOOGLE_CALLBACK_URL=https://api.yourdomain.com/auth/google/callback
   ```

## DNS Configuration

### Recommended DNS Setup
```
# Main domain (A record to Vercel)
yourdomain.com → 76.76.19.61

# WWW subdomain (CNAME to Vercel)
www.yourdomain.com → cname.vercel-dns.com

# API subdomain (CNAME to Railway)
api.yourdomain.com → your-service.railway.app

# Optional: Email subdomain
mail.yourdomain.com → your-email-provider
```

### DNS Providers
Recommended DNS providers:
- **Cloudflare** (Free, fast, additional security features)
- **AWS Route 53** (Reliable, integrates with AWS services)
- **Google Cloud DNS** (Fast, reliable)
- **Namecheap** (Affordable, user-friendly)

## Security Headers

### Frontend Security Headers (Next.js)
Already configured in `next.config.ts`:
```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains; preload'
},
{
  key: 'Content-Security-Policy',
  value: 'default-src \'self\'; ...'
}
```

### Backend Security Headers (NestJS)
Configured via Helmet middleware:
```typescript
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## SSL Certificate Monitoring

### Automated Monitoring
Both Vercel and Railway handle SSL certificate renewal automatically.

### Manual Verification
```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
curl -vI https://yourdomain.com 2>&1 | grep -i expire

# Online SSL checker
# https://www.ssllabs.com/ssltest/
```

## Troubleshooting

### Common Issues

1. **Certificate Not Trusted**
   - Ensure DNS records are properly configured
   - Wait for DNS propagation (up to 48 hours)
   - Check that domain is verified in deployment platform

2. **Mixed Content Warnings**
   - Ensure all resources use HTTPS
   - Update API URLs to use HTTPS
   - Check Content Security Policy headers

3. **CORS Issues**
   - Update CORS_ORIGINS environment variable
   - Include both www and non-www versions
   - Ensure protocol (https://) is included

### Verification Commands

```bash
# Test SSL certificate
curl -I https://yourdomain.com

# Test API endpoint
curl -I https://api.yourdomain.com/health

# Test CORS
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://api.yourdomain.com/api/auth/me
```

## Production Checklist

- [ ] Custom domain configured in Vercel
- [ ] Custom domain configured in Railway
- [ ] DNS records properly set
- [ ] SSL certificates active and valid
- [ ] Environment variables updated with HTTPS URLs
- [ ] CORS configuration updated
- [ ] Security headers configured
- [ ] SSL certificate monitoring set up
- [ ] All endpoints accessible via HTTPS
- [ ] No mixed content warnings
- [ ] Google OAuth redirect URIs updated

## Environment Variables Summary

### Frontend (Vercel)
```bash
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
```

### Backend (Railway)
```bash
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/auth/google/callback
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```