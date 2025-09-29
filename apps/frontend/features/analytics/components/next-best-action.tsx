'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw,
  Brain,
  Clock,
  Target,
  BookOpen,
  Calendar,
  Coffee,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Zap,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/react-query';

// Types for NBA system
export interface NextBestAction {
  id: string;
  category: 'study' | 'review' | 'break' | 'goal' | 'schedule';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedTime: number; // in minutes
  impactScore: number; // 1-10
  confidence: number; // 0-1
  reasoning: string;
  actionData?: {
    subjectId?: string;
    taskId?: string;
    sessionType?: string;
    scheduleTime?: string;
    [key: string]: any;
  };
  deadline?: string;
  createdAt: string;
  aiInsights?: {
    bestTimeToAct?: string;
    relatedPatterns?: string[];
    successProbability?: number;
  };
}

export interface UserPreferences {
  enabledCategories: string[];
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  maxRecommendations: number;
  refreshInterval: number; // in minutes
  notificationSettings: {
    highPriority: boolean;
    deadlineAlerts: boolean;
    optimalTimingAlerts: boolean;
  };
}

export interface RecommendationContext {
  currentTime: string;
  studyPatterns: {
    preferredHours: number[];
    averageSessionLength: number;
    focusScores: Record<string, number>;
  };
  taskDeadlines: Array<{
    taskId: string;
    title: string;
    deadline: string;
    priority: string;
  }>;
  subjectPerformance: Record<string, {
    averageScore: number;
    timeSpent: number;
    lastStudied: string;
  }>;
  goalProgress: Array<{
    goalId: string;
    progress: number;
    target: number;
    deadline?: string;
  }>;
  recentSessions: Array<{
    subjectId: string;
    duration: number;
    focusScore: number;
    completedAt: string;
  }>;
}

export interface ActionFeedback {
  actionId: string;
  helpful: boolean;
  feedback?: string;
  completedAction?: boolean;
  timeSpent?: number;
}

