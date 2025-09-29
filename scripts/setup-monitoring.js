#!/usr/bin/env node

/**
 * Production Monitoring Setup Script
 *
 * This script sets up comprehensive monitoring with:
 * - Sentry error tracking
 * - Performance monitoring
 * - Vercel Analytics
 * - Custom alerts and dashboards
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createInterface } = require('readline');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.allowFailure) {
      console.error(`❌ Command failed: ${command}`);
      throw error;
    }
    return null;
  }
}

async function setupSentryProject() {
  console.log('🔍 Setting up Sentry error tracking...');

  const useExisting = await question('Do you have an existing Sentry project? (y/n): ');

  let sentryDsn, sentryOrg, sentryProject, sentryAuthToken;

  if (useExisting.toLowerCase() === 'y') {
    sentryDsn = await question('Sentry DSN: ');
    sentryOrg = await question('Sentry Organization: ');
    sentryProject = await question('Sentry Project: ');
    sentryAuthToken = await question('Sentry Auth Token: ');
  } else {
    console.log('\n📋 Setting up new Sentry project:');
    console.log('1. Go to https://sentry.io/');
    console.log('2. Create a new account or sign in');
    console.log('3. Create a new project for "studyteddy"');
    console.log('4. Choose "Next.js" as the platform');
    console.log('5. Copy the configuration details');

    await question('Press Enter when ready...');

    sentryDsn = await question('Sentry DSN: ');
    sentryOrg = await question('Sentry Organization: ');
    sentryProject = await question('Sentry Project: ');
    sentryAuthToken = await question('Sentry Auth Token: ');
  }

  // Create Sentry configuration
  const sentryConfig = `
# Sentry Configuration
SENTRY_DSN=${sentryDsn}
SENTRY_ORG=${sentryOrg}
SENTRY_PROJECT=${sentryProject}
SENTRY_AUTH_TOKEN=${sentryAuthToken}

# Sentry Settings
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=\${VERCEL_GIT_COMMIT_SHA}
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_REPLAY_SAMPLE_RATE=0.1
SENTRY_ERROR_SAMPLE_RATE=1.0
`;

  // Update environment files
  const frontendEnvPath = path.join(process.cwd(), 'apps', 'frontend', '.env.production.local');
  let existingEnv = '';

  if (fs.existsSync(frontendEnvPath)) {
    existingEnv = fs.readFileSync(frontendEnvPath, 'utf8');
  }

  fs.writeFileSync(frontendEnvPath, existingEnv + sentryConfig);

  console.log('✅ Sentry configuration added to environment');

  return { sentryDsn, sentryOrg, sentryProject, sentryAuthToken };
}

function createSentryConfig(sentryConfig) {
  console.log('📄 Creating Sentry configuration files...');

  // Update existing sentry.client.config.ts
  const clientConfigPath = path.join(process.cwd(), 'apps', 'frontend', 'sentry.client.config.ts');

  if (fs.existsSync(clientConfigPath)) {
    console.log('✅ Sentry client config already exists');
  } else {
    const clientConfig = `import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'production',
  release: process.env.SENTRY_RELEASE,

  // Performance monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  // Session replay
  replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAY_SAMPLE_RATE || '0.1'),
  replaysOnErrorSampleRate: 1.0,

  // Error filtering
  beforeSend(event) {
    // Filter out development errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value?.includes('Non-Error promise rejection')) {
        return null;
      }
    }
    return event;
  },

  // Additional context
  initialScope: {
    tags: {
      component: 'frontend',
      platform: 'vercel'
    }
  },

  // Integration configuration
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.nextRouterInstrumentation({
        router: require('next/router').default
      })
    })
  ]
});
`;

    fs.writeFileSync(clientConfigPath, clientConfig);
    console.log('✅ Sentry client configuration created');
  }

  // Update existing sentry.server.config.ts
  const serverConfigPath = path.join(process.cwd(), 'apps', 'frontend', 'sentry.server.config.ts');

  if (fs.existsSync(serverConfigPath)) {
    console.log('✅ Sentry server config already exists');
  } else {
    const serverConfig = `import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'production',
  release: process.env.SENTRY_RELEASE,

  // Performance monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  // Error filtering
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },

  // Additional context
  initialScope: {
    tags: {
      component: 'backend',
      platform: 'vercel',
      runtime: 'nodejs'
    }
  }
});
`;

    fs.writeFileSync(serverConfigPath, serverConfig);
    console.log('✅ Sentry server configuration created');
  }

  // Update existing sentry.edge.config.ts
  const edgeConfigPath = path.join(process.cwd(), 'apps', 'frontend', 'sentry.edge.config.ts');

  if (fs.existsSync(edgeConfigPath)) {
    console.log('✅ Sentry edge config already exists');
  } else {
    const edgeConfig = `import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'production',
  release: process.env.SENTRY_RELEASE,

  // Reduced sampling for edge runtime
  tracesSampleRate: 0.05,

  // Additional context
  initialScope: {
    tags: {
      component: 'edge',
      platform: 'vercel',
      runtime: 'edge'
    }
  }
});
`;

    fs.writeFileSync(edgeConfigPath, edgeConfig);
    console.log('✅ Sentry edge configuration created');
  }
}

function setupPerformanceMonitoring() {
  console.log('\n⚡ Setting up performance monitoring...');

  // Create performance monitoring utility
  const performanceUtilsPath = path.join(process.cwd(), 'apps', 'frontend', 'lib', 'performance.ts');

  const performanceUtils = `import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function reportWebVitals(metric: WebVitalsMetric) {
  // Send to Sentry
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: \`\${metric.name}: \${metric.value}\`,
    level: 'info',
    data: {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta
    }
  });

  // Send to Vercel Analytics if available
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', \`web-vital-\${metric.name.toLowerCase()}\`, {
      value: metric.value,
      rating: metric.rating
    });
  }

  // Log performance metrics in production
  if (process.env.NODE_ENV === 'production') {
    console.log(\`[Performance] \${metric.name}: \${metric.value} (\${metric.rating})\`);
  }

  // Send alerts for poor performance
  if (metric.rating === 'poor') {
    Sentry.captureMessage(\`Poor performance detected: \${metric.name}\`, 'warning');
  }
}

export function initializeWebVitals() {
  getCLS(reportWebVitals);
  getFCP(reportWebVitals);
  getFID(reportWebVitals);
  getLCP(reportWebVitals);
  getTTFB(reportWebVitals);
}

export function trackCustomMetric(name: string, value: number, unit = 'ms') {
  Sentry.addBreadcrumb({
    category: 'custom-metric',
    message: \`\${name}: \${value}\${unit}\`,
    level: 'info',
    data: { value, unit }
  });

  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', \`custom-\${name}\`, { value });
  }
}

export function trackPageLoad(route: string, loadTime: number) {
  trackCustomMetric('page-load-time', loadTime);

  Sentry.addBreadcrumb({
    category: 'navigation',
    message: \`Page loaded: \${route}\`,
    level: 'info',
    data: { route, loadTime }
  });
}

export function trackAPICall(endpoint: string, duration: number, status: number) {
  trackCustomMetric('api-response-time', duration);

  Sentry.addBreadcrumb({
    category: 'api',
    message: \`API call: \${endpoint}\`,
    level: status >= 400 ? 'error' : 'info',
    data: { endpoint, duration, status }
  });

  if (status >= 400) {
    Sentry.captureMessage(\`API error: \${endpoint} returned \${status}\`, 'error');
  }
}
`;

  const libDir = path.join(process.cwd(), 'apps', 'frontend', 'lib');
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  fs.writeFileSync(performanceUtilsPath, performanceUtils);
  console.log('✅ Performance monitoring utilities created');
}

function setupVercelAnalytics() {
  console.log('\n📊 Setting up Vercel Analytics...');

  // Check if Vercel Analytics is already configured
  const packageJsonPath = path.join(process.cwd(), 'apps', 'frontend', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.dependencies['@vercel/analytics']) {
    console.log('✅ Vercel Analytics already installed');
  } else {
    console.log('📦 Installing Vercel Analytics...');
    execCommand('cd apps/frontend && bun add @vercel/analytics');
  }

  // Create analytics configuration
  const analyticsConfigPath = path.join(process.cwd(), 'apps', 'frontend', 'lib', 'analytics.ts');

  const analyticsConfig = `import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export function VercelAnalytics() {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export function trackEvent(name: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', name, properties);
  }
}

export function trackPageView(path: string) {
  trackEvent('pageview', { path });
}

export function trackUserAction(action: string, properties?: Record<string, any>) {
  trackEvent(\`user-\${action}\`, properties);
}
`;

  fs.writeFileSync(analyticsConfigPath, analyticsConfig);
  console.log('✅ Vercel Analytics configuration created');
}

function createMonitoringDashboard() {
  console.log('\n📈 Creating monitoring dashboard configuration...');

  const dashboardConfig = {
    name: 'StudyTeddy Production Monitoring',
    description: 'Comprehensive monitoring dashboard for StudyTeddy application',
    widgets: [
      {
        title: 'Error Rate',
        type: 'line-chart',
        query: 'errors by time',
        alert: {
          threshold: 0.01,
          condition: 'above',
          notification: 'email'
        }
      },
      {
        title: 'Response Time (p95)',
        type: 'line-chart',
        query: 'response_time.p95 by time',
        alert: {
          threshold: 300,
          condition: 'above',
          notification: 'slack'
        }
      },
      {
        title: 'Core Web Vitals',
        type: 'multi-line-chart',
        queries: [
          'web_vitals.lcp by time',
          'web_vitals.fid by time',
          'web_vitals.cls by time'
        ]
      },
      {
        title: 'Active Users',
        type: 'number',
        query: 'unique_users last 24h'
      },
      {
        title: 'API Endpoints',
        type: 'table',
        query: 'api_calls by endpoint'
      }
    ],
    alerts: [
      {
        name: 'High Error Rate',
        condition: 'error_rate > 0.01',
        notification: {
          email: ['alerts@studyteddy.com'],
          slack: '#alerts'
        }
      },
      {
        name: 'Slow Response Time',
        condition: 'response_time.p95 > 300ms',
        notification: {
          email: ['performance@studyteddy.com']
        }
      },
      {
        name: 'Database Connection Issues',
        condition: 'database_errors > 0',
        notification: {
          email: ['db-alerts@studyteddy.com'],
          priority: 'high'
        }
      }
    ]
  };

  const configDir = path.join(process.cwd(), 'monitoring');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, 'dashboard.json'),
    JSON.stringify(dashboardConfig, null, 2)
  );

  console.log('✅ Monitoring dashboard configuration created');
}

function setupAlertingRules() {
  console.log('\n🚨 Setting up alerting rules...');

  const alertingRules = `# StudyTeddy Alerting Rules
# Configure these in your monitoring platform (Sentry, Datadog, etc.)

# Error Rate Alerts
- name: "High Error Rate"
  condition: "error_rate > 1%"
  severity: "critical"
  notification:
    - email: "alerts@studyteddy.com"
    - slack: "#alerts"
  description: "Application error rate is above 1%"

- name: "Database Errors"
  condition: "database_error_count > 0"
  severity: "high"
  notification:
    - email: "db-team@studyteddy.com"
    - pagerduty: "database-oncall"
  description: "Database connection or query errors detected"

# Performance Alerts
- name: "Slow API Response"
  condition: "api_response_time.p95 > 300ms"
  severity: "warning"
  notification:
    - email: "performance@studyteddy.com"
  description: "API response time p95 is above 300ms"

- name: "Poor Core Web Vitals"
  condition: "lcp > 2.5s OR fid > 100ms OR cls > 0.1"
  severity: "warning"
  notification:
    - email: "frontend@studyteddy.com"
  description: "Core Web Vitals are below recommended thresholds"

# Infrastructure Alerts
- name: "High Memory Usage"
  condition: "memory_usage > 80%"
  severity: "warning"
  notification:
    - email: "ops@studyteddy.com"
  description: "Memory usage is above 80%"

- name: "Function Timeout"
  condition: "function_timeout_count > 0"
  severity: "high"
  notification:
    - email: "alerts@studyteddy.com"
    - slack: "#alerts"
  description: "Vercel function timeouts detected"

# Business Metrics
- name: "Low User Activity"
  condition: "active_users < 10 for 1h"
  severity: "info"
  notification:
    - email: "product@studyteddy.com"
  description: "Unusually low user activity detected"

- name: "Authentication Failures"
  condition: "auth_failure_rate > 5%"
  severity: "warning"
  notification:
    - email: "security@studyteddy.com"
  description: "High authentication failure rate detected"
`;

  fs.writeFileSync(path.join(process.cwd(), 'monitoring', 'alerts.yml'), alertingRules);
  console.log('✅ Alerting rules configuration created');
}

function createMonitoringDocumentation() {
  const documentation = `# Production Monitoring Guide

## Overview

StudyTeddy production monitoring includes:
- Error tracking with Sentry
- Performance monitoring with Web Vitals
- Analytics with Vercel Analytics
- Custom metrics and alerts

## Sentry Configuration

### Error Tracking
- Automatic error capture
- Source map upload for better debugging
- Release tracking
- Environment-specific filtering

### Performance Monitoring
- Transaction sampling (10%)
- Core Web Vitals tracking
- API response time monitoring
- Database query performance

### Session Replay
- 10% of sessions recorded
- 100% of error sessions recorded
- Privacy-safe recording (text/media masked)

## Vercel Analytics

### Metrics Tracked
- Page views and unique visitors
- Core Web Vitals (LCP, FID, CLS)
- Custom events and conversions
- Geographic distribution

### Custom Events
- User registration
- Study session completion
- AI chat usage
- Feature usage

## Performance Monitoring

### Core Web Vitals Thresholds
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Custom Metrics
- API response time (p95 < 300ms)
- Page load time
- Database query time
- Feature usage rates

## Alerting

### Critical Alerts
- Error rate > 1%
- Database connection failures
- Function timeouts
- Security incidents

### Warning Alerts
- Response time > 300ms
- Poor Core Web Vitals
- High resource usage
- Authentication failures

### Info Alerts
- Low user activity
- Feature usage anomalies
- Deployment notifications

## Dashboards

### Main Dashboard
- Real-time error rate
- Performance metrics
- User activity
- System health

### Performance Dashboard
- Core Web Vitals trends
- API response times
- Bundle size tracking
- Third-party service performance

### Business Dashboard
- User engagement metrics
- Feature adoption rates
- Conversion funnels
- Revenue impact

## Incident Response

### Severity Levels
1. **Critical**: Service down or major functionality broken
2. **High**: Significant impact on users
3. **Medium**: Minor impact or degraded performance
4. **Low**: No user impact, informational

### Response Process
1. Alert received and acknowledged
2. Initial assessment and triage
3. Investigation and diagnosis
4. Mitigation and fix deployment
5. Post-incident review and documentation

## Tools and Access

### Sentry
- URL: https://sentry.io/organizations/studyteddy/
- Projects: studyteddy-frontend, studyteddy-backend
- Access: Team members with appropriate permissions

### Vercel Analytics
- URL: https://vercel.com/dashboard/analytics
- Project: studyteddy
- Access: Vercel team members

### Monitoring Scripts
- Performance check: \`bun scripts/performance-check.js\`
- Health check: \`curl https://studyteddy.vercel.app/api/health\`
- Error monitoring: Check Sentry dashboard

## Maintenance

### Daily Tasks
- Review error reports
- Check performance metrics
- Monitor user activity
- Verify system health

### Weekly Tasks
- Performance trend analysis
- Alert rule review
- Dashboard updates
- Capacity planning review

### Monthly Tasks
- Incident review and analysis
- Monitoring tool updates
- Alert threshold tuning
- Documentation updates

## Best Practices

### Error Handling
- Log errors with context
- Use structured logging
- Implement graceful degradation
- Monitor third-party services

### Performance
- Monitor Core Web Vitals
- Track bundle size changes
- Optimize critical paths
- Use performance budgets

### Security
- Monitor authentication failures
- Track suspicious activity
- Alert on security events
- Regular security reviews
`;

  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(docsDir, 'monitoring.md'), documentation);
  console.log('📚 Monitoring documentation created');
}

async function main() {
  console.log('📊 StudyTeddy Production Monitoring Setup\n');

  try {
    const sentryConfig = await setupSentryProject();
    createSentryConfig(sentryConfig);
    setupPerformanceMonitoring();
    setupVercelAnalytics();
    createMonitoringDashboard();
    setupAlertingRules();
    createMonitoringDocumentation();

    console.log('\n🎉 Monitoring setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure alerting rules in Sentry');
    console.log('2. Set up Slack/email notifications');
    console.log('3. Configure Vercel Analytics in dashboard');
    console.log('4. Test error reporting and alerts');
    console.log('5. Set up monitoring dashboards');

    console.log('\n🔗 Useful links:');
    console.log('- Sentry Dashboard: https://sentry.io/');
    console.log('- Vercel Analytics: https://vercel.com/dashboard/analytics');
    console.log('- Performance Guide: docs/monitoring.md');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };