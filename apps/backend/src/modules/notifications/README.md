# Enhanced Notifications System

A comprehensive notification system for the Study Teddy backend that supports multiple delivery channels, templates, scheduling, and real-time updates.

## Features

### Core Features
- ✅ **Multiple Notification Types**: info, success, warning, error, reminder, achievement
- ✅ **Categories**: study, task, goal, session, system, social, reminder
- ✅ **Priority Levels**: low, medium, high, urgent
- ✅ **Read/Unread Status Tracking**
- ✅ **Archive Functionality**
- ✅ **Bulk Operations**

### Advanced Features
- ✅ **Multi-Channel Delivery**: in-app, email, push, SMS, WebSocket
- ✅ **Real-time WebSocket Delivery**
- ✅ **Email Integration**
- ✅ **Push Notification Support**
- ✅ **User Preferences per Channel/Category**
- ✅ **Notification Templates with Variables**
- ✅ **Scheduled Notifications with Recurring Support**
- ✅ **Batch Notifications**
- ✅ **Quiet Hours Support**
- ✅ **Comprehensive Statistics**

## Architecture

### Database Schema
The system uses an enhanced database schema with the following tables:

#### Core Tables
- `notifications_enhanced` - Main notification records
- `notification_templates` - Reusable notification templates
- `notification_preferences` - User-specific preferences
- `push_subscriptions` - Web push subscription data
- `notification_deliveries` - Delivery tracking and status
- `scheduled_notifications` - Scheduled and recurring notifications
- `notification_batches` - Batch operation tracking

#### Key Enums
- `notification_type` - info, success, warning, error, reminder, achievement
- `notification_category` - study, task, goal, session, system, social, reminder
- `notification_priority` - low, medium, high, urgent
- `notification_status` - pending, sent, delivered, failed, read, archived
- `notification_channel` - in_app, email, push, sms, websocket

### Service Architecture
```
NotificationsService (main service)
├── NotificationsRepository (data access)
├── NotificationSchedulerService (cron jobs & scheduling)
├── NotificationsGateway (WebSocket real-time)
└── EmailService (email delivery)
```

## API Endpoints

### Enhanced Controller (`/notifications/enhanced`)

#### Core Operations
- `POST /` - Create notification
- `GET /` - Get notifications with advanced filtering
- `GET /:id` - Get notification by ID
- `DELETE /:id` - Delete notification
- `DELETE /` - Clear all notifications

#### Bulk Operations
- `POST /bulk-operation` - Perform bulk operations
- `POST /mark-read` - Mark notifications as read
- `POST /mark-all-read` - Mark all as read
- `POST /archive` - Archive notifications

#### Statistics
- `GET /statistics/overview` - Get comprehensive stats
- `GET /count/unread` - Get unread count

#### Preferences
- `GET /preferences` - Get user preferences
- `PATCH /preferences` - Update preferences

#### Templates
- `GET /templates` - Get all templates
- `POST /templates` - Create template
- `GET /templates/:id` - Get template by ID
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template

#### Push Notifications
- `GET /push/subscription` - Get subscription status
- `POST /push/subscribe` - Subscribe to push
- `DELETE /push/subscription` - Unsubscribe
- `POST /push/test` - Send test push

#### Scheduled Notifications
- `GET /scheduled` - Get scheduled notifications
- `POST /scheduled` - Schedule notification
- `PUT /scheduled/:id` - Update scheduled notification
- `DELETE /scheduled/:id` - Cancel scheduled notification

#### Batch Operations
- `POST /batch` - Send batch notifications
- `GET /batch/:id/status` - Get batch status

#### Testing
- `POST /test` - Send test notification

## Usage Examples

### Creating a Basic Notification
```typescript
const notification = await notificationsService.createNotification(userId, {
  title: 'Task Due Soon',
  message: 'Your assignment is due in 2 hours',
  type: NotificationType.REMINDER,
  category: NotificationCategory.TASK,
  priority: NotificationPriority.HIGH,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  metadata: {
    actionUrl: '/tasks/123',
    actionText: 'View Task'
  }
});
```

### Creating a Template-Based Notification
```typescript
const notification = await notificationsService.createNotification(userId, {
  title: '', // Will be filled by template
  message: '', // Will be filled by template
  type: NotificationType.REMINDER,
  category: NotificationCategory.TASK,
  priority: NotificationPriority.HIGH,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  templateId: 'task-due-reminder',
  templateVariables: {
    taskName: 'Mathematics Assignment',
    dueDate: '2024-01-15',
    userName: 'John Doe'
  }
});
```

### Scheduling a Recurring Notification
```typescript
const scheduled = await notificationsService.scheduleNotification(userId, {
  title: 'Weekly Study Reminder',
  message: 'Time for your weekly study session!',
  type: NotificationType.REMINDER,
  category: NotificationCategory.STUDY,
  priority: NotificationPriority.MEDIUM,
  channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
  scheduledAt: new Date('2024-01-15T10:00:00Z'),
  timezone: 'America/New_York',
  recurring: {
    interval: 'weekly',
    daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
    endDate: '2024-12-31',
    maxOccurrences: 50
  }
});
```

