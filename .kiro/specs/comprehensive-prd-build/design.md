# Design Document

## Overview

Study Teddy is a full-stack TypeScript application that combines task management with AI-powered study assistance. The system follows a modern three-tier architecture with a React/Vite frontend, NestJS backend, and PostgreSQL database. The design consolidates all existing technical specifications into a unified architecture that leverages existing styling from the old.study folder while maintaining the established tech stack.

## Architecture

```
Frontend (React/Vite) → Backend (NestJS) → Database (PostgreSQL)
                            ↓
                      OpenAI API (GPT-3.5)
```

### High-Level Architecture Principles
- **Separation of Concerns**: Clear boundaries between presentation, business logic, and data layers
- **Scalability**: Modular design supporting horizontal scaling
- **Security**: JWT-based authentication with proper validation and rate limiting
- **Performance**: Optimized database queries and efficient API design
- **Maintainability**: TypeScript throughout with consistent coding patterns

## Components and Interfaces

### Frontend Architecture (React/Vite)

#### Core Structure
```
old.study/
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── auth/              # Authentication forms
│   │   ├── tasks/             # Task management UI
│   │   ├── ai/                # AI chat interface
│   │   └── dashboard/         # Dashboard widgets
│   ├── lib/
│   │   ├── api/               # API client functions
│   │   └── utils/             # Helper functions
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript definitions
│   └── pages/                 # Route components
```

#### Key Frontend Components

**Authentication Components**
- `LoginForm`: Email/password authentication with validation
- `RegisterForm`: User registration with form validation
- `GoogleLoginButton`: OAuth integration component
- `ProtectedRoute`: Route guard for authenticated users

**Task Management Components**
- `TaskList`: Display tasks with filtering and sorting
- `TaskCard`: Individual task display with actions
- `TaskForm`: Create/edit task modal with validation
- `CalendarView`: Calendar-based task visualization

**AI Chat Components**
- `ChatInterface`: Main chat container with message history
- `MessageList`: Scrollable message display
- `MessageInput`: Input field with send functionality

**Dashboard Components**
- `StatsCards`: Display key metrics and statistics
- `TodayTasks`: Quick view of today's tasks
- `StudyStreak`: Visual streak counter

#### Styling Integration
- Utilize existing Tailwind CSS classes from old.study
- Maintain consistent design patterns and component styling
- Leverage existing shadcn/ui component configurations
- Apply existing responsive design breakpoints

### Backend Architecture (NestJS)

#### Core Structure
```
studyteddy-backend/
├── src/
│   ├── auth/                  # Authentication module
│   ├── users/                 # User management
│   ├── tasks/                 # Task CRUD operations
│   ├── ai/                    # OpenAI integration
│   ├── dashboard/             # Analytics service
│   ├── db/                    # Database layer
│   ├── common/                # Shared utilities
│   └── config/                # Configuration modules
```

#### Module Design

**Authentication Module**
- JWT Strategy with Passport.js
- Google OAuth 2.0 integration
- Password hashing with bcrypt
- Token refresh mechanism

**Tasks Module**
- CRUD operations for study tasks
- User-scoped data access
- Priority and due date management
- Completion tracking

**AI Module**
- OpenAI GPT-3.5 integration
- Chat history management
- Rate limiting (10 req/min per user)
- Token usage tracking

**Dashboard Module**
- Statistics calculation
- Study streak computation
- Weekly overview generation
- Performance metrics

#### API Design Patterns
- RESTful endpoints with consistent naming
- Standardized response formats
- Comprehensive error handling
- OpenAPI/Swagger documentation

## Data Models

### Database Schema (PostgreSQL with Drizzle ORM)

