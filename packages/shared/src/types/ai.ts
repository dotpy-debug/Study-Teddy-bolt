export interface AIChat {
  id: string;
  userId: string;
  message: string;
  aiResponse: string;
  tokensUsed?: number | null;
  createdAt: Date | string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date | string;
}

export interface CreateChatDto {
  message: string;
}

export interface ChatResponse {
  id: string;
  message: string;
  aiResponse: string;
  tokensUsed: number;
  createdAt: Date | string;
}

export interface GeneratePracticeDto {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count?: number;
}

export interface ExplainConceptDto {
  concept: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface AIUsageStats {
  totalChats: number;
  totalTokensUsed: number;
  averageTokensPerChat: number;
  lastChatDate?: Date | string;
}

export interface PracticeQuestion {
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}