# Next Best Action (NBA) System

An intelligent, AI-powered recommendation system that provides personalized study action suggestions based on user data, performance analytics, and machine learning insights.

## 🎯 Overview

The Next Best Action system analyzes your study patterns, performance data, goals, and current context to suggest the most impactful actions you should take next. It combines artificial intelligence with comprehensive analytics to optimize your learning experience.

## ✨ Features

### Core Functionality
- **AI-Powered Recommendations**: Machine learning algorithms analyze your data to suggest optimal next actions
- **Smart Prioritization**: Actions are ranked by impact, urgency, and personal performance patterns
- **Real-Time Context Awareness**: Considers current time, energy levels, recent activities, and deadlines
- **Multi-Category Support**: Study, Review, Break, Goal, and Schedule recommendations
- **Adaptive Learning**: System improves recommendations based on your feedback and behavior

### Action Categories
1. **Study** - Focused learning sessions and skill development
2. **Review** - Practice, revision, and knowledge reinforcement
3. **Break** - Rest periods and wellness activities
4. **Goal** - Progress tracking and milestone management
5. **Schedule** - Time management and planning activities

### Intelligence Features
- **Pattern Recognition**: Identifies optimal study times and session lengths
- **Performance Prediction**: Forecasts success probability for recommended actions
- **Energy Optimization**: Suggests activities based on your energy patterns
- **Deadline Management**: Prioritizes time-sensitive tasks and goals
- **Personalization**: Adapts to your learning style and preferences

## 🚀 Quick Start

### Basic Usage

```tsx
import { NextBestAction } from '@/features/analytics';

function Dashboard() {
  return (
    <div>
      <h2>Your Recommendations</h2>
      <NextBestAction
        maxItems={5}
        showRefreshButton={true}
        showSettings={true}
      />
    </div>
  );
}
```

### With Settings

```tsx
import { NextBestAction, NextBestActionSettings } from '@/features/analytics';

function StudyDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Next Best Actions</h2>
        <NextBestActionSettings />
      </div>
      <NextBestAction maxItems={3} />
    </div>
  );
}
```

### Advanced Usage with Hooks

```tsx
import {
  useRecommendations,
  useRecommendationContext,
  useFeedback
} from '@/features/analytics';

function AdvancedNBA() {
  const context = useRecommendationContext();
  const { recommendations, isLoading, refresh } = useRecommendations(context);
  const { submitFeedback } = useFeedback();

  const handleActionComplete = async (actionId: string) => {
    await submitFeedback({
      actionId,
      helpful: true,
      completedAction: true,
      timestamp: new Date().toISOString()
    });
    refresh();
  };

  return (
    <div>
      {recommendations.map(action => (
        <ActionCard
          key={action.id}
          action={action}
          onComplete={() => handleActionComplete(action.id)}
        />
      ))}
    </div>
  );
}
```

## 📁 File Structure

```
features/analytics/
├── components/
│   ├── next-best-action.tsx           # Main NBA component
│   ├── next-best-action-settings.tsx  # Settings dialog
│   └── index.ts                       # Component exports
├── hooks/
│   └── useNextBestAction.ts           # Custom hooks
├── types/
│   └── next-best-action.ts            # TypeScript types
├── api/
│   └── next-best-action-api.ts        # API integration
├── examples/
│   └── next-best-action-example.tsx   # Usage examples
└── README.md                          # This file
```

## 🔧 API Integration

The system integrates with multiple APIs and data sources:

### AI Integration
- **Primary**: Dedicated NBA AI endpoint (`/api/ai/next-best-actions`)
- **Fallback**: General AI chat API for recommendation generation
- **Local**: Offline fallback using analytics data and patterns

### Data Sources
- **Analytics API**: Study patterns, performance metrics, goal progress
- **User API**: Preferences, settings, behavioral data
- **Calendar API**: Schedule integration and deadline management
- **Focus Sessions**: Attention patterns and session effectiveness

### Offline Support
- Local storage for pending feedback and preferences
- Automatic sync when connection is restored
- Graceful degradation with cached recommendations

## 🎨 Customization

### Component Props

```tsx
interface NextBestActionProps {
  className?: string;           // Custom CSS classes
  maxItems?: number;           // Maximum recommendations (default: 5)
  showRefreshButton?: boolean; // Show manual refresh (default: true)
  showSettings?: boolean;      // Show settings button (default: true)
}
```

### User Preferences

The system supports extensive customization:

```tsx
interface UserPreferences {
  enabledCategories: ActionCategory[];     // Which types to show
  priorityFilter: 'all' | ActionPriority; // Priority filtering
  maxRecommendations: number;              // Display limit
  refreshInterval: number;                 // Auto-refresh timing
  notificationSettings: NotificationSettings;
  learningPreferences: LearningPreferences;
  schedulingPreferences: SchedulingPreferences;
}
```

### Styling

The component uses Tailwind CSS and supports custom styling:

```tsx
// Custom styling example
<NextBestAction
  className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl"
  maxItems={3}
/>
```

## 🧠 AI and Machine Learning

### Recommendation Algorithm
1. **Context Analysis**: Current time, user state, recent activities
2. **Pattern Recognition**: Historical behavior and performance analysis
3. **Goal Alignment**: Progress towards objectives and milestones
4. **Priority Scoring**: Impact, urgency, and success probability
5. **Personalization**: Individual preferences and learning style

