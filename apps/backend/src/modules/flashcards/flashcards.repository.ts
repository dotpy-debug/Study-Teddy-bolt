import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { flashcards, flashcardReviews } from '../../db/schema/flashcards.schema';
import { eq, and, lte } from 'drizzle-orm';

@Injectable()
export class FlashcardsRepository {
  constructor(private drizzleService: DrizzleService) {}
  async create(data: any) {
    const [flashcard] = await this.drizzleService.db.insert(flashcards).values(data).returning();
    return flashcard;
  }

  async findByDeckId(deckId: string) {
    return this.drizzleService.db.select().from(flashcards).where(eq(flashcards.deckId, deckId));
  }

  async findOne(id: string) {
    const [flashcard] = await this.drizzleService.db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, id));
    return flashcard;
  }

  async update(id: string, data: any) {
    const [updated] = await this.drizzleService.db
      .update(flashcards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(flashcards.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    const [deleted] = await this.drizzleService.db
      .delete(flashcards)
      .where(eq(flashcards.id, id))
      .returning();
    return deleted;
  }

  async createReview(userId: string, flashcardId: string, reviewData: any) {
    const [review] = await this.drizzleService.db
      .insert(flashcardReviews)
      .values({
        userId,
        flashcardId,
        ...reviewData,
      })
      .returning();
    return review;
  }

  async getDueCards(deckId: string, userId: string) {
    return this.drizzleService.db
      .select({
        flashcard: flashcards,
        review: flashcardReviews,
      })
      .from(flashcards)
      .leftJoin(
        flashcardReviews,
        and(eq(flashcardReviews.flashcardId, flashcards.id), eq(flashcardReviews.userId, userId)),
      )
      .where(and(eq(flashcards.deckId, deckId), lte(flashcardReviews.nextReviewDate, new Date())));
  }
}
