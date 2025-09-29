import { apiClient, type ApiError } from '@/lib/api/client';
import { aiApi, type AIResult } from '@/lib/api/ai';
import type {
  NextBestAction,
  RecommendationRequest,
  RecommendationResponse,
  UserPreferences,
  ActionFeedback,
  RecommendationContext,
  ActionAnalytics,
  MLModelMetrics
} from '../types/next-best-action';

// Enhanced NBA API with AI integration
export class NextBestActionAPI {
  private baseUrl: string;

  constructor(baseUrl = '/api/ai/next-best-actions') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get AI-powered recommendations
   */
  async getRecommendations(request: RecommendationRequest): Promise<AIResult<RecommendationResponse>> {
    try {
      // First try the dedicated NBA endpoint
      const response = await apiClient.post<RecommendationResponse>(
        `${this.baseUrl}/recommendations`,
        request
      );

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      console.warn('Dedicated NBA API failed, trying AI chat fallback:', error);

      // Fallback to AI chat for generating recommendations
      try {
        const chatResponse = await this.getRecommendationsViaChat(request);
        return chatResponse;
      } catch (chatError) {
        console.error('AI chat fallback also failed:', chatError);
        return {
          data: null,
          error: chatError as ApiError,
          isLoading: false
        };
      }
    }
  }

