# Study Teddy Production Deployment Guide

This guide provides step-by-step instructions for deploying Study Teddy to production using Vercel (frontend) and Railway (backend).

## Prerequisites

### Required Accounts
- [Vercel Account](https://vercel.com) (for frontend deployment)
- [Railway Account](https://railway.app) (for backend deployment)
- [Google Cloud Console](https://console.cloud.google.com) (for OAuth)
- [OpenAI Account](https://platform.openai.com) (for AI features)
- Domain registrar account (for custom domain)

### Required Tools
- Node.js 18+ and npm
- Git
- Vercel CLI: `npm install -g vercel`
- Railway CLI: `npm install -g @railway/cli`

## Step 1: Environment Setup

### 1.1 Generate Secrets
```bash
# Generate JWT and NextAuth secrets
node scripts/validate-production-env.js --generate-secrets
```

### 1.2 Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback/google`
   - `https://api.yourdomain.com/auth/google/callback`

### 1.3 Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create API key
3. Set usage limits for cost control

## Step 2: Database Setup

### 2.1 Create PostgreSQL Database
Railway provides managed PostgreSQL:

```bash
# Login to Railway
railway login

# Create new project
railway new

# Add PostgreSQL service
railway add postgresql

# Get database URL
railway variables
```

### 2.2 Run Database Migrations
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="your-railway-database-url"

# Navigate to backend
cd apps/backend

# Run migrations
npm run db:push
```

## Step 3: Backend Deployment (Railway)

### 3.1 Deploy Backend
```bash
# Navigate to backend directory
cd apps/backend

# Login to Railway
railway login

# Link to existing project or create new one
railway link

# Set environment variables
railway variables set DATABASE_URL="your-database-url"
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set GOOGLE_CLIENT_ID="your-google-client-id"
railway variables set GOOGLE_CLIENT_SECRET="your-google-client-secret"
railway variables set FRONTEND_URL="https://yourdomain.com"
railway variables set CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
railway variables set GOOGLE_CALLBACK_URL="https://api.yourdomain.com/auth/google/callback"

# Deploy
railway up
```

### 3.2 Configure Custom Domain
1. Go to Railway dashboard
2. Select your service
3. Go to Settings → Domains
4. Add custom domain: `api.yourdomain.com`
5. Configure DNS CNAME record as instructed

### 3.3 Verify Backend Deployment
```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"ok","timestamp":"...","services":{"database":"connected","openai":"available"}}
```

## Step 4: Frontend Deployment (Vercel)

### 4.1 Deploy Frontend
```bash
# Navigate to frontend directory
cd apps/frontend

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api.yourdomain.com

vercel env add NEXTAUTH_URL production
# Enter: https://yourdomain.com

vercel env add NEXTAUTH_SECRET production
# Enter: your-nextauth-secret

vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
# Enter: your-google-client-id

vercel env add GOOGLE_CLIENT_SECRET production
# Enter: your-google-client-secret

vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://yourdomain.com

# Deploy to production
vercel --prod
```

### 4.2 Configure Custom Domain
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add custom domain: `yourdomain.com`
5. Add www redirect: `www.yourdomain.com`
6. Configure DNS records as instructed

### 4.3 Verify Frontend Deployment
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Test main page
curl -I https://yourdomain.com
```

## Step 5: DNS Configuration

### 5.1 Configure DNS Records
```
# A Record (or CNAME to Vercel)
Type: A
Name: @
Value: 76.76.19.61

# CNAME for www
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# CNAME for API
Type: CNAME
Name: api
Value: your-service.railway.app
```

### 5.2 Wait for DNS Propagation
DNS changes can take up to 48 hours to propagate globally.

## Step 6: Final Configuration

### 6.1 Update Google OAuth Settings
1. Go to Google Cloud Console
2. Update OAuth consent screen
3. Add production domain to authorized domains
4. Update redirect URIs with production URLs

### 6.2 Test Authentication Flow
1. Visit `https://yourdomain.com`
2. Try to register/login
3. Test Google OAuth
4. Verify JWT tokens are working

### 6.3 Test API Integration
1. Create a task
2. Test AI chat functionality
3. Check dashboard analytics
4. Verify all features work

## Step 7: Monitoring Setup

### 7.1 Enable Error Tracking
```bash
# Add Sentry (optional)
npm install @sentry/nextjs @sentry/node

# Configure in both frontend and backend
```

### 7.2 Set Up Uptime Monitoring
- Use services like UptimeRobot, Pingdom, or StatusCake
- Monitor both frontend and backend health endpoints
- Set up alerts for downtime

### 7.3 Performance Monitoring
- Enable Vercel Analytics
- Monitor Railway metrics
- Set up database performance monitoring

## Step 8: Security Checklist

- [ ] All environment variables are secure
- [ ] HTTPS is enforced everywhere
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Rate limiting is enabled
- [ ] Database connections are secure
- [ ] API keys have proper permissions
- [ ] OAuth settings are production-ready

## Step 9: Backup and Recovery

### 9.1 Database Backups
Railway provides automatic backups, but consider:
- Setting up additional backup schedules
- Testing restore procedures
- Documenting recovery processes

### 9.2 Code Backups
- Ensure code is in version control
- Tag production releases
- Document deployment procedures

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Check CORS_ORIGINS environment variable
   railway variables get CORS_ORIGINS
   
   # Should include your frontend domain
   ```

2. **Authentication Issues**
   ```bash
   # Verify Google OAuth settings
   # Check redirect URIs match exactly
   # Ensure secrets are properly set
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connection
   railway run psql $DATABASE_URL
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   curl -vI https://yourdomain.com
   ```

### Getting Help

- Railway Support: [help.railway.app](https://help.railway.app)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Study Teddy Issues: Create GitHub issue

## Maintenance

### Regular Tasks
- Monitor application performance
- Check error logs
- Update dependencies
- Review security settings
- Monitor costs and usage

### Updates
```bash
# Deploy updates
cd apps/frontend && vercel --prod
cd apps/backend && railway up
```

## Cost Optimization

### Vercel
- Free tier includes 100GB bandwidth
- Pro plan: $20/month for team features

### Railway
- $5/month for 512MB RAM, 1GB storage
- Database: $5/month for 1GB storage

### OpenAI
- Monitor token usage
- Set usage limits
- Optimize prompts for efficiency

## Success Metrics

After deployment, monitor:
- Application uptime (target: 99.9%)
- Response times (target: <2s)
- Error rates (target: <1%)
- User satisfaction
- Feature usage analytics