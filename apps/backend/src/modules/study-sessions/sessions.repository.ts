import { Injectable } from '@nestjs/common';
import { eq, and, desc, gte, lt, count, avg, sum } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import {
  studySessions,
  sessionAnalytics,
  sessionStatusEnum,
  sessionTypeEnum,
} from '../../db/schema';

@Injectable()
export class SessionsRepository {
  constructor(private drizzleService: DrizzleService) {}
  async findByUserId(userId: string, limit?: number, offset?: number) {
    let query = this.drizzleService.db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, userId))
      .orderBy(desc(studySessions.startTime));

    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return query;
  }

  async findActiveByUserId(userId: string) {
    const [session] = await this.drizzleService.db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.status, 'active'),
        ),
      )
      .limit(1);

    return session;
  }

  async findPausedByUserId(userId: string) {
    const sessions = await this.drizzleService.db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.status, 'paused'),
        ),
      )
      .orderBy(desc(studySessions.startTime));

    return sessions;
  }

  async findById(sessionId: string) {
    const [session] = await this.drizzleService.db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, sessionId))
      .limit(1);

    return session;
  }

  async create(data: Partial<typeof studySessions.$inferInsert>) {
    const [session] = await this.drizzleService.db
      .insert(studySessions)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return session;
  }

  async update(
    sessionId: string,
    data: Partial<typeof studySessions.$inferInsert>,
  ) {
    const [session] = await this.drizzleService.db
      .update(studySessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(studySessions.id, sessionId))
      .returning();

    return session;
  }

  async delete(sessionId: string) {
    const [session] = await this.drizzleService.db
      .delete(studySessions)
      .where(eq(studySessions.id, sessionId))
      .returning();

    return session;
  }

  async getAnalytics(sessionId: string) {
    const [analytics] = await this.drizzleService.db
      .select()
      .from(sessionAnalytics)
      .where(eq(sessionAnalytics.sessionId, sessionId))
      .limit(1);

    return analytics;
  }

  async createAnalytics(data: Partial<typeof sessionAnalytics.$inferInsert>) {
    const [analytics] = await this.drizzleService.db
      .insert(sessionAnalytics)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return analytics;
  }

  async getUserSessionStats(userId: string, fromDate?: Date, toDate?: Date) {
    const whereConditions = [eq(studySessions.userId, userId)];

    if (fromDate) {
      whereConditions.push(gte(studySessions.startTime, fromDate));
    }
    if (toDate) {
      whereConditions.push(lt(studySessions.startTime, toDate));
    }

    const [stats] = await this.drizzleService.db
      .select({
        totalSessions: count(),
        totalDuration: sum(studySessions.totalDuration),
        avgDuration: avg(studySessions.totalDuration),
        avgFocusScore: avg(studySessions.focusScore),
        totalPomodoros: sum(studySessions.pomodorosCompleted),
        totalBreaks: sum(studySessions.breaksTaken),
      })
      .from(studySessions)
      .where(and(...whereConditions));

    return stats;
  }

  async getSessionsByType(
    userId: string,
    type: 'pomodoro' | 'free' | 'goal_based',
  ) {
    return this.drizzleService.db
      .select()
      .from(studySessions)
      .where(
        and(eq(studySessions.userId, userId), eq(studySessions.type, type)),
      )
      .orderBy(desc(studySessions.startTime));
  }

  async getSessionsBySubject(userId: string, subjectId: string) {
    return this.drizzleService.db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.subjectId, subjectId),
        ),
      )
      .orderBy(desc(studySessions.startTime));
  }

  async getSessionsByDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.drizzleService.db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(studySessions.startTime, startDate),
          lt(studySessions.startTime, endDate),
        ),
      )
      .orderBy(desc(studySessions.startTime));
  }

  async getWeeklyStats(userId: string) {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.getUserSessionStats(userId, weekStart, now);
  }

  async getMonthlyStats(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.getUserSessionStats(userId, monthStart, now);
  }

  async getTodayStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getUserSessionStats(userId, today, tomorrow);
  }
}
