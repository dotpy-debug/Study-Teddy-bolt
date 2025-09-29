// Core types for Next Best Action system

export interface NextBestAction {
  id: string;
  category: ActionCategory;
  priority: ActionPriority;
  title: string;
  description: string;
  estimatedTime: number; // in minutes
  impactScore: number; // 1-10
  confidence: number; // 0-1
  reasoning: string;
  actionData?: ActionData;
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
  aiInsights?: AIInsights;
  metadata?: Record<string, any>;
}

export type ActionCategory = 'study' | 'review' | 'break' | 'goal' | 'schedule';

export type ActionPriority = 'high' | 'medium' | 'low';

export interface ActionData {
  subjectId?: string;
  taskId?: string;
  sessionType?: SessionType;
  scheduleTime?: string;
  goalId?: string;
  materialId?: string;
  focusAreaId?: string;
  [key: string]: any;
}

export type SessionType =
  | 'focused-study'
  | 'focused-review'
  | 'practice-session'
  | 'mindful-break'
  | 'active-break'
  | 'goal-planning'
  | 'schedule-planning';

export interface AIInsights {
  bestTimeToAct?: string;
  relatedPatterns?: string[];
  successProbability?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  energyRequirement?: 'low' | 'medium' | 'high';
  prerequisites?: string[];
  followUpActions?: string[];
  adaptiveFactors?: {
    timeOfDay?: boolean;
    energyLevel?: boolean;
    recentPerformance?: boolean;
    environmentalFactors?: boolean;
  };
}

export interface UserPreferences {
  enabledCategories: ActionCategory[];
  priorityFilter: 'all' | ActionPriority;
  maxRecommendations: number;
  refreshInterval: number; // in minutes
  autoRefresh: boolean;
  notificationSettings: NotificationSettings;
  learningPreferences: LearningPreferences;
  schedulingPreferences: SchedulingPreferences;
}

export interface NotificationSettings {
  highPriority: boolean;
  deadlineAlerts: boolean;
  optimalTimingAlerts: boolean;
  breakReminders: boolean;
  goalMilestones: boolean;
  adaptiveReminders: boolean;
  quietHours?: {
    start: string;
    end: string;
  };
}

export interface LearningPreferences {
  preferredSessionLength: number; // in minutes
  breakFrequency: number; // in minutes
  difficultSubjectsFirst: boolean;
  adaptToPerformance: boolean;
  energyBasedScheduling: boolean;
  contextSwitchingTolerance: 'low' | 'medium' | 'high';
}

export interface SchedulingPreferences {
  preferredStudyHours: number[];
  bufferTime: number; // in minutes
  autoScheduling: boolean;
  respectCalendarEvents: boolean;
  minimumSessionGap: number; // in minutes
  maximumDailyStudyHours: number;
}

export interface RecommendationContext {
  currentTime: string;
  userTimezone: string;
  studyPatterns: StudyPatterns;
  taskDeadlines: TaskDeadline[];
  subjectPerformance: Record<string, SubjectPerformanceData>;
  goalProgress: GoalProgressData[];
  recentSessions: RecentSessionData[];
  environmentalFactors: EnvironmentalFactors;
  userState: UserState;
  calendarEvents?: CalendarEvent[];
}

export interface StudyPatterns {
  preferredHours: number[];
  averageSessionLength: number;
  focusScores: Record<string, number>;
  breakPatterns: {
    frequency: number;
    averageDuration: number;
    preferredBreakTypes: string[];
  };
  productivityCurve: Array<{
    hour: number;
    productivity: number;
  }>;
  subjectRotation: string[];
  weeklyDistribution: Record<string, number>;
}

export interface TaskDeadline {
  taskId: string;
  title: string;
  deadline: string;
  priority: string;
  estimatedTimeRemaining: number;
  completionPercentage: number;
  subjectId?: string;
  dependencies?: string[];
}

export interface SubjectPerformanceData {
  averageScore: number;
  timeSpent: number;
  lastStudied: string;
  difficultyAreas: string[];
  improvementTrend: 'improving' | 'declining' | 'stable';
  confidenceLevel: number;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced';
  recommendedFocusAreas: string[];
}

export interface GoalProgressData {
  goalId: string;
  title: string;
  type: GoalType;
  progress: number;
  target: number;
  deadline?: string;
  milestones: Milestone[];
  onTrack: boolean;
  estimatedCompletion?: string;
}

export type GoalType =
  | 'study_time'
  | 'tasks_completed'
  | 'sessions_count'
  | 'focus_score'
  | 'streak'
  | 'subject_mastery'
  | 'exam_preparation';

export interface Milestone {
  id: string;
  title: string;
  targetValue: number;
  deadline?: string;
  completed: boolean;
  completedAt?: string;
}

