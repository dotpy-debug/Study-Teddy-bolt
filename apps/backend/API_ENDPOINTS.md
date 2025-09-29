# Study Teddy Backend API Endpoints

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://api.studyteddy.com/api`

## Authentication
All endpoints (except auth endpoints) require JWT Bearer token in header:
```
Authorization: Bearer <jwt_token>
```

---

## 🔐 Authentication Module

### POST /api/auth/register
Register a new user account

### POST /api/auth/login
Login with email and password

### GET /api/auth/google
Initiate Google OAuth flow

### GET /api/auth/google/callback
Google OAuth callback

### POST /api/auth/refresh
Refresh JWT token

### GET /api/auth/me
Get current authenticated user

---

## 📚 Subjects Module

### GET /api/subjects
Get all subjects for the user
- Query params: `?search=math&color=blue&archived=false`

### POST /api/subjects
Create a new subject
```json
{
  "name": "Mathematics",
  "color": "#FF5733",
  "icon": "calculator",
  "description": "Advanced calculus and statistics"
}
```

### PATCH /api/subjects/:id
Update a subject

### DELETE /api/subjects/:id
Delete a subject

### GET /api/subjects/:id/stats
Get subject statistics and analytics

---

## ✅ Tasks Module

### GET /api/tasks
Get all tasks with filtering
- Query params: `?status=pending&priority=high&subjectId=uuid&dueDate=2024-01-20`

### POST /api/tasks
Create a new task
```json
{
  "title": "Complete Chapter 5",
  "description": "Read and summarize key concepts",
  "subjectId": "uuid",
  "dueDate": "2024-01-20T10:00:00Z",
  "priority": "high",
  "estimatedMinutes": 60
}
```

### PATCH /api/tasks/:id
Update a task

### DELETE /api/tasks/:id
Delete a task

### PATCH /api/tasks/:id/complete
Toggle task completion status

### GET /api/tasks/today
Get today's tasks

---

## 📝 Subtasks Module

### POST /api/subtasks
Create a subtask
```json
{
  "taskId": "uuid",
  "title": "Review notes",
  "order": 1
}
```

### GET /api/subtasks/task/:taskId
Get all subtasks for a task

### PATCH /api/subtasks/:id
Update a subtask

### DELETE /api/subtasks/:id
Delete a subtask

### PATCH /api/subtasks/:id/complete
Toggle subtask completion

### PATCH /api/subtasks/:id/reorder
Change subtask order position

---

## 🎯 Focus Sessions Module

### POST /api/focus/start
Start a new focus session
```json
{
  "taskId": "uuid",
  "duration": 25,
  "type": "pomodoro",
  "distractionBlocking": true
}
```

### POST /api/focus/stop
Stop the current focus session
```json
{
  "productivityRating": 4,
  "focusRating": 5,
  "notes": "Completed section 1"
}
```

### POST /api/focus/schedule
Schedule a future focus session
```json
{
  "taskId": "uuid",
  "startTime": "2024-01-20T14:00:00Z",
  "duration": 60,
  "recurrence": "daily"
}
```

### GET /api/focus/current
Get current active focus session

### GET /api/focus/scheduled
Get scheduled focus sessions

### GET /api/focus/history
Get focus session history

### PATCH /api/focus/:id
Update a scheduled session

### DELETE /api/focus/:id
Cancel a scheduled session

### POST /api/focus/:id/extend
Extend current session by X minutes

---

## 🤖 AI Module

### POST /api/ai/chat
Chat with Teddy AI
```json
{
  "message": "Explain quantum physics",
  "context": "physics_help"
}
```

### POST /api/ai/taskify
Convert natural language to task
```json
{
  "input": "I need to finish my math homework by Friday and study for chemistry test next week"
}
```

### POST /api/ai/breakdown
Break down task into subtasks
```json
{
  "taskId": "uuid",
  "maxSubtasks": 5
}
```

### POST /api/ai/tutor
Get AI tutoring assistance
```json
{
  "subject": "Mathematics",
  "topic": "Calculus",
  "question": "How do I find derivatives?",
  "difficulty": "intermediate"
}
```

### GET /api/ai/history
Get AI chat history