### Sending Batch Notifications
```typescript
const batch = await notificationsService.sendBatchNotifications({
  name: 'Weekly Study Reminders',
  description: 'Sending weekly reminders to all active users',
  templateId: 'weekly-reminder',
  userIds: ['user1', 'user2', 'user3'],
  templateVariables: {
    weekNumber: '1',
    companyName: 'Study Teddy'
  }
});
```

### Updating User Preferences
```typescript
await notificationsService.updatePreferences(userId, {
  emailEnabled: true,
  pushEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'America/New_York',
  categories: {
    [NotificationCategory.STUDY]: {
      enabled: true,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.MEDIUM
    },
    [NotificationCategory.TASK]: {
      enabled: true,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH
    }
  }
});
```

## WebSocket Integration

### Client Connection
```javascript
const socket = io('/notifications', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for new notifications
socket.on('new-notification', (notification) => {
  console.log('New notification:', notification);
});

// Listen for unread count updates
socket.on('unread-count-updated', (data) => {
  console.log('Unread count:', data.count);
});
```

### WebSocket Events

#### Client → Server
- `subscribe-to-notifications` - Subscribe to specific categories/types
- `unsubscribe-from-notifications` - Unsubscribe from categories/types
- `mark-notification-read` - Mark notification as read
- `get-connection-info` - Get connection information

#### Server → Client
- `new-notification` - New notification received
- `notification-read` - Notification marked as read
- `notifications-marked-read` - Multiple notifications marked as read
- `all-notifications-read` - All notifications marked as read
- `notification-deleted` - Notification deleted
- `notifications-cleared` - All notifications cleared
- `notifications-archived` - Notifications archived
- `bulk-operation-completed` - Bulk operation completed
- `unread-count-updated` - Unread count changed

## Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:noreply@studyteddy.com

# Email Configuration (handled by EmailService)
SUPPORT_EMAIL=support@studyteddy.com
```

### Module Import
```typescript
// For basic notifications (backward compatible)
import { NotificationsModule } from './modules/notifications/notifications.module';

// For enhanced notifications (recommended)
import { EnhancedNotificationsModule } from './modules/notifications/enhanced-notifications.module';

@Module({
  imports: [
    // ... other modules
    EnhancedNotificationsModule,
  ],
})
export class AppModule {}
```

## Dependencies

### Required Packages
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "@nestjs/schedule": "^3.0.0",
  "@nestjs/event-emitter": "^2.0.0",
  "@nestjs/jwt": "^10.0.0",
  "socket.io": "^4.7.0",
  "web-push": "^3.6.0",
  "cron": "^3.0.0",
  "drizzle-orm": "^0.28.0"
}
```

## Monitoring and Statistics

The system provides comprehensive monitoring through:

### Service Statistics
```typescript
const stats = await notificationsService.getNotificationStats(userId);
// Returns: total, unread, byType, byCategory, byPriority, byStatus, deliveryRate, etc.
```

### WebSocket Statistics
```typescript
const wsStats = notificationsGateway.getConnectionStats();
// Returns: totalConnections, uniqueUsers, averageConnectionsPerUser, etc.
```

### Scheduler Statistics
```typescript
const schedulerStats = notificationSchedulerService.getSchedulerStats();
// Returns: totalCronJobs, notificationJobs, activeJobs, etc.
```

## Best Practices

1. **Use Templates**: Create reusable templates for common notification types
2. **Set Appropriate Priorities**: Use priority levels to control delivery urgency
3. **Respect Quiet Hours**: Configure quiet hours to avoid disturbing users
4. **Monitor Delivery**: Track delivery status and handle failures gracefully
5. **Batch Operations**: Use bulk operations for better performance
6. **WebSocket Fallback**: Always store notifications in database as WebSocket fallback
7. **Error Handling**: Implement proper error handling for all delivery channels
8. **Rate Limiting**: Consider implementing rate limiting for notification creation

## Migration from Legacy System

The enhanced system maintains backward compatibility with the existing notification controller. To migrate:

1. Keep existing endpoints working by using both controllers
2. Gradually migrate to new enhanced endpoints
3. Update frontend to use new WebSocket events
4. Implement enhanced features progressively

## Security Considerations

1. **Authentication**: All WebSocket connections require valid JWT tokens
2. **Authorization**: Users can only access their own notifications
3. **Input Validation**: All DTOs include comprehensive validation
4. **SQL Injection**: Use parameterized queries via Drizzle ORM
5. **XSS Protection**: Sanitize notification content before display
6. **Rate Limiting**: Implement rate limiting on notification creation endpoints

## Future Enhancements

- [ ] SMS delivery integration
- [ ] Rich media notifications (images, videos)
- [ ] Notification analytics dashboard
- [ ] A/B testing for notification content
- [ ] Machine learning for optimal delivery timing
- [ ] Integration with external services (Slack, Discord, etc.)
- [ ] Notification campaigns
- [ ] User engagement scoring