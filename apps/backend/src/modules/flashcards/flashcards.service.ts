import { Injectable, NotFoundException } from '@nestjs/common';
import { FlashcardsRepository } from './flashcards.repository';

@Injectable()
export class FlashcardsService {
  constructor(private readonly flashcardsRepository: FlashcardsRepository) {}

  async create(userId: string, deckId: string, createFlashcardDto: any) {
    // Verify deck ownership would go here
    return this.flashcardsRepository.create({
      ...createFlashcardDto,
      deckId,
    });
  }

  async findByDeck(deckId: string) {
    return this.flashcardsRepository.findByDeckId(deckId);
  }

  async findOne(id: string) {
    const flashcard = await this.flashcardsRepository.findOne(id);
    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }
    return flashcard;
  }

  async update(id: string, updateFlashcardDto: any) {
    return this.flashcardsRepository.update(id, updateFlashcardDto);
  }

  async remove(id: string) {
    return this.flashcardsRepository.delete(id);
  }

  async reviewCard(userId: string, flashcardId: string, quality: number) {
    const flashcard = await this.findOne(flashcardId);

    // Simple SM-2 algorithm implementation
    const easeFactor = Math.max(1.3, 2.5 + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    let interval = 1;
    if (quality < 3) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return this.flashcardsRepository.createReview(userId, flashcardId, {
      quality,
      easeFactor,
      interval,
      repetitions: 1,
      nextReviewDate,
      reviewedAt: new Date(),
    });
  }

  async getDueCards(deckId: string, userId: string) {
    return this.flashcardsRepository.getDueCards(deckId, userId);
  }
}
