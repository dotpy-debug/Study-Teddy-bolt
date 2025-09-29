export interface AIChat {
  id: string;
  userId: string;
  message: string;
  aiResponse: string;
  tokensUsed?: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  aiResponse: string;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
}

export interface PracticeQuestionsRequest {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ExplainConceptRequest {
  concept: string;
}