### Data Inputs
- **Performance Metrics**: Scores, completion rates, focus levels
- **Behavioral Patterns**: Study times, session lengths, break frequency
- **Goal Progress**: Current status, deadlines, milestones
- **Environmental Context**: Time, location, energy level
- **User Feedback**: Helpfulness ratings, completion status

### Continuous Learning
- **Feedback Integration**: User ratings improve future recommendations
- **Pattern Updates**: System learns from new behavioral data
- **A/B Testing**: Different recommendation strategies are tested
- **Model Retraining**: Periodic updates with fresh data

## 📊 Analytics and Insights

### Recommendation Metrics
- **Success Rate**: Percentage of recommendations that are completed
- **Impact Score**: User-reported effectiveness of actions
- **Time Accuracy**: Estimation accuracy for action duration
- **User Satisfaction**: Overall helpfulness ratings

### AI Insights
Each recommendation includes:
- **Best Time to Act**: Optimal timing based on patterns
- **Success Probability**: Likelihood of successful completion
- **Related Patterns**: Connected behavioral insights
- **Confidence Score**: AI's certainty in the recommendation

## 🔒 Privacy and Security

### Data Handling
- **Local First**: Sensitive data processed locally when possible
- **Encrypted Storage**: User preferences and feedback securely stored
- **Minimal Collection**: Only necessary data for recommendations
- **User Control**: Full control over data usage and retention

### Fallback Systems
- **Offline Capability**: Works without internet connection
- **Graceful Degradation**: Reduces functionality rather than failing
- **Error Recovery**: Automatic retry and alternative approaches
- **Cache Management**: Intelligent caching for performance and reliability

## 🚀 Performance Optimization

### React Query Integration
- **Smart Caching**: 5-minute stale time for recommendations
- **Background Updates**: 15-minute automatic refresh
- **Optimistic Updates**: Immediate UI feedback for actions
- **Error Boundaries**: Graceful error handling and recovery

### Component Optimization
- **Lazy Loading**: Components loaded on demand
- **Memoization**: Expensive calculations cached
- **Virtual Scrolling**: Efficient handling of large recommendation lists
- **Bundle Splitting**: Code split for optimal loading

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit -- features/analytics
```

### Integration Tests
```bash
npm run test:integration -- nba
```

### E2E Tests
```bash
npm run test:e2e -- next-best-action
```

## 📈 Metrics and Monitoring

### Key Performance Indicators
- **Recommendation Accuracy**: Percentage of helpful suggestions
- **Completion Rate**: Actions completed vs. suggested
- **User Engagement**: Frequency of interaction with recommendations
- **Time to Action**: Speed from recommendation to execution

### Monitoring Dashboard
- **Real-time Metrics**: Live recommendation performance
- **User Feedback**: Aggregated satisfaction scores
- **System Health**: API response times and error rates
- **A/B Test Results**: Comparative performance of recommendation strategies

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open http://localhost:3000

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks for quality

### Adding New Features
1. Create feature branch: `git checkout -b feature/nba-enhancement`
2. Implement changes with tests
3. Update documentation
4. Submit pull request

## 📚 API Reference

### Core Hooks

#### `useRecommendations(context, options)`
Fetches AI-powered recommendations.

```tsx
const { recommendations, isLoading, refresh } = useRecommendations(context, {
  maxRecommendations: 5,
  filters: { categories: ['study', 'review'] }
});
```

#### `usePreferences()`
Manages user preferences and settings.

```tsx
const { preferences, updatePreferences } = usePreferences();
```

#### `useFeedback()`
Handles user feedback submission.

```tsx
const { submitFeedback, isSubmitting } = useFeedback();
```

### API Methods

#### `nbaApi.getRecommendations(request)`
Fetches recommendations from AI service.

#### `nbaApi.submitFeedback(feedback)`
Submits user feedback for recommendation improvement.

#### `nbaApi.getUserPreferences()`
Retrieves user preferences and settings.

## 🐛 Troubleshooting

### Common Issues

**Recommendations not loading**
- Check API connectivity
- Verify authentication tokens
- Clear browser cache

**Settings not saving**
- Check network connection
- Verify API endpoints
- Check browser storage permissions

**Poor recommendation quality**
- Increase data collection period
- Provide more feedback
- Check analytics data quality

### Debug Mode
Enable debug logging:
```tsx
// Add to environment variables
NEXT_PUBLIC_NBA_DEBUG=true
```

## 📄 License

This Next Best Action system is part of the Study Teddy application and follows the same licensing terms.

## 🔮 Future Enhancements

### Planned Features
- **Voice Integration**: Speak recommendations aloud
- **Mobile Optimization**: Touch-friendly mobile interface
- **Calendar Integration**: Direct scheduling from recommendations
- **Team Features**: Shared recommendations for study groups
- **Advanced AI**: GPT-4 integration for natural language recommendations

### Research Areas
- **Emotional Intelligence**: Mood-based recommendation adjustment
- **Social Learning**: Peer comparison and collaborative features
- **Gamification**: Achievement systems and progress rewards
- **Accessibility**: Enhanced support for diverse learning needs

---

For more information, examples, and updates, visit the [Study Teddy Documentation](https://docs.studyteddy.com/features/next-best-action).