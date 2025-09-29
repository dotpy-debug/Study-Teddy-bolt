# Study Teddy - Sentry Integration Guide

This comprehensive guide covers the Sentry monitoring and performance tracking setup for the Study Teddy application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Frontend Configuration](#frontend-configuration)
4. [Backend Configuration](#backend-configuration)
5. [Performance Monitoring](#performance-monitoring)
6. [Error Recovery](#error-recovery)
7. [Critical User Paths](#critical-user-paths)
8. [Alerts and Notifications](#alerts-and-notifications)
9. [Usage Examples](#usage-examples)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## Overview

The Study Teddy application uses Sentry for comprehensive monitoring, error tracking, and performance analysis across both frontend (Next.js) and backend (NestJS) components.

### Key Features

- **Error Tracking**: Automatic error capture with context
- **Performance Monitoring**: Real-time performance metrics and Core Web Vitals
- **User Path Tracking**: Critical user journey monitoring
- **Error Recovery**: Automatic error recovery strategies
- **Alerts**: Real-time notifications for issues
- **Custom Metrics**: Business and technical metrics tracking

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Sentry      │
│   (Next.js)     │    │   (NestJS)      │    │   Dashboard     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Client Config │    │ • Server Config │    │ • Error Events  │
│ • Server Config │    │ • Interceptors  │    │ • Performance   │
│ • Edge Config   │    │ • Filters       │    │ • Custom Metrics│
│ • Error Bounds  │    │ • Decorators    │    │ • Alerts        │
│ • Performance   │    │ • User Paths    │    │ • Dashboards    │
│ • User Paths    │    │ • Circuit Break │    │ • Releases      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Configuration

### Core Configuration Files

#### 1. Client Configuration (`sentry.client.config.ts`)

```typescript
import * as Sentry from '@sentry/nextjs';
import { BrowserTracing, Replay } from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Performance monitoring
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
  profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

  integrations: [
    new BrowserTracing({
      enableWebVitals: true,
      routingInstrumentation: Sentry.nextRouterInstrumentation(),
    }),
    new Replay({
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
  ],

  initialScope: {
    tags: {
      component: 'frontend',
      app: 'studyteddy',
    },
  },
});
```

#### 2. Server Configuration (`sentry.server.config.ts`)

```typescript
import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  integrations: [
    new Sentry.BrowserTracing(),
    nodeProfilingIntegration(),
  ],

  beforeSend: (event, hint) => {
    // Filter development noise
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sentry server event:', event);
    }
    return event;
  },
});
```

#### 3. Edge Configuration (`sentry.edge.config.ts`)

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  integrations: [
    new Sentry.BrowserTracing(),
  ],

  initialScope: {
    tags: {
      component: 'frontend-edge',
      app: 'studyteddy',
    },
  },
});
```

### Error Boundaries

#### Global Error Boundary

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

// Wrap your app or components
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

#### Specialized Error Boundaries

```typescript
// For different sections
import {
  DashboardErrorBoundary,
  StudySessionErrorBoundary,
  TaskManagementErrorBoundary,
  AIFeaturesErrorBoundary
} from '@/components/error/ErrorBoundary';

// Usage
<DashboardErrorBoundary>
  <DashboardComponent />
</DashboardErrorBoundary>
```

### Performance Monitoring

#### Performance Monitor Usage

```typescript
import { performanceMonitor } from '@/lib/performance/performance-monitor';

// Start performance measurement
performanceMonitor.startMeasure('component-render');

// End measurement
const duration = performanceMonitor.endMeasure('component-render');

// Track custom metrics
performanceMonitor.trackMetric({
  name: 'user.action.click',
  value: 1,
  unit: 'count',
  tags: { component: 'button' }
});
```

#### React Hooks for Performance

```typescript
import {
  useRenderTracking,
  useInteractionTracking,
  useJourneyTracking,
  useAPITracking
} from '@/hooks/usePerformanceTracking';

function MyComponent() {
  // Track component render performance
  useRenderTracking('MyComponent');

  // Track user interactions
  const { trackClick, trackFormSubmit } = useInteractionTracking();

  // Track user journeys
  const { addStep, completeJourney } = useJourneyTracking('user-onboarding');

  // Track API calls
  const { trackAPICall } = useAPITracking();

  const handleClick = () => {
    trackClick('submit-button', { formType: 'login' });
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

## Backend Configuration

### Core Setup

#### 1. Sentry Initialization (`sentry/sentry.init.ts`)

```typescript
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
    nodeProfilingIntegration(),
  ],

  beforeSend: (event, hint) => {
    // Filter out health checks
    if (event.request?.url?.includes('/health')) {
      return null;
    }
    return event;
  },
});
```

#### 2. Sentry Service (`sentry/sentry.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryService {
  trackMetric(metric: CustomMetric) {
    Sentry.withScope((scope) => {
      // Track custom metrics
    });
  }

  trackDatabaseOperation(metrics: DatabaseMetrics) {
    // Track database performance
  }

  trackAIOperation(operation: string, provider: string, duration: number, success: boolean) {
    // Track AI operations
  }
}
```

#### 3. Global Exception Filter (`common/filters/sentry-exception.filter.ts`)

```typescript
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { SentryService } from '../../sentry/sentry.service';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly sentryService: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Enhanced error capturing with context
  }
}
```

### Performance Decorators

#### 1. Performance Tracking

```typescript
import { SentryTrack, SentryTrackDatabase, SentryTrackAI } from '@/common/decorators/sentry-performance.decorator';

class UserService {
  @SentryTrack({
    operation: 'user.create',
    alertThreshold: 2000
  })
  async createUser(userData: CreateUserDto) {
    // Implementation
  }

  @SentryTrackDatabase('users', 'findOne')
  async findUserById(id: string) {
    // Implementation
  }

  @SentryTrackAI('user-analysis', 'openai')
  async analyzeUserProgress(userId: string) {
    // Implementation
  }
}
```

#### 2. Circuit Breaker Protection

```typescript
import { WithCircuitBreaker } from '@/common/services/circuit-breaker.service';

class ExternalService {
  @WithCircuitBreaker('external-api', () => this.fallbackMethod())
  async callExternalAPI() {
    // API call implementation
  }

  private fallbackMethod() {
    return { message: 'Service temporarily unavailable' };
  }
}
```

## Performance Monitoring

### Web Vitals Tracking

The frontend automatically tracks Core Web Vitals:

- **LCP (Largest Contentful Paint)**: < 2.5s (good), > 4s (poor)
- **FID (First Input Delay)**: < 100ms (good), > 300ms (poor)
- **CLS (Cumulative Layout Shift)**: < 0.1 (good), > 0.25 (poor)

### Custom Performance Metrics

#### Frontend Metrics

```typescript
import { SentryUtils } from '@/sentry.client.config';

// Track feature usage
SentryUtils.trackFeatureUsage('ai-chat', {
  sessionLength: 1200,
  messagesExchanged: 5
});

// Track study sessions
SentryUtils.trackStudySession('start', {
  sessionType: 'focus-mode',
  plannedDuration: 1800
});

// Track API calls
SentryUtils.trackAPICall('/api/tasks', 'POST', 250);
```

#### Backend Metrics

```typescript
// In your service
this.sentryService.trackDatabaseOperation({
  query: 'SELECT * FROM users WHERE id = ?',
  table: 'users',
  operation: 'select',
  duration: 45,
  rowsAffected: 1
});

this.sentryService.trackAIOperation(
  'chat-completion',
  'openai',
  3500,
  true,
  { promptTokens: 150, completionTokens: 200 }
);
```

## Error Recovery

### Frontend Error Recovery

#### Automatic Recovery Strategies

```typescript
import { errorRecoveryService, withErrorRecovery, createErrorContext } from '@/lib/error-recovery/error-recovery.service';

// Automatic recovery wrapper
const result = await withErrorRecovery(
  async () => {
    // Your operation that might fail
    return await apiCall();
  },
  createErrorContext('api-client', 'fetch-data')
);

// Manual recovery
const recovered = await errorRecoveryService.recoverFromError(
  error,
  { component: 'TaskList', action: 'load-tasks' }
);
```

#### Custom Recovery Strategies

```typescript
// Register custom recovery strategy
errorRecoveryService.registerStrategy({
  name: 'custom_api_retry',
  canHandle: (error) => error.message.includes('custom-api'),
  recover: async (error, context) => {
    // Custom recovery logic
    return true; // or false if recovery failed
  },
  fallback: () => {
    // Fallback action if recovery fails
  }
});
```

### Backend Error Recovery

#### Service Integration

```typescript
import { ErrorRecoveryService, WithErrorRecovery } from '@/common/services/error-recovery.service';

class UserService {
  constructor(
    private readonly errorRecoveryService: ErrorRecoveryService
  ) {}

  @WithErrorRecovery({ service: 'UserService', operationType: 'database' })
  async findUser(id: string) {
    // Method that might fail and recover
  }
}
```

#### Circuit Breaker Integration

```typescript
import { CircuitBreakerService, WithCircuitBreaker } from '@/common/services/circuit-breaker.service';

class ExternalAPIService {
  @WithCircuitBreaker('payment-api', () => this.paymentFallback())
  async processPayment(data: PaymentData) {
    // Payment processing logic
  }

  private paymentFallback() {
    return { status: 'queued', message: 'Payment queued for processing' };
  }
}
```

## Critical User Paths

### Frontend User Path Monitoring

#### Pre-configured Monitoring

```typescript
import {
  AuthMonitoring,
  TaskMonitoring,
  StudySessionMonitoring,
  AIMonitoring
} from '@/lib/monitoring/user-path-monitoring';

// Authentication flows
const loginPathId = AuthMonitoring.startLogin({ provider: 'email' });
AuthMonitoring.addLoginStep(loginPathId, 'validate-credentials');
AuthMonitoring.addLoginStep(loginPathId, 'check-mfa');
AuthMonitoring.completeAuth(loginPathId, true, userId);

// Task management
const taskPathId = TaskMonitoring.startTaskCreation(userId, { taskType: 'study' });
TaskMonitoring.addTaskStep(taskPathId, 'validate-input');
TaskMonitoring.addTaskStep(taskPathId, 'ai-processing');
TaskMonitoring.completeTask(taskPathId, true, taskId);

// Study sessions
const sessionPathId = StudySessionMonitoring.startSession(userId, 'focus-mode');
StudySessionMonitoring.addSessionStep(sessionPathId, 'load-materials');
StudySessionMonitoring.addSessionStep(sessionPathId, 'start-timer');
StudySessionMonitoring.completeSession(sessionPathId, true, sessionId);

// AI interactions
const aiPathId = AIMonitoring.startAIInteraction(userId, 'chat');
AIMonitoring.addAIStep(aiPathId, 'prepare-context');
AIMonitoring.addAIStep(aiPathId, 'send-request');
AIMonitoring.completeAI(aiPathId, true, responseTime);
```

### Backend User Path Monitoring

#### Service Integration

```typescript
import { UserPathMonitoringService, MonitorUserPath } from '@/common/services/user-path-monitoring.service';

class AuthService {
  constructor(
    private readonly userPathMonitoringService: UserPathMonitoringService
  ) {}

  @MonitorUserPath('authentication_login')
  async login(loginDto: LoginDto) {
    const pathId = this.userPathMonitoringService.startPath(
      'authentication_login',
      undefined,
      this.getRequestId()
    );

    try {
      this.userPathMonitoringService.addStep(pathId, 'validate_credentials');
      const user = await this.validateCredentials(loginDto);

      this.userPathMonitoringService.addStep(pathId, 'generate_tokens');
      const tokens = await this.generateTokens(user);

      this.userPathMonitoringService.completePath(pathId, true, { userId: user.id });
      return tokens;
    } catch (error) {
      this.userPathMonitoringService.abandonPath(pathId, 'login_failed', error);
      throw error;
    }
  }
}
```

## Alerts and Notifications

### Configuration

#### Environment Variables

```bash
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=studyteddy
SENTRY_AUTH_TOKEN=your-auth-token

# Notification Channels
SLACK_ALERTS_WEBHOOK=https://hooks.slack.com/services/...
SLACK_CRITICAL_WEBHOOK=https://hooks.slack.com/services/...
DEV_TEAM_EMAILS=dev1@studyteddy.com,dev2@studyteddy.com
ONCALL_EMAIL=oncall@studyteddy.com
PAGERDUTY_WEBHOOK_URL=https://events.pagerduty.com/...
```

#### Alert Rules Setup

```javascript
// High Error Rate Alert
{
  name: "High Error Rate",
  environment: "production",
  conditions: [{
    id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
    interval: "5m",
    value: 50
  }],
  actions: [{
    id: "sentry.rules.actions.notify_email.NotifyEmailAction",
    targetType: "Team",
    targetIdentifier: "dev-team"
  }]
}

// Performance Degradation Alert
{
  name: "Slow API Response",
  conditions: [{
    id: "sentry.rules.conditions.event_attribute.EventAttributeCondition",
    attribute: "transaction.duration",
    match: "gt",
    value: 2000
  }],
  actions: [{
    id: "sentry.rules.actions.notify_slack.NotifySlackAction",
    channel: "#performance"
  }]
}
```

### Notification Service Usage

```typescript
import { NotificationService, AlertNotification } from '@/common/services/notification.service';

// Send custom alert
const alert: AlertNotification = {
  id: 'custom-alert-123',
  title: 'Database Connection Issues',
  message: 'Multiple database connection failures detected',
  severity: 'critical',
  source: 'database-monitor',
  timestamp: new Date(),
  metadata: {
    errorCount: 5,
    affectedUsers: 23
  }
};

await this.notificationService.sendAlert(alert);
```

## Usage Examples

### Basic Error Tracking

#### Frontend

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setTag('operation', 'user-action');
    scope.setContext('user', { id: userId, action: 'submit-form' });
    Sentry.captureException(error);
  });
}
```

#### Backend

```typescript
try {
  await databaseOperation();
} catch (error) {
  this.sentryService.captureException(error, {
    database_context: {
      operation: 'user-creation',
      table: 'users',
      userId
    }
  });
}
```

### Performance Tracking

#### Component Performance

```typescript
import { useRenderTracking, useJourneyTracking } from '@/hooks/usePerformanceTracking';

function LoginForm() {
  useRenderTracking('LoginForm');
  const { addStep, completeJourney } = useJourneyTracking('user-login');

  const handleSubmit = async (data) => {
    addStep('form-submit');

    try {
      const result = await login(data);
      addStep('login-success');
      completeJourney(true);
    } catch (error) {
      addStep('login-error', { error: error.message });
      completeJourney(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### API Performance

```typescript
import { useAPITracking } from '@/hooks/usePerformanceTracking';

function useTaskAPI() {
  const { trackAPICall } = useAPITracking();

  const createTask = async (taskData) => {
    return trackAPICall(
      () => fetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      }),
      '/api/tasks',
      'POST'
    );
  };

  return { createTask };
}
```

### Custom Metrics

#### Business Metrics

```typescript
// Track user engagement
SentryUtils.trackMetric('user.session.duration', sessionDuration, {
  unit: 'seconds',
  userType: 'premium'
});

// Track feature adoption
SentryUtils.trackFeatureUsage('ai-study-planner', {
  planType: 'weekly',
  subjects: ['math', 'science']
});

// Track conversion events
SentryUtils.trackMetric('conversion.signup', 1, {
  source: 'landing-page',
  plan: 'free-trial'
});
```

### User Context

```typescript
// Set user context globally
SentryUtils.setUserContext({
  id: user.id,
  email: user.email,
  username: user.username,
  subscription: user.subscriptionType,
  joinDate: user.createdAt
});

// Add custom user properties
Sentry.setContext('user_preferences', {
  theme: 'dark',
  language: 'en',
  timezone: 'UTC-5',
  notifications: user.notificationSettings
});
```

## Troubleshooting

### Common Issues

#### 1. Events Not Appearing in Sentry

**Symptoms**: No events showing up in Sentry dashboard

**Solutions**:
- Verify DSN configuration: `NEXT_PUBLIC_SENTRY_DSN` for frontend, `SENTRY_DSN` for backend
- Check environment variables are loaded correctly
- Verify network connectivity to Sentry
- Check sample rates (set to 1.0 for testing)
- Look for JavaScript console errors

```typescript
// Debug configuration
Sentry.init({
  // ... other config
  debug: true, // Enable debug logs
  beforeSend: (event) => {
    console.log('Sentry event:', event);
    return event;
  }
});
```

#### 2. Performance Data Missing

**Symptoms**: No performance transactions in Sentry

**Solutions**:
- Check `tracesSampleRate` setting
- Verify BrowserTracing integration is enabled
- Ensure performance monitoring is enabled in Sentry project settings

```typescript
// Enable performance monitoring
Sentry.init({
  tracesSampleRate: 1.0, // Capture 100% for testing
  integrations: [
    new BrowserTracing({
      enableWebVitals: true,
    }),
  ],
});
```

#### 3. Too Many Events/Rate Limiting

**Symptoms**: Events being dropped, rate limit warnings

**Solutions**:
- Implement proper error filtering
- Adjust sample rates for production
- Use `beforeSend` to filter noise

```typescript
// Filter out noise
beforeSend: (event) => {
  // Filter development errors
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // Filter health checks
  if (event.request?.url?.includes('/health')) {
    return null;
  }

  // Filter known non-critical errors
  if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
    return null;
  }

  return event;
}
```

#### 4. High Memory Usage

**Symptoms**: Application memory usage increasing over time

**Solutions**:
- Reduce `maxBreadcrumbs` setting
- Implement proper cleanup in error recovery
- Monitor memory metrics

```typescript
Sentry.init({
  maxBreadcrumbs: 50, // Reduce from default 100
  // ... other config
});
```

### Performance Debugging

#### 1. Slow Performance Tracking

```typescript
// Add detailed performance logging
const startTime = performance.now();

// Your operation
await someOperation();

const duration = performance.now() - startTime;
console.log(`Operation took ${duration}ms`);

// Track with Sentry
SentryUtils.trackMetric('operation.duration', duration, {
  operation: 'someOperation',
  threshold: duration > 1000 ? 'slow' : 'fast'
});
```

#### 2. Memory Monitoring

```typescript
// Track memory usage
if ('memory' in performance) {
  const memory = (performance as any).memory;

  SentryUtils.trackMetric('memory.used', memory.usedJSHeapSize / 1024 / 1024, {
    unit: 'MB'
  });

  if (memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
    console.warn('High memory usage detected');
  }
}
```

### Configuration Validation

#### Environment Check Script

```typescript
// scripts/validate-sentry-config.ts
function validateSentryConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('Missing Sentry configuration:', missing);
    process.exit(1);
  }

  console.log('Sentry configuration validated ✓');
}

