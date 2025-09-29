export interface FlashcardDeck {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subjectId?: string;
  tags: string[];
  cardCount: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  imageUrl?: string;
  difficulty: FlashcardDifficulty;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum FlashcardDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface FlashcardReview {
  id: string;
  userId: string;
  flashcardId: string;
  quality: ReviewQuality;
  reviewedAt: Date;
  nextReviewDate: Date;
  easeFactor: number;
  interval: number;
}

export enum ReviewQuality {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3
}