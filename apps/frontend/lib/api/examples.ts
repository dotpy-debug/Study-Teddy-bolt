/**
 * Study Teddy API Usage Examples
 *
 * This file demonstrates how to use the enhanced API client system
 * with proper error handling, loading states, and TypeScript types.
 */

import { authApi, tasksApi, aiApi, dashboardApi } from './index';
import type {
  LoginDto,
  CreateTaskDto,
  CreateChatDto
} from '@studyteddy/shared';
import { TaskPriority } from '@studyteddy/shared';

// Example: User Authentication Flow
export const authExamples = {
  // Login with error handling
  async loginUser(email: string, password: string) {
    const credentials: LoginDto = { email, password };
    const result = await authApi.login(credentials);

    if (result.error) {
      console.error('Login failed:', result.error.message);
      return { success: false, error: result.error.message };
    }

    if (result.data) {
      console.log('Login successful:', result.data.user);
      return { success: true, user: result.data.user };
    }

    return { success: false, error: 'Unknown error occurred' };
  },

  // Register with validation
  async registerUser(email: string, password: string, name: string) {
    const result = await authApi.register({ email, password, name });

    return {
      success: !result.error,
      error: result.error?.message,
      user: result.data?.user
    };
  },

  // Google OAuth flow
  async initiateGoogleAuth() {
    const config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirectUri: `${window.location.origin}/auth/google/callback`,
      scope: 'openid email profile'
    };

    const authUrl = authApi.getGoogleAuthUrl(config);
    window.location.href = authUrl;
  },

  // Handle Google OAuth callback
  async handleGoogleCallback(code: string) {
    const result = await authApi.googleCallback(code);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  }
};

// Example: Task Management
export const taskExamples = {
  // Create a new task with validation
  async createTask(title: string, subject?: string, dueDate?: Date) {
    const taskData: CreateTaskDto = {
      title,
      subject,
      dueDate: dueDate?.toISOString(),
      priority: TaskPriority.MEDIUM
    };

    const result = await tasksApi.createTask(taskData);

    if (result.error) {
      throw new Error(`Failed to create task: ${result.error.message}`);
    }

    return result.data;
  },

  // Get tasks with filtering and pagination
  async getFilteredTasks(subject?: string, completed?: boolean, page = 1, limit = 20) {
    const params = {
      page,
      limit,
      sortBy: 'dueDate' as const,
      sortOrder: 'asc' as const,
      filters: {
        subject,
        completed
      }
    };

    const result = await tasksApi.getTasks(params);

    if (result.error) {
      console.error('Failed to fetch tasks:', result.error.message);
      return [];
    }

    return result.data || [];
  },

  // Toggle task completion with optimistic updates
  async toggleTaskCompletion(taskId: string) {
    const result = await tasksApi.toggleComplete(taskId);

    if (result.error) {
      // Revert optimistic update if needed
      throw new Error(`Failed to toggle task: ${result.error.message}`);
    }

    return result.data;
  },

  // Bulk operations example
  async bulkCompleteTasksInSubject(subject: string) {
    // First get all pending tasks in the subject
    const tasksResult = await tasksApi.getTasks({
      filters: { subject, completed: false }
    });

    if (tasksResult.error || !tasksResult.data) {
      throw new Error('Failed to fetch tasks for bulk operation');
    }

    // Bulk update all tasks
    const taskIds = tasksResult.data.map(task => task.id);
    const bulkResult = await tasksApi.bulkUpdateTasks({
      taskIds,
      updates: { completed: true }
    });

    if (bulkResult.error) {
      throw new Error(`Bulk update failed: ${bulkResult.error.message}`);
    }

    return bulkResult.data;
  }
};

