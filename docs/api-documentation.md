# Study Teddy API Documentation

## Overview

The Study Teddy API is a RESTful service built with NestJS that provides authentication, task management, AI assistance, and analytics features. This documentation complements the interactive Swagger documentation available at `/api/docs`.

## Base URL

- **Development:** `http://localhost:3001/api`
- **Production:** `https://api.studyteddy.com/api`

## Authentication

### JWT Token Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle

- **Access Token Expiration:** 7 days
- **Refresh Token Expiration:** 30 days
- **Token Refresh:** Use the `/auth/refresh` endpoint

## API Endpoints Overview

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/google` | Google OAuth login | No |
| POST | `/auth/refresh` | Refresh JWT token | No |
| POST | `/auth/logout` | User logout | Yes |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### User Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get user profile | Yes |
| PUT | `/users/profile` | Update user profile | Yes |
| GET | `/users/preferences` | Get user preferences | Yes |
| PUT | `/users/preferences` | Update user preferences | Yes |
| PUT | `/users/privacy` | Update privacy settings | Yes |
| PUT | `/users/change-password` | Change password | Yes |
| DELETE | `/users/account` | Delete user account | Yes |
| GET | `/users/stats` | Get user statistics | Yes |
| GET | `/users/activity-export` | Export user data | Yes |

### Task Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tasks` | Get user tasks (with filters) | Yes |
| GET | `/tasks/today` | Get today's tasks | Yes |
| GET | `/tasks/:id` | Get specific task | Yes |
| POST | `/tasks` | Create new task | Yes |
| PUT | `/tasks/:id` | Update task | Yes |
| PATCH | `/tasks/:id/complete` | Toggle task completion | Yes |
| DELETE | `/tasks/:id` | Delete task | Yes |
| GET | `/tasks/calendar/:year/:month` | Get calendar view | Yes |
| POST | `/tasks/bulk-update` | Bulk update tasks | Yes |

### AI Assistant Endpoints

| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| POST | `/ai/chat` | Send message to AI | Yes | 10/min |
| GET | `/ai/history` | Get chat history | Yes | - |
| POST | `/ai/practice-questions` | Generate practice questions | Yes | 10/min |
| POST | `/ai/explain-concept` | Get concept explanation | Yes | 10/min |
| DELETE | `/ai/history/:id` | Delete chat message | Yes | - |
| POST | `/ai/feedback` | Provide AI response feedback | Yes | - |

### Dashboard & Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard/stats` | Get dashboard statistics | Yes |
| GET | `/dashboard/streak` | Get study streak info | Yes |
| GET | `/dashboard/weekly-overview` | Get weekly overview | Yes |
| GET | `/dashboard/analytics` | Get detailed analytics | Yes |
| GET | `/dashboard/goals` | Get study goals | Yes |
| POST | `/dashboard/goals` | Set study goals | Yes |

### Notification Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | Get user notifications | Yes |
| GET | `/notifications/unread-count` | Get unread count | Yes |
| GET | `/notifications/preferences` | Get notification preferences | Yes |
| PUT | `/notifications/preferences` | Update notification preferences | Yes |
| PATCH | `/notifications/:id/read` | Mark notification as read | Yes |
| POST | `/notifications/mark-all-read` | Mark all as read | Yes |
| DELETE | `/notifications/:id` | Delete notification | Yes |

## Request/Response Formats

### Standard Response Format

