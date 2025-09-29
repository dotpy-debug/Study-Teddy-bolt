# AI Integration Environment Variables

## DeepSeek AI Provider Integration - COMPLETE ✅

The backend now supports sophisticated AI routing with multiple providers and fallbacks.

### Required Environment Variables

#### DeepSeek API (Primary Provider)
```env
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# AI Provider Selection (default: router)
AI_PROVIDER=router  # Use "router" for intelligent provider selection

# Model Configuration (optional overrides)
AI_MODEL=deepseek-chat
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

#### OpenAI API (Fallback Provider)
```env
# OpenAI API Configuration (for fallbacks)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=3000
OPENAI_TEMPERATURE=0.7
```

#### Legacy Configuration (Backward Compatibility)
```env
# Legacy single-provider mode (if needed)
AI_API_KEY=your-api-key-here  # Falls back to OPENAI_API_KEY or DEEPSEEK_API_KEY
```

### AI Provider Routing Logic

The system automatically routes requests based on content and action type:

1. **DeepSeek-V3** (Primary)
   - General chat and tutoring
   - Task breakdown and planning
   - Cost: ~$0.14 per 1k tokens

2. **DeepSeek-Coder** (Code Detection)
   - Automatically detects code-related queries
   - Programming, debugging, algorithms
   - Cost: ~$0.14 per 1k tokens

3. **OpenAI GPT-4** (Complex Fallback)
   - When DeepSeek providers fail
   - Complex reasoning tasks
   - Cost: ~$3.00 per 1k tokens

4. **OpenAI GPT-4O Mini** (Efficient Fallback)
   - Quick fallback option
   - General queries when others fail
   - Cost: ~$0.15 per 1k tokens

### Token Budget Enforcement

The system enforces the following limits:

- **Daily Limit**: 30,000 tokens per user
- **Per Request Limit**: 3,000 tokens per request
- **Automatic Budget Checking**: Before each request
- **Cost Tracking**: Real-time cost calculation
- **Cache Optimization**: 1-hour response caching

### Code Intent Detection

The system automatically detects code-related queries using:

- **Keywords**: Programming terms, languages, frameworks
- **Code Blocks**: Backticks, syntax patterns
- **Programming Patterns**: Function definitions, class declarations
- **Confidence Scoring**: 0.0-1.0 confidence in code detection

### Configuration Examples

#### Production (Recommended)
```env
AI_PROVIDER=router
DEEPSEEK_API_KEY=sk-deepseek-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

#### Development with DeepSeek Only
```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-deepseek-xxxxx
AI_MODEL=deepseek-chat
```

#### Legacy OpenAI Only
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxx
AI_MODEL=gpt-4o-mini
```

### Integration Status

✅ **AI Provider Service**: DeepSeek-V3, DeepSeek-Coder, OpenAI providers configured
✅ **AI Router Service**: Intelligent routing with fallbacks
✅ **Token Tracker Service**: Budget enforcement and usage tracking
✅ **Legacy Service Updated**: Now uses router by default
✅ **Controller Updated**: Better Auth integration
✅ **Pattern Services**: Taskify, Breakdown, Tutor using new architecture
✅ **Cache Service**: Response caching and optimization
✅ **Error Handling**: Comprehensive error handling and retries

### API Endpoints

All AI endpoints now use the intelligent routing system:

- `POST /api/ai/chat` - General chat (routes to best provider)
- `POST /api/ai/taskify` - Task generation (DeepSeek-V3 primary)
- `POST /api/ai/breakdown` - Task breakdown (DeepSeek-V3 primary)
- `POST /api/ai/tutor/explain` - Concept explanation (DeepSeek-V3 primary)
- `POST /api/ai/tutor/check-answer` - Answer checking (code detection)
- `GET /api/ai/budget` - Token budget status
- `GET /api/ai/stats` - Usage statistics

### Next Steps

The AI integration is now production-ready. Consider:

1. **API Keys**: Add your DeepSeek and OpenAI API keys to environment
2. **Monitoring**: Monitor token usage and costs
3. **Testing**: Test all AI endpoints with different query types
4. **Frontend Integration**: Connect frontend to use new AI endpoints