validateSentryConfig();
```

## Best Practices

### 1. Error Context

Always provide meaningful context with errors:

```typescript
// Good: Rich context
Sentry.withScope((scope) => {
  scope.setTag('feature', 'task-management');
  scope.setTag('operation', 'create-task');
  scope.setContext('task_data', {
    type: taskData.type,
    priority: taskData.priority,
    dueDate: taskData.dueDate
  });
  scope.setUser({ id: userId, email: userEmail });
  Sentry.captureException(error);
});

// Bad: No context
Sentry.captureException(error);
```

### 2. Performance Thresholds

Set realistic performance thresholds:

```typescript
// Frontend thresholds
const thresholds = {
  'page.load': 3000,      // 3 seconds
  'api.request': 2000,    // 2 seconds
  'component.render': 100, // 100ms
  'user.interaction': 50   // 50ms
};

// Backend thresholds
const apiThresholds = {
  'database.query': 500,  // 500ms
  'external.api': 5000,   // 5 seconds
  'ai.operation': 30000,  // 30 seconds
  'file.upload': 60000    // 60 seconds
};
```

### 3. Sampling Strategy

Configure appropriate sampling rates:

```typescript
// Production sampling
const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  // Error sampling: capture all errors
  // Performance sampling: sample based on volume
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  profilesSampleRate: isProduction ? 0.1 : 1.0,

  // Session replay: minimal sampling
  replaysSessionSampleRate: isProduction ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0, // Always capture on errors
});
```

### 4. Release Tracking

Implement proper release tracking:

```bash
# Set release in environment
SENTRY_RELEASE=studyteddy@1.2.3

