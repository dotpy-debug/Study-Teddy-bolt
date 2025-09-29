# AI Integration Service

This module implements a comprehensive AI integration service for the Study Teddy application, featuring provider configuration, routing logic, token tracking, and specialized AI patterns.

## Architecture Overview

### Core Services

#### 1. AIProviderService (`services/ai-provider.service.ts`)
- **Purpose**: Manages multiple AI providers with different capabilities
- **Providers**:
  - **DeepSeek-V3**: Primary provider (default) - Cost-effective, general-purpose
  - **DeepSeek-Coder**: Code-related tasks - Specialized for programming content
  - **OpenAI GPT-4**: Complex fallback - High-capability for difficult tasks
  - **OpenAI GPT-4O Mini**: Efficient fallback - Balanced cost/performance
- **Features**:
  - Provider initialization and configuration
  - Request execution with error handling
  - Cost calculation per provider
  - Provider availability checking

#### 2. AIRouterService (`services/ai-router.service.ts`)
- **Purpose**: Intelligent routing of AI requests to optimal providers
- **Routing Logic**:
  - Default → DeepSeek-V3 for general tasks
  - Code intent detection → DeepSeek-Coder for programming
  - Complex fallback → OpenAI GPT-4 for advanced needs
- **Features**:
  - Code intent analysis with keyword detection
  - Automatic fallback on provider failures
  - Confidence scoring for routing decisions
  - Retry mechanisms with multiple providers

#### 3. AITokenTrackerService (`services/ai-token-tracker.service.ts`)
- **Purpose**: Budget enforcement and usage tracking
- **Limits**:
  - Daily limit: 30,000 tokens per user
  - Per-request limit: 3,000 tokens
- **Features**:
  - Real-time budget checking
  - Usage statistics and analytics
  - Cost tracking per provider/action
  - Budget overview for administrators
  - Automatic budget resets

#### 4. AICacheService (`services/ai-cache.service.ts`)
- **Purpose**: Response caching with pattern-specific TTLs
- **Cache TTLs**:
  - Taskify: 300 seconds (5 minutes)
  - Breakdown: 120 seconds (2 minutes)
  - Tutor: 60 seconds (1 minute)
  - Chat: 3600 seconds (1 hour)
- **Features**:
  - Deterministic cache key generation
  - Content-based hashing for consistency
  - Cache invalidation patterns
  - Cache statistics and monitoring
  - Runtime configuration updates

### AI Patterns

#### 1. Taskify Service (`services/patterns/taskify.service.ts`)
- **Purpose**: Convert free text to structured task lists
- **Input**: Unstructured text describing study needs
- **Output**:
  - Array of structured tasks with titles, subjects, estimates, priorities
  - Total estimated hours
  - Suggested schedule
  - AI analysis with confidence metrics
- **Features**:
  - Context-aware task generation
  - Subject detection and normalization
  - Priority assignment
  - Time estimation
  - Tag generation

#### 2. Breakdown Service (`services/patterns/breakdown.service.ts`)
- **Purpose**: Split complex tasks into 4-8 manageable subtasks
- **Input**: Task title, description, subject, hours, difficulty
- **Output**:
  - Structured subtasks with dependencies
  - Learning path with phases
  - Study strategy recommendations
  - Resource and skill requirements
- **Features**:
  - Logical task sequencing
  - Dependency mapping
  - Learning style adaptation
  - Progress phases
  - Success metrics

#### 3. Tutor Service (`services/patterns/tutor.service.ts`)
- **Purpose**: Educational explanations with practice questions and answer checking
- **Features**:
  - **Concept Explanation**:
    - Comprehensive concept breakdowns
    - Examples and analogies
    - Common mistakes identification
    - Generated practice questions (exactly 3)
    - Study tips by category
  - **Answer Checking**:
    - Automated grading (0-100 score)
    - Constructive feedback
    - Hints and next steps
    - Learning progress tracking

## API Endpoints

### Core Endpoints

#### Chat
- `POST /ai/chat` - General AI chat (legacy compatibility)
- `GET /ai/history` - Chat history with pagination
- `DELETE /ai/history/:id` - Delete chat message

