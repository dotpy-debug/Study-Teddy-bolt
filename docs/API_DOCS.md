# Study Teddy API Documentation

Complete API reference for the Study Teddy backend services.

## Overview

The Study Teddy API is built with NestJS 11.1.6 and provides a RESTful interface for the AI-powered study planner application.

- **Base URL**: `http://localhost:3001` (development)
- **API Prefix**: `/api`
- **Interactive Documentation**: http://localhost:3001/api/docs (Swagger UI)
- **API Schema**: http://localhost:3001/api/docs-json

## Authentication

### Overview
The API uses JWT-based authentication with optional Google OAuth integration.

### JWT Tokens
- **Access Token**: Valid for 7 days (configurable)
- **Refresh Token**: Stored securely in database with expiration tracking
- **Format**: `Bearer <token>` in Authorization header

### Authentication Endpoints

#### POST `/auth/register`
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "authProvider": "local",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### POST `/auth/login`
Authenticate existing user.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### GET `/auth/google`
Initiate Google OAuth flow.
Redirects to Google OAuth consent screen.

#### GET `/auth/google/callback`
Handle Google OAuth callback.
Processes OAuth response and creates/authenticates user.

#### POST `/auth/refresh`
Refresh expired access token.

**Request Body**:
```json
{
  "refreshToken": "refresh-token"
}
```

#### POST `/auth/logout`
Revoke refresh token and logout user.

#### GET `/auth/me`
Get current authenticated user information.

**Headers**: `Authorization: Bearer <access-token>`

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "authProvider": "local",
  "emailVerified": true
}
```

## Users API

### GET `/users/profile`
Get current user's profile information.

### PUT `/users/profile`
Update user profile information.

**Request Body**:
```json
{
  "name": "Updated Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### POST `/users/change-password`
Change user password.

**Request Body**:
```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

## Tasks API

### GET `/tasks`
Get user's study tasks with filtering and pagination.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `subject` (string): Filter by subject
- `priority` (enum): Filter by priority (low, medium, high)
- `completed` (boolean): Filter by completion status
- `dueDate` (string): Filter by due date (ISO format)
- `search` (string): Search in title and description

**Response** (200):
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Study Chapter 5",
      "description": "Review calculus fundamentals",
      "subject": "Mathematics",
      "priority": "high",
      "dueDate": "2024-01-15T00:00:00.000Z",
      "completed": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

### POST `/tasks`
Create a new study task.

**Request Body**:
```json
{
  "title": "Study Chapter 5",
  "description": "Review calculus fundamentals",
  "subject": "Mathematics",
  "priority": "high",
  "dueDate": "2024-01-15T00:00:00.000Z"
}
```

### GET `/tasks/:id`
Get specific task by ID.

### PUT `/tasks/:id`
Update existing task.

**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "medium",
  "completed": true
}
```

### DELETE `/tasks/:id`
Delete a task.

## AI Chat API

### POST `/ai/chat`
Send message to AI assistant.

**Request Body**:
```json
{
  "message": "Help me understand calculus derivatives",
  "context": {
    "subject": "Mathematics",
    "topic": "Calculus"
  }
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "message": "Help me understand calculus derivatives",
  "aiResponse": "Derivatives measure the rate of change...",
  "tokensUsed": 150,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### GET `/ai/chat/history`
Get user's chat history with pagination.

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page

## Dashboard API

### GET `/dashboard/stats`
Get user dashboard statistics.

**Response** (200):
```json
{
  "tasks": {
    "total": 25,
    "completed": 18,
    "pending": 7,
    "overdue": 2
  },
  "streak": {
    "current": 7,
    "longest": 15
  },
  "studyTime": {
    "today": 120,
    "thisWeek": 480,
    "thisMonth": 1800
  },
  "aiUsage": {
    "messagesThisMonth": 45,
    "tokensUsed": 12500
  }
}
```

### GET `/dashboard/recent-activity`
Get recent user activity.

## Study Sessions API

### POST `/study-sessions`
Start a new study session.

**Request Body**:
```json
{
  "taskId": "uuid",
  "plannedDuration": 60
}
```

### PUT `/study-sessions/:id/complete`
Complete a study session.

**Request Body**:
```json
{
  "actualDuration": 55,
  "notes": "Completed successfully"
}
```

### GET `/study-sessions`
Get user's study sessions with filtering.

## Notifications API

### GET `/notifications`
Get user notifications.

**Query Parameters**:
- `read` (boolean): Filter by read status
- `type` (enum): Filter by notification type
- `page`, `limit`: Pagination

### PUT `/notifications/:id/read`
Mark notification as read.

### POST `/notifications/mark-all-read`
Mark all notifications as read.

### GET `/notifications/preferences`
Get user notification preferences.

### PUT `/notifications/preferences`
Update notification preferences.

## Subjects API

### GET `/subjects`
Get available subjects.

### POST `/subjects`
Create custom subject.

**Request Body**:
```json
{
  "name": "Advanced Physics",
  "description": "Graduate level physics",
  "color": "#FF5722"
}
```

## Analytics API

### GET `/analytics/study-patterns`
Get user study pattern analytics.

### GET `/analytics/performance`
Get performance metrics and trends.

## Rate Limiting

The API implements tiered rate limiting:

### Global Rate Limits
- **General Endpoints**: 100 requests per minute
- **Authentication**: 10 requests per minute per IP

### AI Endpoint Limits (per user)
- **Chat**: 10 requests per minute
- **Practice Questions**: 5 requests per minute
- **Study Plans**: 3 requests per minute
- **Heavy Operations**: 2 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641024000
```

## Error Handling

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Validation Error
- **429**: Rate Limit Exceeded
- **500**: Internal Server Error

### Common Error Types

#### Validation Errors (422)
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ]
}
```

#### Authentication Errors (401)
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### Rate Limit Errors (429)
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "ThrottlerException"
}
```

