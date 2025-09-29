# Study Teddy Monitoring & Observability Guide

This document provides a comprehensive guide to the monitoring and observability setup for Study Teddy, including Sentry integration, performance monitoring, and alerting configurations.

## Overview

Study Teddy uses Sentry for comprehensive monitoring across both frontend (Next.js) and backend (NestJS) applications. The monitoring system tracks:

- **Error Tracking**: Runtime errors, unhandled exceptions, and API failures
- **Performance Monitoring**: Web Vitals, API response times, and database query performance
- **User Experience**: Real User Monitoring (RUM) and user session tracking
- **Release Tracking**: Deployment monitoring and regression detection
- **Custom Metrics**: Business-specific KPIs and performance indicators

## PRD Requirements Compliance

### Performance Targets
- ✅ **p95 < 300ms**: Frontend performance monitoring with alerts
- ✅ **Bundle < 250KB gzipped**: Bundle size tracking and optimization
- ✅ **Web Vitals monitoring**: Core Web Vitals (CLS, FID, LCP, FCP, TTFB)
- ✅ **Real-time error tracking**: Instant error detection and reporting

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend       │    │  Backend        │    │  Sentry         │
│  (Next.js)      │    │  (NestJS)       │    │  Dashboard      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Error Boundary│    │ • Global        │    │ • Error         │
│ • Web Vitals    │    │   Interceptor   │    │   Aggregation   │
│ • Performance   │    │ • Performance   │    │ • Performance   │
│   Monitoring    │    │   Decorators    │    │   Analytics     │
│ • User Feedback │    │ • Database      │    │ • Alerting      │
│ • Bundle        │    │   Monitoring    │    │ • Releases      │
│   Tracking      │    │ • AI Operation  │    │ • Dashboards    │
│                 │    │   Tracking      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Monitoring (Next.js)

### Sentry Configuration Files

- **`sentry.client.config.ts`**: Client-side error tracking and Web Vitals
- **`sentry.server.config.ts`**: Server-side rendering monitoring
- **`sentry.edge.config.ts`**: Edge runtime monitoring
- **`next.config.ts`**: Webpack integration and source maps

### Key Features

#### 1. Web Vitals Monitoring
```typescript
// Automatically tracks Core Web Vitals
getCLS((metric) => {
  // Alert if CLS > 0.25 (poor)
  if (metric.value > 0.25) {
    Sentry.captureMessage('Poor CLS detected', 'warning');
  }
});
```

#### 2. Performance Thresholds
- **Frontend renders**: Alert if > 50ms
- **API calls**: Alert if > 1000ms
- **Page loads**: Alert if > 3000ms
- **TTFB**: Alert if > 800ms

#### 3. Bundle Size Monitoring
- Tracks resource loading performance
- Alerts if bundle exceeds 250KB limit
- Monitors JavaScript and CSS sizes separately

#### 4. Error Boundaries
Enhanced error boundary with Sentry integration:
```typescript
// Automatic error reporting with context
Sentry.withScope((scope) => {
  scope.setContext('errorBoundary', {
    errorId: this.state.errorId,
    componentStack: errorInfo.componentStack,
  });
  Sentry.captureException(error);
});
```

### Performance Monitoring Hooks

#### `useSentryMonitoring`
```typescript
const { trackInteraction, trackAPICall, trackError } = useSentryMonitoring({
  componentName: 'MyComponent',
  trackRender: true,
  trackInteractions: true,
});
```

#### `useFormMonitoring`
```typescript
const { trackFormSubmission, trackFormValidation } = useFormMonitoring('loginForm');
```

#### `useAIMonitoring`
```typescript
const { trackAIRequest } = useAIMonitoring();

const tracker = trackAIRequest('chat', inputTokens);
tracker.finish(success, outputTokens, error);
```

#### `useAuthMonitoring`
```typescript
const { trackAuthAttempt, trackAuthStateChange } = useAuthMonitoring();
```

## Backend Monitoring (NestJS)

### Sentry Configuration

Located in `src/main.ts` with comprehensive setup including:
- Performance monitoring with profiling
- HTTP request tracking
- Database operation monitoring
- AI operation tracking

### Performance Decorators

#### `@TrackPerformance`
```typescript
@TrackPerformance('user-operation')
async getUserProfile(userId: string) {
  // Automatically tracked in Sentry
}
```

#### `@TrackDatabaseOperation`
```typescript
@TrackDatabaseOperation('users')
async findUser(id: string) {
  // Database query performance tracking
}
```

#### `@TrackAIOperation`
```typescript
@TrackAIOperation('chat-completion')
async generateResponse(prompt: string) {
  // AI operation tracking with cost monitoring
}
```

### Global Interceptor

The `SentryInterceptor` automatically tracks:
- Request/response cycles
- API performance (alerts if > 500ms)
- Error rates and status codes
- User context and session data

## Alert Configuration

### Performance Alerts

1. **Frontend Performance**
   - CLS > 0.25 (Layout Shift)
   - FID > 300ms (Input Delay)
   - LCP > 4000ms (Largest Contentful Paint)
   - FCP > 3000ms (First Contentful Paint)
   - TTFB > 1800ms (Time to First Byte)

2. **API Performance**
   - Response time > 500ms (backend)
   - Response time > 1000ms (frontend calls)
   - Database queries > 100ms

