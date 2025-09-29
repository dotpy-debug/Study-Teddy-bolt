import { apiClient, type ApiError } from './client';
import type {
  AIChat,
  ChatMessage,
  CreateChatDto,
  ChatResponse,
  GeneratePracticeDto,
  ExplainConceptDto,
  AIUsageStats,
  PracticeQuestion
} from '@studyteddy/shared';

// AI result interface
export interface AIResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

// Chat conversation interface
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Chat streaming interface
export interface ChatStreamConfig {
  onMessage?: (chunk: string) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (error: ApiError) => void;
}

// Practice question filters
export interface PracticeQuestionFilters {
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  count?: number;
}

export const aiApi = {
  // Send a chat message to AI
  chat: async (data: CreateChatDto): Promise<AIResult<ChatResponse>> => {
    try {
      const response = await apiClient.post<ChatResponse>('/ai/chat', data);

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
  },

  // Send streaming chat message
  chatStream: async (
    data: CreateChatDto,
    config: ChatStreamConfig
  ): Promise<AIResult<ChatResponse>> => {
    try {
      // For streaming, we'll use EventSource or fetch with stream
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai/chat/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('backendAccessToken')}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let fullResponse = '';
      let chatResponse: ChatResponse | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                if (config.onComplete && chatResponse) {
                  config.onComplete(chatResponse);
                }
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'chunk') {
                  fullResponse += parsed.content;
                  config.onMessage?.(parsed.content);
                } else if (parsed.type === 'complete') {
                  chatResponse = parsed.response;
                }
              } catch (e) {
                // Ignore parsing errors for individual chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        data: chatResponse,
        error: null,
        isLoading: false
      };
    } catch (error) {
      const apiError = error as ApiError;
      config.onError?.(apiError);

      return {
        data: null,
        error: apiError,
        isLoading: false
      };
    }
  },

  // Get chat history
  getHistory: async (limit?: number): Promise<AIResult<AIChat[]>> => {
    try {
      const params = limit ? { limit: limit.toString() } : {};
      const queryString = new URLSearchParams(params).toString();
      const url = `/ai/history${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<AIChat[]>(url);

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
  },

  // Get conversation by ID
  getConversation: async (id: string): Promise<AIResult<ChatConversation>> => {
    try {
      const response = await apiClient.get<ChatConversation>(`/ai/conversations/${id}`);

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
  },

  // Get all conversations
  getConversations: async (): Promise<AIResult<ChatConversation[]>> => {
    try {
      const response = await apiClient.get<ChatConversation[]>('/ai/conversations');

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
  },

  // Delete a chat message
  deleteMessage: async (id: string): Promise<AIResult<void>> => {
    try {
      await apiClient.delete(`/ai/history/${id}`);

      return {
        data: null,
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
  },

  // Delete entire conversation
  deleteConversation: async (id: string): Promise<AIResult<void>> => {
    try {
      await apiClient.delete(`/ai/conversations/${id}`);

      return {
        data: null,
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
  },

  // Clear all chat history
  clearHistory: async (): Promise<AIResult<void>> => {
    try {
      await apiClient.delete('/ai/history');

      return {
        data: null,
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
  },

  // Generate practice questions
  generatePractice: async (data: GeneratePracticeDto): Promise<AIResult<{ questions: PracticeQuestion[] }>> => {
    try {
      const response = await apiClient.post<{ questions: PracticeQuestion[] }>('/ai/practice', data);

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
  },

  // Generate practice questions with custom filters
  generatePracticeAdvanced: async (
    filters: PracticeQuestionFilters
  ): Promise<AIResult<{ questions: PracticeQuestion[] }>> => {
    try {
      const response = await apiClient.post<{ questions: PracticeQuestion[] }>(
        '/ai/practice/advanced',
        filters
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
  },

  // Explain a concept
  explainConcept: async (data: ExplainConceptDto): Promise<AIResult<ChatResponse>> => {
    try {
      const response = await apiClient.post<ChatResponse>('/ai/explain', data);

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
  },

  // Summarize text/content
  summarize: async (data: { content: string; length?: 'short' | 'medium' | 'long' }): Promise<AIResult<ChatResponse>> => {
    try {
      const response = await apiClient.post<ChatResponse>('/ai/summarize', data);

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
  },

  // Generate study plan
  generateStudyPlan: async (data: {
    subjects: string[];
    availableHours: number;
    deadline?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): Promise<AIResult<ChatResponse>> => {
    try {
      const response = await apiClient.post<ChatResponse>('/ai/study-plan', data);

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
  },

  // Get AI usage statistics
  getUsageStats: async (): Promise<AIResult<AIUsageStats>> => {
    try {
      const response = await apiClient.get<AIUsageStats>('/ai/stats');

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
  },

  // Rate AI response
  rateResponse: async (data: {
    chatId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    feedback?: string;
  }): Promise<AIResult<void>> => {
    try {
      await apiClient.post('/ai/rate', data);

      return {
        data: null,
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
  },

  // Export chat history
  exportHistory: async (format: 'json' | 'csv' | 'txt' = 'json'): Promise<AIResult<Blob>> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai/export?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('backendAccessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      return {
        data: blob,
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
  },

  // Search chat history
  searchHistory: async (query: string, limit?: number): Promise<AIResult<AIChat[]>> => {
    try {
      const params = new URLSearchParams({ query });
      if (limit) params.append('limit', limit.toString());

      const response = await apiClient.get<AIChat[]>(`/ai/search?${params.toString()}`);

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
};