# Create release in Sentry
sentry-cli releases new studyteddy@1.2.3
sentry-cli releases set-commits studyteddy@1.2.3 --auto
sentry-cli releases finalize studyteddy@1.2.3

# Upload source maps (frontend)
sentry-cli sourcemaps inject .next
sentry-cli sourcemaps upload .next
```

### 5. Privacy and Security

Protect sensitive data:

```typescript
// Sanitize sensitive data
beforeSend: (event) => {
  // Remove passwords from form data
  if (event.request?.data?.password) {
    event.request.data.password = '[Filtered]';
  }

  // Remove tokens from headers
  if (event.request?.headers?.authorization) {
    event.request.headers.authorization = '[Filtered]';
  }

  return event;
}
```

### 6. Testing Strategy

Test your Sentry integration:

```typescript
// Test error capturing
function testSentryError() {
  try {
    throw new Error('Test error for Sentry integration');
  } catch (error) {
    Sentry.captureException(error);
  }
}

// Test performance tracking
function testSentryPerformance() {
  const transaction = Sentry.startTransaction({
    name: 'Test Transaction',
    op: 'test'
  });

  setTimeout(() => {
    transaction.finish();
  }, 1000);
}

// Only run in development
if (process.env.NODE_ENV === 'development') {
  window.testSentry = { testSentryError, testSentryPerformance };
}
```

### 7. Monitoring Health

Regular monitoring checklist:

- [ ] Review error rates weekly
- [ ] Check performance trends monthly
- [ ] Validate alert effectiveness
- [ ] Update performance thresholds based on data
- [ ] Clean up old releases and events
- [ ] Review and update sampling rates
- [ ] Test alert channels monthly
- [ ] Update team contact information
- [ ] Review and rotate API tokens quarterly

## Conclusion

This comprehensive Sentry integration provides robust monitoring, performance tracking, and error recovery for the Study Teddy application. Regular maintenance and monitoring of the Sentry configuration ensures optimal application performance and user experience.

For additional support:
- Sentry Documentation: https://docs.sentry.io/
- Study Teddy Development Team: dev-team@studyteddy.com
- Sentry Support: https://sentry.io/support/