### DELETE /api/ai/history/:id
Delete a chat message

### POST /api/ai/practice-questions
Generate practice questions

### POST /api/ai/study-plan
Generate personalized study plan

### GET /api/ai/stats
Get AI usage statistics

---

## 📅 Calendar Module

### POST /api/calendar/connect
Connect calendar service (Google/Outlook)
```json
{
  "provider": "google",
  "authCode": "oauth_code",
  "twoWaySync": true
}
```

### GET /api/calendar/status
Get calendar connection status

### POST /api/calendar/schedule
Schedule task/session to calendar
```json
{
  "eventType": "task",
  "taskId": "uuid",
  "title": "Study Session",
  "startTime": "2024-01-20T14:00:00Z",
  "endTime": "2024-01-20T15:00:00Z"
}
```

### POST /api/calendar/sync
Sync calendar events with tasks

### GET /api/calendar/events
Get calendar events

### POST /api/calendar/import
Import calendar events as tasks

### DELETE /api/calendar/disconnect
Disconnect calendar service

### GET /api/calendar/availability
Get user availability from calendar

### POST /api/calendar/smart-schedule
AI-powered optimal time slot finding

---

## 🔔 Notifications Module

### GET /api/notifications
Get user notifications
- Query params: `?isRead=false&type=task_reminder&page=1&limit=20`

### POST /api/notifications/read
Mark notifications as read
```json
{
  "notificationIds": ["uuid1", "uuid2"]
}
```

### POST /api/notifications/read-all
Mark all notifications as read

### DELETE /api/notifications/:id
Delete a notification

### DELETE /api/notifications
Clear all notifications

### GET /api/notifications/unread-count
Get unread notification count

### GET /api/notifications/preferences
Get notification preferences

### PATCH /api/notifications/preferences
Update notification preferences
```json
{
  "enabled": true,
  "channels": {
    "inApp": true,
    "email": true,
    "push": true
  },
  "types": {
    "taskReminders": true,
    "sessionReminders": true
  }
}
```

### POST /api/notifications/subscription
Subscribe to push notifications

### DELETE /api/notifications/subscription
Unsubscribe from push notifications

---

## 📊 Analytics Module

### GET /api/analytics
Get comprehensive analytics
- Query params: `?range=last_30_days`

### GET /api/analytics/overview
Get performance overview

### GET /api/analytics/productivity
Get productivity metrics

### GET /api/analytics/subjects
Get subject-wise analytics

### GET /api/analytics/subjects/:subjectId
Get specific subject analytics

### GET /api/analytics/time-distribution
Analyze time distribution

### GET /api/analytics/focus-patterns
Analyze focus patterns

### GET /api/analytics/completion-rates
Get task completion rates

### GET /api/analytics/streaks
Get study streak information

### GET /api/analytics/goals
Get goal completion analytics

### GET /api/analytics/insights
Get AI-powered insights

### GET /api/analytics/export
Export analytics data
- Query params: `?format=csv&range=this_month`

### GET /api/analytics/comparisons
Compare performance across periods

---

## 👤 Users Module

### GET /api/users/profile
Get user profile

### PATCH /api/users/profile
Update user profile

### POST /api/users/avatar
Upload user avatar

### DELETE /api/users/avatar
Delete user avatar

### PATCH /api/users/preferences
Update user preferences

### POST /api/users/change-password
Change password

### DELETE /api/users/account
Delete user account

---

## 🏆 Gamification Module

### GET /api/gamification/points
Get user points and level

### GET /api/gamification/achievements
Get user achievements

### GET /api/gamification/leaderboard
Get leaderboard

### GET /api/gamification/challenges
Get available challenges

### POST /api/gamification/challenges/:id/join
Join a challenge

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Rate Limiting

- AI endpoints: 10 requests/minute
- Analytics export: 5 requests/minute
- General API: 100 requests/minute

## WebSocket Events

### Connection
```javascript
socket.connect('wss://api.studyteddy.com', {
  auth: { token: 'jwt_token' }
});
```

### Events
- `notification:new` - New notification
- `focus:tick` - Focus session timer tick
- `task:updated` - Task updated
- `achievement:unlocked` - Achievement unlocked