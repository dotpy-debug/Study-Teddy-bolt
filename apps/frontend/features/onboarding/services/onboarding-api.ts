import { OnboardingData } from '../types';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export class OnboardingAPI {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return { success: true, data };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete the onboarding process
   */
  static async completeOnboarding(data: OnboardingData): Promise<ApiResponse<{ userId: string }>> {
    return this.request('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update user profile during onboarding
   */
  static async updateProfile(profile: OnboardingData['profile']): Promise<ApiResponse<any>> {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  /**
   * Create subjects from onboarding data
   */
  static async createSubjects(subjects: OnboardingData['subjects']): Promise<ApiResponse<any>> {
    return this.request('/subjects/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ subjects }),
    });
  }

  /**
   * Set user goals
   */
  static async setGoals(goals: OnboardingData['goals']): Promise<ApiResponse<any>> {
    return this.request('/goals/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ goals }),
    });
  }

  /**
   * Save schedule preferences
   */
  static async saveSchedulePreferences(schedule: OnboardingData['schedule']): Promise<ApiResponse<any>> {
    return this.request('/user/schedule-preferences', {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  }

  /**
   * Generate initial week plan
   */
  static async generateWeekPlan(weekData: OnboardingData['weekGeneration']): Promise<ApiResponse<any>> {
    return this.request('/schedule/generate-week', {
      method: 'POST',
      body: JSON.stringify(weekData),
    });
  }

  /**
   * Save onboarding progress (for resuming later)
   */
  static async saveProgress(progress: any): Promise<ApiResponse<any>> {
    return this.request('/onboarding/progress', {
      method: 'POST',
      body: JSON.stringify(progress),
    });
  }

  /**
   * Load saved onboarding progress
   */
  static async loadProgress(): Promise<ApiResponse<any>> {
    return this.request('/onboarding/progress', {
      method: 'GET',
    });
  }
}

/**
 * Hook for handling onboarding completion with API integration
 */
export async function handleOnboardingCompletion(data: OnboardingData): Promise<boolean> {
  try {
    // Step 1: Update user profile
    const profileResult = await OnboardingAPI.updateProfile(data.profile);
    if (!profileResult.success) {
      throw new Error('Failed to update profile');
    }

    // Step 2: Create subjects
    if (data.subjects && data.subjects.length > 0) {
      const subjectsResult = await OnboardingAPI.createSubjects(data.subjects);
      if (!subjectsResult.success) {
        throw new Error('Failed to create subjects');
      }
    }

    // Step 3: Set goals
    if (data.goals && data.goals.length > 0) {
      const goalsResult = await OnboardingAPI.setGoals(data.goals);
      if (!goalsResult.success) {
        throw new Error('Failed to set goals');
      }
    }

    // Step 4: Save schedule preferences
    if (data.schedule) {
      const scheduleResult = await OnboardingAPI.saveSchedulePreferences(data.schedule);
      if (!scheduleResult.success) {
        throw new Error('Failed to save schedule preferences');
      }
    }

    // Step 5: Generate week plan
    if (data.weekGeneration) {
      const weekResult = await OnboardingAPI.generateWeekPlan(data.weekGeneration);
      if (!weekResult.success) {
        throw new Error('Failed to generate week plan');
      }
    }

    // Step 6: Complete onboarding
    const completionResult = await OnboardingAPI.completeOnboarding(data);
    if (!completionResult.success) {
      throw new Error('Failed to complete onboarding');
    }

    return true;
  } catch (error) {
    console.error('Onboarding completion failed:', error);
    return false;
  }
}