export interface RecentSessionData {
  sessionId: string;
  subjectId: string;
  subjectName: string;
  duration: number;
  focusScore: number;
  completedTasks: number;
  distractions: number;
  completedAt: string;
  sessionType: SessionType;
  mood?: 'excellent' | 'good' | 'neutral' | 'poor';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface EnvironmentalFactors {
  currentLocation?: 'home' | 'library' | 'cafe' | 'office' | 'other';
  noiseLevel?: 'quiet' | 'moderate' | 'noisy';
  lighting?: 'dim' | 'normal' | 'bright';
  temperature?: 'cold' | 'comfortable' | 'warm';
  distractionLevel?: 'low' | 'medium' | 'high';
  availableResources?: string[];
}

export interface UserState {
  energyLevel: 'low' | 'medium' | 'high';
  mood: 'excellent' | 'good' | 'neutral' | 'poor' | 'stressed';
  motivation: 'high' | 'medium' | 'low';
  lastBreakTime?: string;
  lastStudyTime?: string;
  todaysStudyTime: number;
  todaysBreakTime: number;
  streakDays: number;
  fatigueLevel: 'none' | 'mild' | 'moderate' | 'high';
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'other';
  location?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ActionFeedback {
  actionId: string;
  helpful: boolean;
  feedback?: string;
  completedAction?: boolean;
  timeSpent?: number;
  actualImpact?: number; // 1-10, user's assessment of actual impact
  difficultyRating?: number; // 1-10, how difficult was it to complete
  wouldRecommendAgain?: boolean;
  improvementSuggestions?: string;
  timestamp: string;
}

export interface RecommendationRequest {
  context: Partial<RecommendationContext>;
  preferences?: Partial<UserPreferences>;
  filters?: RecommendationFilters;
  maxRecommendations?: number;
  includeInsights?: boolean;
}

export interface RecommendationFilters {
  categories?: ActionCategory[];
  priorities?: ActionPriority[];
  timeRange?: {
    min: number;
    max: number;
  };
  impactRange?: {
    min: number;
    max: number;
  };
  excludeActionIds?: string[];
  subjectIds?: string[];
  onlyWithDeadlines?: boolean;
}

export interface RecommendationResponse {
  recommendations: NextBestAction[];
  metadata: {
    totalPossibleActions: number;
    filteredCount: number;
    generationTime: number;
    modelVersion: string;
    contextFactors: string[];
    confidence: number;
  };
  debug?: {
    reasoningSteps: string[];
    dataQuality: Record<string, number>;
    fallbacksUsed: string[];
  };
}

export interface ActionAnalytics {
  actionId: string;
  timesRecommended: number;
  timesCompleted: number;
  averageCompletionTime: number;
  averageHelpfulnessRating: number;
  averageImpactRating: number;
  completionRate: number;
  userSatisfactionScore: number;
  contextPatterns: Array<{
    pattern: string;
    frequency: number;
    successRate: number;
  }>;
}

export interface MLModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  lastUpdated: string;
  trainingDataSize: number;
  featureImportance: Record<string, number>;
}

// API Response types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Hook return types
export interface UseRecommendationsResult {
  recommendations: NextBestAction[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  refresh: () => void;
  metadata?: RecommendationResponse['metadata'];
}

export interface UsePreferencesResult {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export interface UseFeedbackResult {
  submitFeedback: (feedback: ActionFeedback) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}

// Configuration types
export interface NBAConfig {
  apiEndpoints: {
    recommendations: string;
    feedback: string;
    preferences: string;
    analytics: string;
  };
  defaultPreferences: UserPreferences;
  caching: {
    recommendationsStaleTime: number;
    preferencesStaleTime: number;
    refreshInterval: number;
  };
  features: {
    enableAnalytics: boolean;
    enableML: boolean;
    enableRealTimeUpdates: boolean;
    enableAdvancedInsights: boolean;
  };
}

// Event types for real-time updates
export interface NBAEvent {
  type: 'recommendation_updated' | 'preference_changed' | 'feedback_received' | 'context_changed';
  payload: any;
  timestamp: string;
  userId: string;
}

export interface RecommendationUpdatedEvent extends NBAEvent {
  type: 'recommendation_updated';
  payload: {
    recommendationId: string;
    changes: Partial<NextBestAction>;
  };
}

export interface PreferenceChangedEvent extends NBAEvent {
  type: 'preference_changed';
  payload: {
    preferences: Partial<UserPreferences>;
  };
}

export interface FeedbackReceivedEvent extends NBAEvent {
  type: 'feedback_received';
  payload: ActionFeedback;
}

export interface ContextChangedEvent extends NBAEvent {
  type: 'context_changed';
  payload: {
    context: Partial<RecommendationContext>;
  };
}