All API responses follow this consistent format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": [
      {
        "property": "email",
        "value": "invalid-email",
        "constraints": {
          "isEmail": "email must be a valid email"
        }
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  authProvider: 'local' | 'google';
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    deadlineReminders: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    shareProgress: boolean;
  };
}
```

### Task Model

```typescript
interface Task {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  estimatedDuration?: number; // minutes
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### AI Chat Model

```typescript
interface AIChat {
  id: string;
  userId: string;
  message: string;
  aiResponse: string;
  tokensUsed: number;
  conversationId?: string;
  createdAt: string;
}
```

### Dashboard Statistics Model

```typescript
interface DashboardStats {
  tasksCompletedToday: number;
  currentStreak: number;
  weeklyOverview: {
    completed: number;
    total: number;
    completionRate: number;
  };
  upcomingDeadlines: Task[];
  subjectBreakdown: {
    subject: string;
    completed: number;
    total: number;
  }[];
  productivityTrends: {
    date: string;
    tasksCompleted: number;
    studyTime: number;
  }[];
}
```

## Query Parameters

### Task Filtering

```
GET /tasks?subject=math&priority=high&completed=false&limit=20&offset=0
```

**Available Parameters:**
- `subject`: Filter by subject
- `priority`: Filter by priority (low, medium, high)
- `completed`: Filter by completion status (true, false)
- `dueDate`: Filter by due date (ISO string)
- `tags`: Filter by tags (comma-separated)
- `search`: Search in title and description
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (dueDate, priority, createdAt)
- `sortOrder`: Sort direction (asc, desc)

### AI Chat History

```
GET /ai/history?limit=50&offset=0&conversationId=uuid
```

**Available Parameters:**
- `limit`: Number of messages (default: 50, max: 100)
- `offset`: Pagination offset
- `conversationId`: Filter by conversation
- `startDate`: Filter from date
- `endDate`: Filter to date

## Rate Limiting

### General Endpoints
- **Limit:** 100 requests per 15 minutes per user
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### AI Endpoints
- **Limit:** 10 requests per minute per user
- **Applies to:** `/ai/chat`, `/ai/practice-questions`, `/ai/explain-concept`

### Authentication Endpoints
- **Limit:** 5 requests per minute per IP
- **Applies to:** `/auth/login`, `/auth/register`, `/auth/forgot-password`

## Error Codes

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Custom Error Codes

| Code | Description |
|------|-------------|
| `AUTH_001` | Invalid credentials |
| `AUTH_002` | Token expired |
| `AUTH_003` | Account not verified |
| `TASK_001` | Task not found |
| `TASK_002` | Task belongs to different user |
| `AI_001` | AI service unavailable |
| `AI_002` | Rate limit exceeded |
| `USER_001` | User not found |
| `USER_002` | Email already exists |

## SDK and Client Libraries

### JavaScript/TypeScript

```bash
npm install @studyteddy/api-client
```

```typescript
import { StudyTeddyClient } from '@studyteddy/api-client';

const client = new StudyTeddyClient({
  baseURL: 'https://api.studyteddy.com/api',
  token: 'your-jwt-token'
});

// Get user tasks
const tasks = await client.tasks.getAll({
  subject: 'math',
  completed: false
});

// Send AI message
const response = await client.ai.chat({
  message: 'Explain photosynthesis'
});
```

### Python

```bash
pip install studyteddy-api
```

```python
from studyteddy import StudyTeddyClient

client = StudyTeddyClient(
    base_url='https://api.studyteddy.com/api',
    token='your-jwt-token'
)

# Get user tasks
tasks = client.tasks.get_all(subject='math', completed=False)

# Send AI message
response = client.ai.chat(message='Explain photosynthesis')
```

## Webhooks

### Available Events

- `task.created`
- `task.completed`
- `task.overdue`
- `user.streak.milestone`
- `ai.chat.created`

### Webhook Payload

```json
{
  "event": "task.completed",
  "data": {
    "task": { /* Task object */ },
    "user": { /* User object */ }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "signature": "sha256=..."
}
```

## Testing

### Postman Collection

Download our Postman collection: [Study Teddy API.postman_collection.json](./postman/Study%20Teddy%20API.postman_collection.json)

### Test Environment

- **Base URL:** `https://api-staging.studyteddy.com/api`
- **Test User:** `test@studyteddy.com` / `TestPass123!`

### Sample Requests

#### Create a Task

```bash
curl -X POST https://api.studyteddy.com/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Study calculus derivatives",
    "subject": "mathematics",
    "description": "Review chapter 3 and complete practice problems",
    "dueDate": "2024-01-20T18:00:00.000Z",
    "priority": "high",
    "estimatedDuration": 120,
    "tags": ["calculus", "homework"]
  }'
```

#### Send AI Message

```bash
curl -X POST https://api.studyteddy.com/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you explain the concept of derivatives in calculus?",
    "conversationId": "optional-conversation-id"
  }'
```

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Authentication with JWT and Google OAuth
- Task management CRUD operations
- AI chat integration with OpenAI
- Dashboard and analytics endpoints
- User profile and preferences management

### Upcoming Features
- Real-time notifications via WebSocket
- File upload for task attachments
- Study group collaboration features
- Advanced analytics and reporting
- Mobile app API extensions

## Support

### Documentation
- **Interactive API Docs:** `/api/docs` (Swagger UI)
- **Postman Collection:** Available in the `/docs/postman/` directory
- **SDK Documentation:** See individual SDK repositories

### Getting Help
- **Email:** api-support@studyteddy.com
- **GitHub Issues:** [studyteddy/api-issues](https://github.com/studyteddy/api-issues)
- **Developer Forum:** [forum.studyteddy.com](https://forum.studyteddy.com)

### SLA
- **Uptime:** 99.9% availability
- **Response Time:** < 200ms for 95% of requests
- **Support Response:** < 24 hours for API issues

---

*Last updated: [Current Date]*
*API Version: 1.0.0*