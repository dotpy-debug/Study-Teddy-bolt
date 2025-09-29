# Sentry Alerts and Notifications Configuration

This document outlines the recommended Sentry alerts and notification configuration for the Study Teddy application.

## Alert Configuration Overview

### 1. Error Rate Alerts

#### High Error Rate Alert
- **Condition**: Error rate > 5% over 5 minutes
- **Threshold**:
  - Warning: > 3%
  - Critical: > 5%
- **Frequency**: Every 5 minutes
- **Actions**:
  - Email: development team
  - Slack: #alerts channel
  - PagerDuty: Critical only

#### Sudden Error Spike
- **Condition**: 50% increase in errors over 2 minutes compared to previous hour
- **Threshold**:
  - Warning: 25% increase
  - Critical: 50% increase
- **Actions**:
  - Email: development team
  - Slack: #alerts channel

### 2. Performance Alerts

#### Slow Response Time
- **Condition**: P95 response time > 2000ms over 10 minutes
- **Threshold**:
  - Warning: > 1500ms
  - Critical: > 2000ms
- **Actions**:
  - Slack: #performance channel
  - Email: on-call engineer

#### Core Web Vitals Degradation
- **Condition**: LCP > 4000ms or CLS > 0.25 or FID > 300ms
- **Threshold**:
  - Warning: LCP > 3000ms, CLS > 0.1, FID > 200ms
  - Critical: LCP > 4000ms, CLS > 0.25, FID > 300ms
- **Actions**:
  - Slack: #frontend-performance
  - Email: frontend team

#### Database Query Performance
- **Condition**: Average database query time > 500ms over 5 minutes
- **Threshold**:
  - Warning: > 300ms
  - Critical: > 500ms
- **Actions**:
  - Slack: #backend-alerts
  - Email: backend team

### 3. Business Logic Alerts

#### AI Service Failures
- **Condition**: AI service error rate > 10% over 5 minutes
- **Threshold**:
  - Warning: > 5%
  - Critical: > 10%
- **Actions**:
  - Email: AI team
  - Slack: #ai-alerts
  - PagerDuty: Critical only

#### Authentication Failures
- **Condition**: Failed login attempts > 20 per minute
- **Threshold**:
  - Warning: > 10 per minute
  - Critical: > 20 per minute
- **Actions**:
  - Email: security team
  - Slack: #security-alerts

#### Study Session Failures
- **Condition**: Study session completion rate < 80%
- **Threshold**:
  - Warning: < 85%
  - Critical: < 80%
- **Actions**:
  - Email: product team
  - Slack: #product-alerts

### 4. Infrastructure Alerts

#### Memory Usage
- **Condition**: Heap memory usage > 80%
- **Threshold**:
  - Warning: > 70%
  - Critical: > 80%
- **Actions**:
  - Slack: #infrastructure
  - Email: DevOps team

#### Circuit Breaker Triggered
- **Condition**: Circuit breaker state = OPEN
- **Actions**:
  - Email: on-call engineer
  - Slack: #critical-alerts
  - PagerDuty: Immediate

#### Rate Limiting Exceeded
- **Condition**: Rate limit rejections > 100 per minute
- **Threshold**:
  - Warning: > 50 per minute
  - Critical: > 100 per minute
- **Actions**:
  - Slack: #api-alerts
  - Email: backend team

### 5. Custom Business Metrics

#### User Engagement Drop
- **Condition**: Daily active users < 80% of 7-day average
- **Threshold**:
  - Warning: < 85% of average
  - Critical: < 80% of average
- **Actions**:
  - Email: product team
  - Slack: #product-metrics

#### Task Completion Rate Drop
- **Condition**: Task completion rate < 70%
- **Threshold**:
  - Warning: < 75%
  - Critical: < 70%
- **Actions**:
  - Email: product team
  - Slack: #product-metrics

## Alert Configuration Commands

### Using Sentry CLI

```bash
# Configure error rate alert
sentry-cli alerts rules create \
  --project studyteddy-frontend \
  --name "High Error Rate" \
  --environment production \
  --condition "event.count" \
  --condition-interval 5m \
  --condition-value 50 \
  --action email \
  --action-target dev-team@studyteddy.com

# Configure performance alert
sentry-cli alerts rules create \
  --project studyteddy-backend \
  --name "Slow API Response" \
  --environment production \
  --condition "event.duration" \
  --condition-interval 10m \
  --condition-value 2000 \
  --action slack \
  --action-target "#api-alerts"
```

### Using Sentry API

```javascript
// Create error rate alert via API
const alertRule = {
  name: "High Error Rate Alert",
  environment: "production",
  projects: ["studyteddy-frontend", "studyteddy-backend"],
  conditions: [
    {
      id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      interval: "5m",
      value: 50
    }
  ],
  actions: [
    {
      id: "sentry.rules.actions.notify_email.NotifyEmailAction",
      targetType: "Team",
      targetIdentifier: "dev-team"
    },
    {
      id: "sentry.rules.actions.notify_slack.NotifySlackAction",
      channel: "#alerts",
      workspace: "studyteddy"
    }
  ],
  filters: [
    {
      id: "sentry.rules.filters.level.LevelFilter",
      level: "40" // Error level
    }
  ]
};
```

