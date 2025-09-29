---
inclusion: always
---

# Study Teddy - Product Guidelines

Study Teddy is an AI-powered study planner combining task management with an AI study assistant for students.

## Core Product Principles
- **Simplicity First**: Keep interfaces clean and intuitive for students of all levels
- **AI-Enhanced Learning**: Every feature should leverage AI to improve the study experience
- **Progress Tracking**: Make study progress visible and motivating through analytics
- **Unified Experience**: Seamlessly integrate planning and AI assistance in one platform

## Feature Implementation Rules

### Study Planner Requirements
- All tasks must have: title, description, dueDate, subject, priority, status
- Use enum values for priority: LOW, MEDIUM, HIGH, URGENT
- Use enum values for status: PENDING, IN_PROGRESS, COMPLETED, OVERDUE
- Implement soft delete (deletedAt timestamp) instead of hard delete
- Always include user ownership validation in task operations

### AI Study Assistant Requirements
- Use OpenAI GPT-3.5-turbo model exclusively for cost efficiency
- Implement streaming responses for better UX (use Server-Sent Events)
- System prompt must emphasize educational focus and appropriate content
- Store chat messages with proper user association and timestamps
- Implement rate limiting: 50 messages per user per hour

### Dashboard Analytics Requirements
- Calculate study streaks based on task completion dates
- Track time spent using session-based monitoring
- Display completion rates as percentages with visual progress bars
- Generate weekly/monthly reports using aggregated data
- Cache analytics data for 1 hour to improve performance

## User Experience Standards

### Response Time Requirements
- API responses: <500ms for CRUD operations
- AI chat responses: <2s initial response, streaming for longer content
- Page loads: <1s for cached content, <3s for fresh data
- Database queries: Use indexes and optimize for <100ms

### Error Handling Patterns
- Always return user-friendly error messages
- Implement graceful degradation when AI service is unavailable
- Show loading states for operations >200ms
- Provide retry mechanisms for failed AI requests
- Log all errors for monitoring but never expose internal details

### Mobile-First Design Rules
- All components must be responsive and touch-friendly
- Use minimum 44px touch targets for interactive elements
- Implement swipe gestures for task management
- Optimize for one-handed usage patterns
- Test on devices with 320px minimum width

## Data Handling Standards

### Privacy & Security
- Never log or store sensitive study content in plain text
- Implement data retention policies: delete chat history after 90 days
- Use UUID for all primary keys to prevent enumeration attacks
- Sanitize all user inputs to prevent XSS attacks
- Encrypt sensitive data at rest using AES-256

### Performance Optimization
- Implement pagination: 20 items per page for tasks, 50 for chat messages
- Use database indexes on frequently queried fields (userId, createdAt, status)
- Cache user preferences and settings in Redis for 24 hours
- Implement lazy loading for non-critical UI components
- Use optimistic updates for task status changes

## AI Integration Guidelines

### Content Standards
- System prompts must include educational context and content filtering
- Reject requests for homework answers without explanation
- Encourage learning through guided questions and explanations
- Implement content moderation to block inappropriate topics
- Provide study techniques and learning strategies

### Cost Management
- Track token usage per user and implement monthly limits
- Use shorter context windows when possible to reduce costs
- Implement smart caching for similar questions
- Monitor API usage and set up alerts for unusual spikes
- Provide usage analytics in admin dashboard

## Success Metrics & Analytics

### Key Performance Indicators
- Task completion rate: Target >70% weekly completion
- AI engagement: Target 3+ chat sessions per user per week
- Study streak maintenance: Target 5+ consecutive days
- User retention: Target 60% weekly active users
- Response satisfaction: Target 4.5+ star rating for AI responses

### Implementation Requirements
- Track all user interactions with timestamps
- Generate daily/weekly/monthly analytics reports
- Implement A/B testing framework for feature improvements
- Monitor performance metrics and set up alerting
- Provide user-facing progress dashboards with gamification elements