  /**
   * Get recommendations using AI chat as fallback
   */
  private async getRecommendationsViaChat(request: RecommendationRequest): Promise<AIResult<RecommendationResponse>> {
    const prompt = this.buildRecommendationPrompt(request);

    const chatResult = await aiApi.chat({
      message: prompt,
      systemPrompt: this.getSystemPrompt(),
      context: {
        type: 'next_best_action',
        userContext: request.context,
        preferences: request.preferences
      }
    });

    if (chatResult.error || !chatResult.data) {
      return {
        data: null,
        error: chatResult.error,
        isLoading: false
      };
    }

    try {
      // Parse the AI response to extract recommendations
      const recommendations = this.parseAIResponse(chatResult.data.content);

      const response: RecommendationResponse = {
        recommendations,
        metadata: {
          totalPossibleActions: recommendations.length,
          filteredCount: recommendations.length,
          generationTime: Date.now(),
          modelVersion: 'ai-chat-fallback',
          contextFactors: ['user-context', 'ai-analysis'],
          confidence: 0.8
        }
      };

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (parseError) {
      return {
        data: null,
        error: parseError as ApiError,
        isLoading: false
      };
    }
  }

  /**
   * Submit user feedback for recommendations
   */
  async submitFeedback(feedback: ActionFeedback): Promise<AIResult<void>> {
    try {
      await apiClient.post(`${this.baseUrl}/feedback`, feedback);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      // Store feedback locally if API fails
      this.storeFeedbackLocally(feedback);

      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<AIResult<UserPreferences>> {
    try {
      const response = await apiClient.get<UserPreferences>(`${this.baseUrl}/preferences`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      // Return default preferences if API fails
      return {
        data: this.getDefaultPreferences(),
        error: null,
        isLoading: false
      };
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<AIResult<void>> {
    try {
      await apiClient.put(`${this.baseUrl}/preferences`, preferences);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      // Store preferences locally if API fails
      this.storePreferencesLocally(preferences);

      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }

  /**
   * Get analytics for actions
   */
  async getActionAnalytics(actionIds?: string[]): Promise<AIResult<ActionAnalytics[]>> {
    try {
      const params = actionIds ? { actionIds: actionIds.join(',') } : {};
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}/analytics${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<ActionAnalytics[]>(url);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }

  /**
   * Get ML model metrics
   */
  async getModelMetrics(): Promise<AIResult<MLModelMetrics>> {
    try {
      const response = await apiClient.get<MLModelMetrics>(`${this.baseUrl}/model-metrics`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }

  /**
   * Train or retrain the recommendation model
   */
  async trainModel(params?: { includeRecentData?: boolean }): Promise<AIResult<{ status: string; jobId: string }>> {
    try {
      const response = await apiClient.post<{ status: string; jobId: string }>(
        `${this.baseUrl}/train-model`,
        params || {}
      );

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }

  /**
   * Generate explanations for recommendations
   */
  async explainRecommendation(actionId: string): Promise<AIResult<{ explanation: string; factors: string[] }>> {
    try {
      const response = await apiClient.get<{ explanation: string; factors: string[] }>(
        `${this.baseUrl}/explain/${actionId}`
      );

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      // Fallback to AI explanation
      try {
        const explanation = await this.generateExplanationViaAI(actionId);
        return explanation;
      } catch (aiError) {
        return {
          data: null,
          error: aiError as ApiError,
          isLoading: false
        };
      }
    }
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData(): Promise<AIResult<{ synced: number; failed: number }>> {
    try {
      // Get pending feedback
      const pendingFeedback = this.getPendingFeedback();
      const pendingPreferences = this.getPendingPreferences();

      let synced = 0;
      let failed = 0;

      // Sync feedback
      for (const feedback of pendingFeedback) {
        try {
          await this.submitFeedback(feedback);
          synced++;
        } catch (error) {
          failed++;
          console.error('Failed to sync feedback:', error);
        }
      }

      // Sync preferences
      if (pendingPreferences) {
        try {
          await this.updateUserPreferences(pendingPreferences);
          synced++;
          localStorage.removeItem('nba_pending_preferences');
        } catch (error) {
          failed++;
          console.error('Failed to sync preferences:', error);
        }
      }

      // Clear synced feedback
      if (synced > 0) {
        localStorage.removeItem('nba_pending_feedback');
      }

      return {
        data: { synced, failed },
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }

  // Private helper methods

  private buildRecommendationPrompt(request: RecommendationRequest): string {
    const { context, preferences, maxRecommendations = 5 } = request;

    const prompt = `Please analyze the following user context and generate ${maxRecommendations} personalized study recommendations:

**Current Context:**
- Time: ${context.currentTime || 'Not specified'}
- User State: ${JSON.stringify(context.userState || {})}
- Study Patterns: ${JSON.stringify(context.studyPatterns || {})}

**Subject Performance:**
${Object.entries(context.subjectPerformance || {}).map(([subject, data]) =>
  `- ${subject}: Score ${data.averageScore}, Focus ${data.confidenceLevel}, Last studied: ${data.lastStudied}`
).join('\n')}

**Goals Progress:**
${context.goalProgress?.map(goal =>
  `- ${goal.title}: ${Math.round(goal.progress * 100)}% complete (Target: ${goal.target})`
).join('\n') || 'No goals specified'}

**Task Deadlines:**
${context.taskDeadlines?.map(task =>
  `- ${task.title}: Due ${task.deadline} (Priority: ${task.priority})`
).join('\n') || 'No deadlines specified'}

**User Preferences:**
${JSON.stringify(preferences || {})}

Please provide recommendations in JSON format with the following structure for each recommendation:
{
  "id": "unique-id",
  "category": "study|review|break|goal|schedule",
  "priority": "high|medium|low",
  "title": "Action title",
  "description": "Detailed description",
  "estimatedTime": number,
  "impactScore": number (1-10),
  "confidence": number (0-1),
  "reasoning": "Why this recommendation is important",
  "actionData": {},
  "aiInsights": {
    "bestTimeToAct": "suggested timing",
    "successProbability": number (0-1),
    "relatedPatterns": ["pattern1", "pattern2"]
  }
}

Focus on actionable, personalized recommendations based on the user's current state, performance data, and goals.`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `You are an AI study assistant specialized in generating intelligent, personalized next best actions for students. Your recommendations should be:

1. **Data-driven**: Based on user's performance, patterns, and context
2. **Actionable**: Clear, specific actions the user can take immediately
3. **Personalized**: Tailored to the user's preferences, goals, and current state
4. **Balanced**: Mix of study, review, break, goal, and scheduling recommendations
5. **Time-aware**: Consider optimal timing based on user patterns
6. **Impact-focused**: Prioritize high-impact actions that move the user toward their goals

Always consider:
- User's energy level and current state
- Study patterns and preferences
- Upcoming deadlines and priorities
- Goal progress and milestones
- Subject performance and areas needing attention
- Need for breaks and wellbeing

Provide practical, encouraging recommendations that help users stay motivated and productive.`;
  }

  private parseAIResponse(content: string): NextBestAction[] {
    try {
      // Try to extract JSON from the AI response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return recommendations.map((rec: any) => ({
          ...rec,
          createdAt: new Date().toISOString(),
          id: rec.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
      }

      // Fallback: parse structured text
      return this.parseStructuredText(content);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Unable to parse AI recommendations');
    }
  }

  private parseStructuredText(content: string): NextBestAction[] {
    // Fallback parser for when JSON extraction fails
    const recommendations: NextBestAction[] = [];
    const lines = content.split('\n');

    let currentRec: Partial<NextBestAction> = {};

    for (const line of lines) {
      if (line.includes('Title:')) {
        if (currentRec.title) {
          recommendations.push(this.completeRecommendation(currentRec));
          currentRec = {};
        }
        currentRec.title = line.replace('Title:', '').trim();
      } else if (line.includes('Description:')) {
        currentRec.description = line.replace('Description:', '').trim();
      } else if (line.includes('Category:')) {
        currentRec.category = line.replace('Category:', '').trim() as any;
      } else if (line.includes('Priority:')) {
        currentRec.priority = line.replace('Priority:', '').trim() as any;
      }
    }

    if (currentRec.title) {
      recommendations.push(this.completeRecommendation(currentRec));
    }

    return recommendations;
  }

  private completeRecommendation(partial: Partial<NextBestAction>): NextBestAction {
    return {
      id: `ai-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: partial.category || 'study',
      priority: partial.priority || 'medium',
      title: partial.title || 'Study Session',
      description: partial.description || 'Continue your learning journey',
      estimatedTime: 45,
      impactScore: 7,
      confidence: 0.7,
      reasoning: 'AI-generated recommendation based on your current context',
      createdAt: new Date().toISOString(),
      ...partial
    };
  }

  private async generateExplanationViaAI(actionId: string): Promise<AIResult<{ explanation: string; factors: string[] }>> {
    const prompt = `Please explain why the recommendation with ID "${actionId}" was generated. Include:
1. The main factors that influenced this recommendation
2. How it relates to the user's current situation
3. The expected benefits of taking this action
4. Any relevant patterns or data points

Format your response as JSON with "explanation" and "factors" fields.`;

    const chatResult = await aiApi.chat({
      message: prompt,
      systemPrompt: 'You are an AI assistant explaining recommendation logic to help users understand why certain actions are suggested.'
    });

    if (chatResult.error || !chatResult.data) {
      throw chatResult.error || new Error('Failed to generate explanation');
    }

    try {
      const parsed = JSON.parse(chatResult.data.content);
      return {
        data: parsed,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: {
          explanation: chatResult.data.content,
          factors: ['AI analysis', 'User context', 'Performance data']
        },
        error: null,
        isLoading: false
      };
    }
  }

  private storeFeedbackLocally(feedback: ActionFeedback): void {
    try {
      const stored = localStorage.getItem('nba_pending_feedback');
      const pending = stored ? JSON.parse(stored) : [];
      pending.push(feedback);
      localStorage.setItem('nba_pending_feedback', JSON.stringify(pending));
    } catch (error) {
      console.error('Failed to store feedback locally:', error);
    }
  }

  private storePreferencesLocally(preferences: Partial<UserPreferences>): void {
    try {
      const stored = localStorage.getItem('nba_pending_preferences');
      const current = stored ? JSON.parse(stored) : {};
      const updated = { ...current, ...preferences };
      localStorage.setItem('nba_pending_preferences', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store preferences locally:', error);
    }
  }

  private getPendingFeedback(): ActionFeedback[] {
    try {
      const stored = localStorage.getItem('nba_pending_feedback');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get pending feedback:', error);
      return [];
    }
  }

  private getPendingPreferences(): Partial<UserPreferences> | null {
    try {
      const stored = localStorage.getItem('nba_pending_preferences');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get pending preferences:', error);
      return null;
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      enabledCategories: ['study', 'review', 'break', 'goal', 'schedule'],
      priorityFilter: 'all',
      maxRecommendations: 5,
      refreshInterval: 15,
      autoRefresh: true,
      notificationSettings: {
        highPriority: true,
        deadlineAlerts: true,
        optimalTimingAlerts: false,
        breakReminders: true,
        goalMilestones: true,
        adaptiveReminders: false
      },
      learningPreferences: {
        preferredSessionLength: 45,
        breakFrequency: 90,
        difficultSubjectsFirst: false,
        adaptToPerformance: true,
        energyBasedScheduling: false,
        contextSwitchingTolerance: 'medium'
      },
      schedulingPreferences: {
        preferredStudyHours: [9, 10, 11, 14, 15, 16],
        bufferTime: 15,
        autoScheduling: false,
        respectCalendarEvents: true,
        minimumSessionGap: 30,
        maximumDailyStudyHours: 8
      }
    };
  }
}

// Create singleton instance
export const nbaApi = new NextBestActionAPI();

// Export individual methods for convenience
export const {
  getRecommendations,
  submitFeedback,
  getUserPreferences,
  updateUserPreferences,
  getActionAnalytics,
  getModelMetrics,
  trainModel,
  explainRecommendation,
  syncOfflineData
} = nbaApi;