// Example: AI Chat Integration
export const aiExamples = {
  // Send a chat message with streaming
  async sendChatMessage(message: string, onStreamUpdate?: (chunk: string) => void) {
    const chatData: CreateChatDto = { message };

    if (onStreamUpdate) {
      // Use streaming for real-time responses
      return await aiApi.chatStream(chatData, {
        onMessage: onStreamUpdate,
        onComplete: (response) => {
          console.log('Chat complete:', response);
        },
        onError: (error) => {
          console.error('Chat stream error:', error);
        }
      });
    } else {
      // Use regular chat for simple responses
      const result = await aiApi.chat(chatData);

      if (result.error) {
        throw new Error(`Chat failed: ${result.error.message}`);
      }

      return result.data;
    }
  },

  // Generate practice questions
  async generatePracticeQuestions(topic: string, difficulty: 'easy' | 'medium' | 'hard', count = 5) {
    const result = await aiApi.generatePractice({
      topic,
      difficulty,
      count
    });

    if (result.error) {
      throw new Error(`Failed to generate questions: ${result.error.message}`);
    }

    return result.data?.questions || [];
  },

  // Get AI usage statistics
  async getUsageStats() {
    const result = await aiApi.getUsageStats();

    if (result.error) {
      console.error('Failed to get AI stats:', result.error.message);
      return null;
    }

    return result.data;
  },

  // Export chat history
  async exportChatHistory(format: 'json' | 'csv' | 'txt' = 'json') {
    const result = await aiApi.exportHistory(format);

    if (result.error) {
      throw new Error(`Export failed: ${result.error.message}`);
    }

    if (result.data) {
      // Create download link
      const url = URL.createObjectURL(result.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
};

// Example: Dashboard Analytics
export const dashboardExamples = {
  // Get comprehensive dashboard data
  async getDashboardData(timeRange: 'week' | 'month' | 'year' = 'month') {
    const [statsResult, streakResult, analyticsResult, progressResult] = await Promise.all([
      dashboardApi.getStats({ dateRange: timeRange }),
      dashboardApi.getStreak(),
      dashboardApi.getStudyAnalytics(timeRange),
      dashboardApi.getProgressSummary(timeRange)
    ]);

    const errors: string[] = [];
    if (statsResult.error) errors.push(`Stats: ${statsResult.error.message}`);
    if (streakResult.error) errors.push(`Streak: ${streakResult.error.message}`);
    if (analyticsResult.error) errors.push(`Analytics: ${analyticsResult.error.message}`);
    if (progressResult.error) errors.push(`Progress: ${progressResult.error.message}`);

    if (errors.length > 0) {
      console.warn('Some dashboard data failed to load:', errors);
    }

    return {
      stats: statsResult.data,
      streak: streakResult.data,
      analytics: analyticsResult.data,
      progress: progressResult.data,
      errors
    };
  },

  // Create and track goals
  async createStudyGoal(title: string, target: number, unit: string, deadline?: Date) {
    const result = await dashboardApi.createGoal({
      title,
      target,
      unit,
      deadline: deadline?.toISOString()
    });

    if (result.error) {
      throw new Error(`Failed to create goal: ${result.error.message}`);
    }

    return result.data;
  },

  // Get productivity insights
  async getProductivityInsights() {
    const result = await dashboardApi.getProductivityInsights();

    if (result.error) {
      console.error('Failed to get insights:', result.error.message);
      return null;
    }

    return result.data;
  },

  // Export dashboard data
  async exportDashboard(format: 'json' | 'csv' | 'pdf' = 'json', timeRange: 'month' | 'year' = 'month') {
    const result = await dashboardApi.exportData(format, timeRange);

    if (result.error) {
      throw new Error(`Export failed: ${result.error.message}`);
    }

    if (result.data) {
      // Create download link
      const url = URL.createObjectURL(result.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${timeRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
};

// Example: Error Handling Patterns
export const errorHandlingExamples = {
  // Retry logic for failed requests
  async withRetry<T>(
    apiCall: () => Promise<{ data: T | null; error: any | null }>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await apiCall();

        if (result.error) {
          lastError = result.error;

          // Don't retry on authentication errors
          if (result.error.statusCode === 401) {
            throw result.error;
          }

          // Wait before retrying
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
          continue;
        }

        if (result.data) {
          return result.data;
        }
      } catch (error) {
        lastError = error;

        // Wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  },

  // Global error handler
  handleApiError(error: any, context?: string) {
    const message = error?.message || 'An unexpected error occurred';
    const statusCode = error?.statusCode || 500;

    console.error(`API Error${context ? ` in ${context}` : ''}:`, {
      message,
      statusCode,
      details: error?.details
    });

    // Handle specific error types
    switch (statusCode) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        // Show permission denied message
        break;
      case 429:
        // Show rate limit message
        break;
      case 500:
        // Show server error message
        break;
      default:
        // Show generic error message
        break;
    }

    return {
      message,
      statusCode,
      isRetryable: statusCode >= 500 && statusCode < 600
    };
  }
};

// Example: Real-time Updates
export const realtimeExamples = {
  // Poll for dashboard updates
  startDashboardPolling(callback: (data: any) => void, interval = 30000) {
    const poll = async () => {
      try {
        const result = await dashboardApi.getRealtimeStats();
        if (result.data) {
          callback(result.data);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  },

  // WebSocket simulation for real-time task updates
  simulateRealtimeTaskUpdates(callback: (taskId: string, status: string) => void) {
    // This would be replaced with actual WebSocket connection
    const mockUpdates = [
      { taskId: '1', status: 'completed' },
      { taskId: '2', status: 'in_progress' },
      { taskId: '3', status: 'completed' }
    ];

    let index = 0;
    const intervalId = setInterval(() => {
      if (index < mockUpdates.length) {
        const update = mockUpdates[index];
        callback(update.taskId, update.status);
        index++;
      } else {
        clearInterval(intervalId);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }
};