// Export all Next Best Action components
export { NextBestAction as default } from './next-best-action';
export { NextBestAction } from './next-best-action';
export { NextBestActionSettings } from './next-best-action-settings';

// Re-export types for convenience
export type {
  NextBestAction as NextBestActionType,
  NextBestActionProps,
  ActionCategory,
  ActionPriority,
  UserPreferences,
  RecommendationContext,
  ActionFeedback,
  AIInsights
} from '../types/next-best-action';

// Re-export hooks
export {
  useRecommendations,
  usePreferences,
  useFeedback,
  useRecommendationContext,
  useDismissedActions,
  useActionExecution
} from '../hooks/useNextBestAction';

// Re-export API
export { nbaApi } from '../api/next-best-action-api';