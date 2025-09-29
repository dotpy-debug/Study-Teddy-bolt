# Resend Email Service

A comprehensive email service for Study Teddy built with Resend, featuring templates, queuing, tracking, and rate limiting.

## Features

### ✨ Core Features
- **Multiple Email Templates**: Welcome, verification, password reset, study reminders, etc.
- **HTML & Text Templates**: Full Handlebars template support with rich HTML designs
- **Email Queuing**: Background processing with Redis and BullMQ
- **Rate Limiting**: Per-user and global rate limiting to prevent abuse
- **Email Tracking**: Open and click tracking with detailed analytics
- **Batch Sending**: Efficiently send multiple emails with rate limiting
- **Email Scheduling**: Schedule emails for future delivery
- **Unsubscribe Management**: Handle unsubscribe requests and suppression lists
- **Domain Verification**: Check domain verification status
- **Webhook Support**: Handle Resend webhook events for real-time tracking

### 📧 Available Email Templates
1. **Welcome Email** - Onboard new users with feature highlights
2. **Email Verification** - Verify user email addresses
3. **Password Reset** - Secure password reset flow
4. **Study Reminder** - Remind users about upcoming study tasks
5. **Task Deadline** - Alert users about approaching deadlines
6. **Achievement Notification** - Celebrate user achievements
7. **Weekly Summary** - Comprehensive weekly study analytics
8. **Focus Session Summary** - Post-session performance reports

## Setup

### 1. Install Dependencies
Ensure Resend is installed (already in package.json):
```bash
bun install resend
```

### 2. Environment Configuration
Add these variables to your `.env` file:

```bash
# Resend API Configuration
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL="Study Teddy" <noreply@yourdomain.com>
RESEND_WEBHOOK_SECRET=your-webhook-secret

# Email Configuration
EMAIL_TEMPLATE_CACHE=true
EMAIL_BATCH_SIZE=10
EMAIL_QUEUE_CONCURRENCY=5

# Rate Limiting
EMAIL_HOURLY_LIMIT=100
EMAIL_DAILY_LIMIT=1000
EMAIL_BURST_LIMIT=10

# Tracking
EMAIL_TRACKING_ENABLED=true
EMAIL_CLICK_TRACKING_ENABLED=true
EMAIL_OPEN_TRACKING_ENABLED=true
```

### 3. Redis Setup (Required for Queuing)
Ensure Redis is running for email queuing:
```bash
# Local Redis
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. Import the Module
```typescript
import { ResendEmailModule } from './modules/email/resend-email.module';

@Module({
  imports: [
    ResendEmailModule,
    // ... other modules
  ],
})
export class AppModule {}
```

## Usage

### Basic Email Sending

```typescript
import { ResendService } from './modules/email/resend.service';

@Injectable()
export class UserService {
  constructor(private readonly resendService: ResendService) {}

  async sendWelcomeEmail(user: User) {
    await this.resendService.sendWelcomeEmail(user.email, {
      name: user.name,
      email: user.email,
      loginLink: 'https://app.studyteddy.com/login',
    });
  }
}
```

### Template-Based Emails

```typescript
// Send study reminder
await this.resendService.sendStudyReminderEmail(user.email, {
  name: user.name,
  taskTitle: 'Complete Math Assignment',
  taskDescription: 'Finish exercises 1-10',
  dueDate: '2024-01-15 at 3:00 PM',
  priority: 'high',
  subject: 'Mathematics',
});

// Send achievement notification
await this.resendService.sendAchievementEmail(user.email, {
  name: user.name,
  achievementTitle: 'Study Streak Master',
  achievementDescription: 'Completed 30 days of continuous studying!',
  pointsEarned: 500,
  achievementDate: new Date(),
  rarity: 'rare',
});
```

## Complete File Structure

```
src/modules/email/
├── README.md
├── resend.service.ts                    # Main Resend service
├── resend-email.module.ts              # Module configuration
├── types/
│   └── email.types.ts                  # TypeScript interfaces
├── services/
│   ├── email-template.service.ts       # Template rendering
│   ├── email-queue.service.ts          # Background processing
│   ├── email-tracking.service.ts       # Open/click tracking
│   └── rate-limiting.service.ts        # Rate limiting logic
├── controllers/
│   └── email.controller.ts            # REST API endpoints
├── processors/
│   └── email.processor.ts             # Queue job processing
└── templates/
    ├── welcome.html & .txt
    ├── email-verification.html & .txt
    ├── password-reset.html & .txt
    ├── study-reminder.html & .txt
    ├── task-deadline.html & .txt
    ├── achievement.html & .txt
    ├── weekly-summary.html & .txt
    └── focus-session-summary.html & .txt
```

## Environment Variables Added

All necessary environment variables have been added to `.env.example` with proper documentation and defaults.

This comprehensive implementation provides everything you need for professional email handling in your Study Teddy application!