## WebSocket Events

### Real-time Features
The API supports WebSocket connections for real-time features:

- **Connection**: `/socket.io`
- **Namespace**: `/study-sessions`

### Events

#### Client → Server
- `join-session`: Join a study session room
- `start-session`: Start tracking time
- `pause-session`: Pause session
- `end-session`: End session

#### Server → Client
- `session-started`: Session started confirmation
- `session-updated`: Session progress update
- `session-ended`: Session completion notification
- `notification`: Real-time notifications

## Security Features

### Input Validation
- All inputs validated using class-validator
- SQL injection protection via parameterized queries
- XSS protection through input sanitization

### Authentication Security
- Password hashing using bcrypt (cost factor: 12)
- JWT secret rotation support
- Refresh token revocation

### API Security
- CORS configuration for trusted origins
- Helmet.js security headers
- Request size limits
- File upload restrictions

## Development Tools

### API Testing
```bash
# Health check
curl http://localhost:3001/health

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test protected endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/auth/me
```

### Database Inspection
```bash
# Open Drizzle Studio
pnpm db:studio

# View API documentation
open http://localhost:3001/api/docs
```

## OpenAPI Specification

The complete API specification is available at:
- **Swagger UI**: http://localhost:3001/api/docs
- **JSON Schema**: http://localhost:3001/api/docs-json
- **YAML Schema**: http://localhost:3001/api/docs-yaml

The OpenAPI specification includes:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Error response formats

## SDK and Client Libraries

### JavaScript/TypeScript
```typescript
import { StudyTeddyAPI } from '@studyteddy/api-client';

const api = new StudyTeddyAPI({
  baseURL: 'http://localhost:3001',
  apiKey: 'your-api-key'
});

// Get tasks
const tasks = await api.tasks.list({
  subject: 'Mathematics',
  priority: 'high'
});

// Create task
const newTask = await api.tasks.create({
  title: 'Study Chapter 5',
  subject: 'Mathematics',
  priority: 'high',
  dueDate: new Date('2024-01-15')
});
```

## API Changelog

### Version 1.0.0 (Current)
- Initial API release
- Core authentication and task management
- AI chat integration
- Real-time study sessions
- Dashboard analytics

### Planned Features
- Bulk task operations
- Advanced AI study plan generation
- Collaborative study groups
- Third-party integrations (Google Calendar, Notion)
- Mobile app API optimizations

## Support

For API support:
- Check the interactive documentation at `/api/docs`
- Review this documentation
- Search existing GitHub issues
- Create a new issue with API reproduction steps