```typescript
// Core Tables
users: {
  id: UUID (PK)
  email: string (unique)
  passwordHash: string (nullable)
  name: string
  avatarUrl: string
  authProvider: enum('local', 'google')
  googleId: string (unique, nullable)
  createdAt: timestamp
  updatedAt: timestamp
}

studyTasks: {
  id: UUID (PK)
  userId: UUID (FK → users.id)
  title: string
  subject: string
  description: text
  dueDate: timestamp
  priority: enum('low', 'medium', 'high')
  completed: boolean
  createdAt: timestamp
  updatedAt: timestamp
}

aiChats: {
  id: UUID (PK)
  userId: UUID (FK → users.id)
  message: text
  aiResponse: text
  tokensUsed: integer
  createdAt: timestamp
}

studySessions: {
  id: UUID (PK)
  userId: UUID (FK → users.id)
  taskId: UUID (FK → studyTasks.id, nullable)
  durationMinutes: integer
  date: timestamp
  createdAt: timestamp
}
```

### Data Relationships
- Users have many Tasks, AI Chats, and Study Sessions
- Tasks can have many Study Sessions
- All relationships enforce user-scoped access
- Soft deletes for audit trail maintenance

### Data Access Patterns
- Repository pattern with Drizzle ORM
- Query optimization with proper indexing
- User-scoped queries for security
- Efficient pagination for large datasets

## Error Handling

### Frontend Error Handling
- Global error boundary for React components
- API error interceptors with user-friendly messages
- Form validation with real-time feedback
- Loading states and error recovery

### Backend Error Handling
- Global exception filters
- Structured error responses
- Logging with correlation IDs
- Rate limiting with proper error codes

### Error Response Format
```typescript
{
  statusCode: number,
  message: string,
  error?: string,
  timestamp: string,
  path: string
}
```

## Testing Strategy

### Frontend Testing
- Unit tests for utility functions and hooks
- Component testing with React Testing Library
- Integration tests for API interactions
- E2E tests for critical user flows

### Backend Testing
- Unit tests for services and utilities
- Integration tests for API endpoints
- Database testing with test containers
- Authentication flow testing

### Test Coverage Goals
- Minimum 80% code coverage
- 100% coverage for critical paths (auth, payments)
- Automated testing in CI/CD pipeline

## Security Implementation

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Secure password hashing with bcrypt (10 rounds)
- Google OAuth 2.0 with proper scope validation
- Protected routes with authentication guards

### Data Security
- Input validation with class-validator
- SQL injection prevention via Drizzle ORM
- XSS protection with proper sanitization
- CORS configuration for production

### API Security
- Rate limiting (10 requests/minute for AI endpoints)
- Request size limits
- HTTPS enforcement in production
- Security headers implementation

## Performance Optimization

### Frontend Performance
- Code splitting with React.lazy
- Image optimization and lazy loading
- Efficient state management
- Memoization for expensive computations

### Backend Performance
- Database query optimization
- Connection pooling
- Caching for frequently accessed data
- Efficient pagination

### Database Performance
- Proper indexing strategy
- Query optimization
- Connection pooling (max 10 connections)
- Regular performance monitoring

## Deployment Architecture

### Infrastructure
- Frontend: Vercel (static hosting with CDN)
- Backend: Railway (containerized deployment)
- Database: Railway PostgreSQL (managed service)
- Domain: Custom domain with SSL

### Environment Configuration
```
Production:
- HTTPS enforcement
- Environment-specific secrets
- Database connection pooling
- Error monitoring

Development:
- Local PostgreSQL instance
- Hot reloading for both frontend/backend
- Debug logging enabled
```

### Monitoring & Observability
- Application performance monitoring
- Error tracking and alerting
- Database performance metrics
- API response time monitoring

## Integration Points

### OpenAI Integration
- GPT-3.5-turbo model for chat responses
- Token usage tracking and cost management
- Error handling for API failures
- Response caching for common queries

### Google OAuth Integration
- Secure credential management
- Profile data synchronization
- Account linking for existing users
- Proper scope management

### Database Integration
- Drizzle ORM for type-safe queries
- Migration management with drizzle-kit
- Connection pooling and retry logic
- Backup and recovery procedures

## Scalability Considerations

### Horizontal Scaling
- Stateless backend design
- Database connection pooling
- CDN for static assets
- Load balancing ready architecture

### Vertical Scaling
- Efficient memory usage
- Optimized database queries
- Proper caching strategies
- Resource monitoring and alerting

### Future Enhancements
- Redis for session management
- Message queues for background tasks
- Microservices architecture migration
- Advanced analytics and reporting