#### Pattern Endpoints

#### Taskify
- `POST /ai/taskify` - Convert text to structured tasks
- Rate limit: 8 requests/minute

#### Breakdown
- `POST /ai/breakdown` - Break down complex tasks
- Rate limit: 6 requests/minute

#### Tutor
- `POST /ai/tutor/explain` - Get concept explanations
- `POST /ai/tutor/check-answer` - Check student answers
- Rate limits: 8/15 requests/minute respectively

#### Monitoring
- `GET /ai/budget` - Check token budget status
- `GET /ai/stats` - Comprehensive usage statistics

## Configuration

### Environment Variables

```bash
# DeepSeek Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key

# OpenAI Configuration (for fallbacks)
OPENAI_API_KEY=your_openai_api_key

# Optional: Override default providers
AI_PROVIDER=deepseek-v3  # primary provider
AI_MODEL=deepseek-chat   # default model
AI_MAX_TOKENS=3000       # max tokens per request
AI_TEMPERATURE=0.7       # creativity level
```

### Provider Costs (per 1k tokens)
- DeepSeek-V3: $0.14
- DeepSeek-Coder: $0.14
- OpenAI GPT-4: $3.00
- OpenAI GPT-4O Mini: $0.15

## Data Models

### Database Schema
The service uses the existing `aiUsageLog` table for tracking:
- User ID and action type
- Prompt and response content
- Token usage and costs
- Model and provider information
- Performance metrics
- Error tracking

### DTOs
- `TaskifyDto` - Free text input with context
- `BreakdownDto` - Task details and preferences
- `TutorExplainDto` - Concept and learning parameters
- `CheckAnswerDto` - Question and student answer

## Security & Rate Limiting

### Rate Limits
- Pattern endpoints: 6-15 requests/minute (based on complexity)
- Budget checks: 30 requests/minute
- Stats: 20 requests/minute

### Token Budgets
- Daily user limit: 30,000 tokens
- Per-request limit: 3,000 tokens
- Automatic budget enforcement
- Graceful error messages when limits exceeded

### Caching Strategy
- Reduce redundant API calls
- Pattern-specific TTLs
- Content-based cache keys
- Automatic invalidation

## Monitoring & Analytics

### Usage Statistics
- Token consumption by action type
- Cost breakdown by provider
- Average response times
- Error rates and patterns
- User behavior analysis

### Performance Metrics
- Provider reliability scores
- Cache hit rates
- Budget utilization
- Response quality indicators

### Alerts
- Budget threshold warnings
- Provider failure notifications
- Unusual usage patterns
- Performance degradation

## Production Considerations

### Scalability
- Horizontal scaling support
- Provider load balancing
- Cache distribution (Redis recommended)
- Database query optimization

### Reliability
- Multiple provider fallbacks
- Circuit breaker patterns
- Graceful degradation
- Error recovery mechanisms

### Cost Optimization
- Smart provider routing
- Aggressive caching
- Token usage optimization
- Budget enforcement

### Monitoring
- Comprehensive logging
- Performance metrics
- Cost tracking
- Usage analytics

## Future Enhancements

### Planned Features
1. **Advanced Routing**: Machine learning-based provider selection
2. **Custom Models**: Support for fine-tuned models
3. **Batch Processing**: Bulk request optimization
4. **Advanced Caching**: Redis with clustering support
5. **Analytics Dashboard**: Real-time monitoring interface

### Integration Opportunities
1. **Learning Analytics**: Progress tracking integration
2. **Personalization**: User preference learning
3. **Content Generation**: Automated study material creation
4. **Assessment Tools**: Comprehensive testing capabilities

## Development Guidelines

### Adding New Patterns
1. Create service in `services/patterns/`
2. Define DTOs in `dto/ai.dto.ts`
3. Add controller endpoints
4. Update module providers
5. Add appropriate caching and routing logic

### Testing
- Unit tests for each service
- Integration tests for API endpoints
- Performance tests for token limits
- Error handling validation

### Code Quality
- TypeScript strict mode
- Comprehensive error handling
- Detailed logging
- API documentation with Swagger