import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { flashcardDecks, flashcards, flashcardReviews } from '../../db/schema/flashcards.schema';
import { eq, and, sql, desc } from 'drizzle-orm';

@Injectable()
export class DecksRepository {
  constructor(private drizzleService: DrizzleService) {}
  async create(data: any) {
    const [deck] = await this.drizzleService.db.insert(flashcardDecks).values(data).returning();
    return deck;
  }

  async findByUserId(userId: string) {
    return this.drizzleService.db
      .select({
        id: flashcardDecks.id,
        title: flashcardDecks.title,
        description: flashcardDecks.description,
        tags: flashcardDecks.tags,
        isPublic: flashcardDecks.isPublic,
        cardCount: flashcardDecks.cardCount,
        totalCards: sql<number>`count(${flashcards.id})`,
        createdAt: flashcardDecks.createdAt,
        updatedAt: flashcardDecks.updatedAt,
      })
      .from(flashcardDecks)
      .leftJoin(flashcards, eq(flashcards.deckId, flashcardDecks.id))
      .where(eq(flashcardDecks.userId, userId))
      .groupBy(flashcardDecks.id)
      .orderBy(desc(flashcardDecks.updatedAt));
  }

  async findOne(id: string) {
    const [deck] = await this.drizzleService.db
      .select()
      .from(flashcardDecks)
      .where(eq(flashcardDecks.id, id));
    return deck;
  }

  async update(id: string, data: any) {
    const [updated] = await this.drizzleService.db
      .update(flashcardDecks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(flashcardDecks.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    const [deleted] = await this.drizzleService.db
      .delete(flashcardDecks)
      .where(eq(flashcardDecks.id, id))
      .returning();
    return deleted;
  }

  async getDeckStats(deckId: string) {
    const [stats] = await this.drizzleService.db
      .select({
        totalCards: sql<number>`count(distinct ${flashcards.id})`,
        dueCards: sql<number>`count(distinct case when ${flashcardReviews.nextReviewDate} <= now() then ${flashcards.id} end)`,
        newCards: sql<number>`count(distinct case when ${flashcardReviews.repetitions} = 0 or ${flashcardReviews.id} is null then ${flashcards.id} end)`,
        averageEaseFactor: sql<number>`coalesce(avg(${flashcardReviews.easeFactor}), 2.5)`,
      })
      .from(flashcards)
      .leftJoin(flashcardReviews, eq(flashcardReviews.flashcardId, flashcards.id))
      .where(eq(flashcards.deckId, deckId));

    return (
      stats || {
        totalCards: 0,
        dueCards: 0,
        newCards: 0,
        averageEaseFactor: 2.5,
      }
    );
  }
}