// API functions for NBA
const nbaApi = {
  getRecommendations: async (context: Partial<RecommendationContext>): Promise<NextBestAction[]> => {
    // This would call your AI backend to generate recommendations
    const response = await fetch('/api/ai/next-best-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    return data.recommendations;
  },

  submitFeedback: async (feedback: ActionFeedback): Promise<void> => {
    await fetch('/api/ai/next-best-actions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
  },

  getUserPreferences: async (): Promise<UserPreferences> => {
    const response = await fetch('/api/ai/next-best-actions/preferences');
    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }
    return response.json();
  },

  updateUserPreferences: async (preferences: Partial<UserPreferences>): Promise<void> => {
    await fetch('/api/ai/next-best-actions/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
  }
};

// Mock data for demonstration
const mockRecommendations: NextBestAction[] = [
  {
    id: '1',
    category: 'study',
    priority: 'high',
    title: 'Review Mathematics - Calculus',
    description: 'Your calculus exam is in 3 days. Based on your performance data, spending 45 minutes on integration problems will significantly improve your readiness.',
    estimatedTime: 45,
    impactScore: 9,
    confidence: 0.85,
    reasoning: 'Your recent test showed 60% accuracy in integration. Historical data shows 40-point improvement with focused review.',
    deadline: '2024-01-15T09:00:00Z',
    createdAt: new Date().toISOString(),
    actionData: {
      subjectId: 'math-calculus',
      sessionType: 'focused-review'
    },
    aiInsights: {
      bestTimeToAct: '10:00 AM - 11:30 AM',
      relatedPatterns: ['Morning focus peak', 'Pre-exam anxiety reduction'],
      successProbability: 0.82
    }
  },
  {
    id: '2',
    category: 'break',
    priority: 'medium',
    title: 'Take a 15-minute break',
    description: 'You\'ve been studying for 2.5 hours. A short break will help maintain your focus and prevent burnout.',
    estimatedTime: 15,
    impactScore: 7,
    confidence: 0.92,
    reasoning: 'Optimal study sessions show breaks every 90-120 minutes increase retention by 25%.',
    createdAt: new Date().toISOString(),
    actionData: {
      sessionType: 'mindful-break'
    },
    aiInsights: {
      bestTimeToAct: 'Now',
      relatedPatterns: ['Attention span patterns', 'Energy level optimization'],
      successProbability: 0.95
    }
  },
  {
    id: '3',
    category: 'goal',
    priority: 'medium',
    title: 'Update Weekly Study Goal',
    description: 'You\'re 80% towards your weekly goal of 20 hours. Schedule 4 more hours to stay on track.',
    estimatedTime: 5,
    impactScore: 6,
    confidence: 0.78,
    reasoning: 'Consistent goal achievement correlates with 30% better academic performance.',
    createdAt: new Date().toISOString(),
    actionData: {
      goalId: 'weekly-study-hours'
    }
  },
  {
    id: '4',
    category: 'schedule',
    priority: 'low',
    title: 'Plan Tomorrow\'s Study Session',
    description: 'Based on your calendar, you have a 3-hour window tomorrow morning. Pre-planning increases session effectiveness.',
    estimatedTime: 10,
    impactScore: 5,
    confidence: 0.70,
    reasoning: 'Students who plan sessions in advance are 40% more likely to complete them successfully.',
    createdAt: new Date().toISOString(),
    actionData: {
      scheduleTime: '2024-01-13T09:00:00Z'
    }
  }
];

// Custom hooks
const useRecommendations = (context: Partial<RecommendationContext>) => {
  return useQuery({
    queryKey: queryKeys.ai.all.concat(['recommendations', context]),
    queryFn: () => nbaApi.getRecommendations(context),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    placeholderData: mockRecommendations // Use mock data when API is not available
  });
};

const usePreferences = () => {
  return useQuery({
    queryKey: queryKeys.ai.all.concat(['nba-preferences']),
    queryFn: nbaApi.getUserPreferences,
    staleTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: {
      enabledCategories: ['study', 'review', 'break', 'goal', 'schedule'],
      priorityFilter: 'all' as const,
      maxRecommendations: 5,
      refreshInterval: 15,
      notificationSettings: {
        highPriority: true,
        deadlineAlerts: true,
        optimalTimingAlerts: false
      }
    }
  });
};

// Category icons and colors
const categoryConfig = {
  study: { icon: BookOpen, color: 'bg-blue-500', textColor: 'text-blue-700' },
  review: { icon: RefreshCw, color: 'bg-green-500', textColor: 'text-green-700' },
  break: { icon: Coffee, color: 'bg-orange-500', textColor: 'text-orange-700' },
  goal: { icon: Target, color: 'bg-purple-500', textColor: 'text-purple-700' },
  schedule: { icon: Calendar, color: 'bg-indigo-500', textColor: 'text-indigo-700' }
};

const priorityConfig = {
  high: { color: 'destructive', icon: AlertTriangle },
  medium: { color: 'default', icon: TrendingUp },
  low: { color: 'secondary', icon: CheckCircle }
};

// Action Card Component
interface ActionCardProps {
  action: NextBestAction;
  onDismiss: (id: string) => void;
  onFeedback: (feedback: ActionFeedback) => void;
  onQuickAction: (action: NextBestAction) => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onDismiss, onFeedback, onQuickAction }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const categoryInfo = categoryConfig[action.category];
  const priorityInfo = priorityConfig[action.priority];
  const CategoryIcon = categoryInfo.icon;
  const PriorityIcon = priorityInfo.icon;

  const handleFeedback = useCallback((helpful: boolean) => {
    onFeedback({
      actionId: action.id,
      helpful,
      completedAction: false
    });
    setFeedbackSubmitted(true);
    setShowFeedback(false);
  }, [action.id, onFeedback]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-l-4"
          style={{ borderLeftColor: categoryInfo.color.replace('bg-', '') }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoryInfo.color} bg-opacity-10`}>
              <CategoryIcon className={`w-4 h-4 ${categoryInfo.textColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{action.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={priorityInfo.color as any} className="text-xs">
                  <PriorityIcon className="w-3 h-3 mr-1" />
                  {action.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(action.estimatedTime)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Impact: {action.impactScore}/10
                </Badge>
              </div>
            </div>
          </div>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDismiss(action.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{action.description}</p>

        {action.aiInsights && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">AI Insights</span>
            </div>
            {action.aiInsights.bestTimeToAct && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Best time:</span> {action.aiInsights.bestTimeToAct}
              </p>
            )}
            {action.aiInsights.successProbability && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Success probability:</span> {Math.round(action.aiInsights.successProbability * 100)}%
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
          <span className="font-medium">Why this matters:</span> {action.reasoning}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => onQuickAction(action)}
            className="flex-1"
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            Take Action
          </Button>

          {!feedbackSubmitted && !showFeedback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFeedback(true)}
            >
              Feedback
            </Button>
          )}
        </div>

        {showFeedback && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFeedback(true)}
            >
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFeedback(false)}
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>
        )}

        {feedbackSubmitted && (
          <div className="text-xs text-green-600 bg-green-50 rounded p-2">
            Thank you for your feedback! This helps improve our recommendations.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main NextBestAction Component
export interface NextBestActionProps {
  className?: string;
  maxItems?: number;
  showRefreshButton?: boolean;
  showSettings?: boolean;
}

export const NextBestAction: React.FC<NextBestActionProps> = ({
  className,
  maxItems = 5,
  showRefreshButton = true,
  showSettings = true
}) => {
  const queryClient = useQueryClient();
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  // Mock context - in real app, this would come from various sources
  const context: Partial<RecommendationContext> = useMemo(() => ({
    currentTime: new Date().toISOString(),
    studyPatterns: {
      preferredHours: [9, 10, 11, 14, 15, 16],
      averageSessionLength: 90,
      focusScores: { 'math': 0.8, 'science': 0.9, 'history': 0.7 }
    }
  }), []);

  const { data: recommendations, isLoading, error, refetch } = useRecommendations(context);
  const { data: preferences } = usePreferences();

  const feedbackMutation = useMutation({
    mutationFn: nbaApi.submitFeedback,
    onSuccess: () => {
      // Optionally refetch recommendations after feedback
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all });
    }
  });

  const handleDismiss = useCallback((actionId: string) => {
    setDismissedActions(prev => new Set([...prev, actionId]));
  }, []);

  const handleFeedback = useCallback((feedback: ActionFeedback) => {
    feedbackMutation.mutate(feedback);
  }, [feedbackMutation]);

  const handleQuickAction = useCallback((action: NextBestAction) => {
    // Implement quick action logic based on action type
    console.log('Taking action:', action);

    // Mark as completed and provide positive feedback
    handleFeedback({
      actionId: action.id,
      helpful: true,
      completedAction: true
    });

    // Dismiss the action
    handleDismiss(action.id);
  }, [handleFeedback, handleDismiss]);

  const handleRefresh = useCallback(() => {
    setDismissedActions(new Set());
    refetch();
  }, [refetch]);

  const filteredRecommendations = useMemo(() => {
    if (!recommendations) return [];

    return recommendations
      .filter(action => !dismissedActions.has(action.id))
      .filter(action => {
        if (!preferences?.enabledCategories.includes(action.category)) return false;
        if (preferences?.priorityFilter !== 'all' && action.priority !== preferences.priorityFilter) return false;
        return true;
      })
      .slice(0, maxItems);
  }, [recommendations, dismissedActions, preferences, maxItems]);

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Next Best Actions
          </h2>
          {showRefreshButton && (
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <div>
            <h4>Failed to load recommendations</h4>
            <p className="text-sm mt-1">Unable to fetch AI recommendations. Please try again.</p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Next Best Actions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered recommendations to optimize your study experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showRefreshButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          )}
          {showSettings && (
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-4" />
                <Skeleton className="h-10 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {!isLoading && filteredRecommendations.length > 0 && (
        <div className="space-y-4">
          {filteredRecommendations.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onDismiss={handleDismiss}
              onFeedback={handleFeedback}
              onQuickAction={handleQuickAction}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRecommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground mb-4">
              No new recommendations at the moment. Keep up the great work!
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check for new recommendations
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status Footer */}
      {!isLoading && filteredRecommendations.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Showing {filteredRecommendations.length} recommendation{filteredRecommendations.length !== 1 ? 's' : ''} •
          Updated {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default NextBestAction;