3. **Bundle Size**
   - Total bundle > 250KB
   - JavaScript bundle growth > 10%

### Error Rate Alerts

1. **Error Thresholds**
   - Error rate > 1% over 5 minutes
   - Critical errors > 5 per minute
   - API 5xx errors > 2% over 10 minutes

2. **User Impact**
   - Affected users > 10 per hour
   - Session crashes > 5% over 15 minutes

## User Feedback Integration

### Feedback Component
The `SentryFeedback` component allows users to:
- Report bugs directly to Sentry
- Suggest features
- Provide general feedback

### Integration Examples
```typescript
// Basic feedback button
<SentryFeedback />

// Error-specific feedback
<SentryFeedback eventId={errorId} />

// Programmatic feedback
const { reportBug, suggestFeature } = useFeedback();
reportBug('Description of bug', error, context);
```

## Release Tracking

### Automatic Release Creation
Source maps and releases are automatically managed through:
- Webpack plugin integration
- GitHub Actions deployment
- Manual release script

### Release Script Usage
```bash
# Create release for production
./scripts/sentry-release.sh -v 1.2.0

# Create release for staging
./scripts/sentry-release.sh -v 1.2.0-beta -e staging
```

## Environment Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=studyteddy
SENTRY_PROJECT=studyteddy-frontend
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
```

### Backend (.env)
```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=studyteddy
SENTRY_PROJECT=studyteddy-backend
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_RELEASE=1.0.0
```

## Sentry Dashboard Setup

### Recommended Dashboards

1. **Application Health**
   - Error rate trends
   - Performance percentiles
   - User session analysis
   - Release comparison

2. **Web Vitals**
   - Core Web Vitals distribution
   - Performance score tracking
   - Geographic performance analysis
   - Device/browser breakdown

3. **API Performance**
   - Endpoint response times
   - Database query performance
   - Error rate by endpoint
   - Throughput metrics

4. **Business Metrics**
   - User engagement tracking
   - Feature usage analytics
   - AI operation costs
   - Conversion funnel analysis

### Alert Rules

1. **Critical Alerts** (Immediate notification)
   - Error rate > 5% for 5 minutes
   - API response time p95 > 2000ms
   - Core Web Vitals score < 50

2. **Warning Alerts** (15-minute delay)
   - Error rate > 1% for 10 minutes
   - Bundle size increase > 15%
   - Database query time > 200ms

3. **Info Alerts** (Daily digest)
   - Performance trend changes
   - New error types detected
   - User feedback submissions

## Troubleshooting

### Common Issues

1. **Source Maps Not Uploading**
   - Check `SENTRY_AUTH_TOKEN` is set
   - Verify build directory exists
   - Ensure network connectivity to Sentry

2. **Missing Performance Data**
   - Check `tracesSampleRate` configuration
   - Verify SDK initialization
   - Check for CSP blocking Sentry requests

3. **Bundle Size Alerts**
   - Run `npm run build:analyze` to investigate
   - Check for unexpected dependencies
   - Review code splitting configuration

### Debug Mode

Enable debug logging in development:
```typescript
// Frontend
Sentry.init({
  debug: process.env.NODE_ENV === 'development',
  // ... other config
});

// Backend
console.warn('Sentry backend event:', event);
```

## Best Practices

### Performance

1. **Sampling Rates**
   - Production: 10% for traces and profiles
   - Development: 100% for full visibility

2. **Error Filtering**
   - Filter out bot traffic
   - Exclude development errors
   - Remove sensitive information

3. **Context Enhancement**
   - Add user identification
   - Include relevant business context
   - Track custom business metrics

### Security

1. **Data Scrubbing**
   - Remove passwords and tokens
   - Scrub personal information
   - Filter out sensitive URLs

2. **Access Control**
   - Limit team access appropriately
   - Use environment-specific projects
   - Regular access reviews

### Cost Optimization

1. **Sampling Strategy**
   - Lower sampling in high-traffic periods
   - Prioritize critical user flows
   - Monitor quota usage

2. **Alert Efficiency**
   - Avoid alert fatigue
   - Group related alerts
   - Use appropriate notification channels

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Create Sentry Release
  run: |
    export SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
    ./scripts/sentry-release.sh -v ${{ github.sha }}
```

### Deployment Monitoring
- Automatic release tracking
- Deployment health checks
- Rollback detection
- Performance regression alerts

## Support and Resources

- **Sentry Documentation**: https://docs.sentry.io/
- **Study Teddy Sentry**: https://sentry.io/organizations/studyteddy/
- **Internal Runbooks**: See `/docs/runbooks/` directory
- **Alert Playbooks**: See `/docs/alerts/` directory

## Metrics and KPIs

### Performance KPIs
- **Core Web Vitals Score**: Target > 90
- **API Response Time p95**: Target < 300ms
- **Error Rate**: Target < 0.1%
- **Bundle Size**: Target < 250KB gzipped

### Business KPIs
- **User Session Health**: Crash rate < 0.01%
- **Feature Adoption**: Track via custom events
- **AI Operation Success**: Target > 95%
- **User Satisfaction**: Track via feedback ratings

This monitoring setup ensures comprehensive observability while maintaining performance and staying within budget constraints. Regular review and optimization of these configurations help maintain system health and user satisfaction.