## Notification Channels Configuration

### 1. Email Notifications

```yaml
email_teams:
  dev-team:
    - dev1@studyteddy.com
    - dev2@studyteddy.com
    - lead@studyteddy.com

  frontend-team:
    - frontend1@studyteddy.com
    - frontend2@studyteddy.com

  backend-team:
    - backend1@studyteddy.com
    - backend2@studyteddy.com

  product-team:
    - product1@studyteddy.com
    - product2@studyteddy.com

  security-team:
    - security@studyteddy.com
    - admin@studyteddy.com
```

### 2. Slack Integration

```javascript
// Slack webhook configuration
const slackChannels = {
  "#alerts": process.env.SLACK_ALERTS_WEBHOOK,
  "#performance": process.env.SLACK_PERFORMANCE_WEBHOOK,
  "#security-alerts": process.env.SLACK_SECURITY_WEBHOOK,
  "#ai-alerts": process.env.SLACK_AI_WEBHOOK,
  "#product-metrics": process.env.SLACK_PRODUCT_WEBHOOK,
  "#critical-alerts": process.env.SLACK_CRITICAL_WEBHOOK
};
```

### 3. PagerDuty Integration

```yaml
pagerduty_services:
  critical-service:
    integration_key: ${PAGERDUTY_CRITICAL_KEY}
    escalation_policy: "Critical Issues"

  performance-service:
    integration_key: ${PAGERDUTY_PERFORMANCE_KEY}
    escalation_policy: "Performance Issues"
```

## Alert Escalation Policies

### Critical Alerts (P0)
1. **Immediate**: PagerDuty notification
2. **2 minutes**: Slack notification to #critical-alerts
3. **5 minutes**: Email to on-call engineer
4. **10 minutes**: Escalate to team lead
5. **15 minutes**: Escalate to engineering manager

### High Priority Alerts (P1)
1. **Immediate**: Slack notification
2. **5 minutes**: Email to relevant team
3. **15 minutes**: Escalate to team lead if unacknowledged

### Medium Priority Alerts (P2)
1. **Immediate**: Slack notification
2. **30 minutes**: Email summary to relevant team

### Low Priority Alerts (P3)
1. **Daily digest**: Email summary
2. **Weekly report**: Trend analysis

## Alert Suppression Rules

### Maintenance Windows
```javascript
// Suppress alerts during maintenance
const maintenanceWindows = {
  weekly: {
    day: "Sunday",
    startTime: "02:00",
    endTime: "04:00",
    timezone: "UTC"
  },

  deployment: {
    // Suppress for 10 minutes after deployment
    duration: "10m",
    trigger: "deployment_event"
  }
};
```

### Flapping Prevention
```javascript
// Prevent alert flapping
const suppressionRules = {
  cooldown: "15m", // Minimum time between same alerts
  maxAlerts: 3,    // Max alerts per hour for same issue
  escalationDelay: "5m" // Wait before escalating
};
```

## Alert Testing

### Weekly Alert Test
```bash
# Test critical alert path
sentry-cli send-event \
  --project studyteddy-backend \
  --level error \
  --message "Weekly alert test" \
  --tag test:true

# Test performance alert
sentry-cli send-event \
  --project studyteddy-frontend \
  --level warning \
  --message "Performance test alert" \
  --extra duration:3000
```

### Monthly Alert Review
1. Review alert effectiveness
2. Check for false positives
3. Adjust thresholds based on trends
4. Update contact information
5. Test escalation procedures

## Metrics Dashboard URLs

### Sentry Dashboard Links
- **Error Overview**: https://studyteddy.sentry.io/dashboard/errors/
- **Performance**: https://studyteddy.sentry.io/dashboard/performance/
- **Custom Metrics**: https://studyteddy.sentry.io/dashboard/custom/

### Alert Status
- **Active Alerts**: https://studyteddy.sentry.io/alerts/
- **Alert History**: https://studyteddy.sentry.io/alerts/history/
- **Alert Rules**: https://studyteddy.sentry.io/settings/alerts/

## Environment Variables

```bash
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=studyteddy
SENTRY_PROJECT_FRONTEND=studyteddy-frontend
SENTRY_PROJECT_BACKEND=studyteddy-backend
SENTRY_AUTH_TOKEN=your-auth-token

# Notification Integrations
SLACK_ALERTS_WEBHOOK=https://hooks.slack.com/services/...
SLACK_PERFORMANCE_WEBHOOK=https://hooks.slack.com/services/...
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/...
PAGERDUTY_CRITICAL_KEY=your-pagerduty-key
PAGERDUTY_PERFORMANCE_KEY=your-pagerduty-key

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
ALERT_FROM_EMAIL=alerts@studyteddy.com
```

## Setup Checklist

- [ ] Configure Sentry projects
- [ ] Set up email notification teams
- [ ] Configure Slack webhooks
- [ ] Set up PagerDuty integration
- [ ] Create alert rules for each category
- [ ] Test notification channels
- [ ] Set up maintenance windows
- [ ] Configure suppression rules
- [ ] Schedule weekly alert tests
- [ ] Set up monthly alert reviews
- [ ] Document escalation procedures
- [ ] Train team on alert procedures