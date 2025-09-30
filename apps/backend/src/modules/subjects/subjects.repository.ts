import { Injectable, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { subjects, tasks, studySessions } from '../../db/schema';
import { eq, and, desc, asc, sql, ilike, count, sum, avg, gte } from 'drizzle-orm';
import { QuerySubjectsDto } from './dto/query-subjects.dto';
import { SubjectAnalyticsQueryDto } from './dto/subject-analytics.dto';

@Injectable()
export class SubjectsRepository {
  constructor(private readonly db: DrizzleService) {}

  async create(data: any) {
    // Check for unique subject name per user
    const existing = await this.db.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.userId, data.userId), eq(subjects.name, data.name)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Subject name already exists for this user');
    }

    const result = await this.db.db.insert(subjects).values(data).returning();
    return result[0];
  }

  async findAll(userId: string, query: QuerySubjectsDto) {
    const {
      page = 1,
      limit = 10,
      sort = 'name',
      order = 'asc',
      search,
      includeArchived = false,
    } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(subjects.userId, userId)];

    if (!includeArchived) {
      conditions.push(eq(subjects.isArchived, false));
    }

    if (search) {
      conditions.push(ilike(subjects.name, `%${search}%`));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Handle ordering
    const orderBy = order === 'asc' ? asc(subjects[sort]) : desc(subjects[sort]);

    const [items, totalResult] = await Promise.all([
      this.db.db
        .select()
        .from(subjects)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db.db
        .select({ count: sql`count(*)` })
        .from(subjects)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count || 0);

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrevious: page > 1,
    };
  }

  async findOne(id: string) {
    const result = await this.db.db.select().from(subjects).where(eq(subjects.id, id)).limit(1);

    return result[0];
  }

  async findByName(userId: string, name: string) {
    const result = await this.db.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.name, name)))
      .limit(1);

    return result[0];
  }

  async update(id: string, data: any) {
    // If updating name, check for uniqueness
    if (data.name) {
      const subject = await this.findOne(id);
      if (subject) {
        const existing = await this.findByName(subject.userId, data.name);
        if (existing && existing.id !== id) {
          throw new ConflictException('Subject name already exists for this user');
        }
      }
    }

    const result = await this.db.db
      .update(subjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subjects.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string) {
    await this.db.db.delete(subjects).where(eq(subjects.id, id));
    return { message: 'Subject deleted successfully' };
  }

  async getSubjectAnalytics(subjectId: string, query: SubjectAnalyticsQueryDto) {
    const { startDate, endDate, window = 'week' } = query;

    // Set default date range based on window
    let start: Date;
    let end = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (window) {
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Get focus sessions analytics
    const focusAnalytics = await this.db.db
      .select({
        totalMinutes: sum(studySessions.durationMinutes),
        sessionCount: count(),
        avgDuration: avg(studySessions.durationMinutes),
        lastSession: sql`MAX(${studySessions.startTime})`,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.subjectId, subjectId),
          gte(studySessions.startTime, start),
          sql`${studySessions.startTime} <= ${end}`,
        ),
      );

    // Get task analytics
    const taskAnalytics = await this.db.db
      .select({
        totalTasks: count(),
        completedTasks: sql`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
        pendingTasks: sql`COUNT(CASE WHEN ${tasks.status} = 'pending' THEN 1 END)`,
        inProgressTasks: sql`COUNT(CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END)`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.subjectId, subjectId),
          gte(tasks.createdAt, start),
          sql`${tasks.createdAt} <= ${end}`,
        ),
      );

    const focusData = focusAnalytics[0];
    const taskData = taskAnalytics[0];

    const totalTasks = Number(taskData.totalTasks || 0);
    const completedTasks = Number(taskData.completedTasks || 0);
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalFocusedMinutes: Number(focusData.totalMinutes || 0),
      completionRate: Math.round(completionRate * 10) / 10,
      completedTasks,
      pendingTasks: Number(taskData.pendingTasks || 0),
      sessionsCount: Number(focusData.sessionCount || 0),
      averageSessionDuration: Math.round(Number(focusData.avgDuration || 0)),
      lastStudiedAt: focusData.lastSession,
      currentStreak: 0, // TODO: Implement streak calculation
    };
  }

  async getSubjectDistribution(userId: string) {
    const result = await this.db.db
      .select({
        id: subjects.id,
        name: subjects.name,
        color: subjects.color,
        totalMinutes: sum(studySessions.durationMinutes),
      })
      .from(subjects)
      .leftJoin(studySessions, eq(subjects.id, studySessions.subjectId))
      .where(and(eq(subjects.userId, userId), eq(subjects.isArchived, false)))
      .groupBy(subjects.id, subjects.name, subjects.color);

    const totalStudyTime = result.reduce((sum, item) => sum + Number(item.totalMinutes || 0), 0);

    return result.map((item) => ({
      subjectName: item.name,
      color: item.color,
      minutes: Number(item.totalMinutes || 0),
      percentage:
        totalStudyTime > 0
          ? Math.round((Number(item.totalMinutes || 0) / totalStudyTime) * 1000) / 10
          : 0,
    }));
  }

  async getDailyFocusTime(subjectId: string, startDate: Date, endDate: Date) {
    const result = await this.db.db
      .select({
        date: sql`DATE(${studySessions.startTime})`,
        minutes: sum(studySessions.durationMinutes),
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.subjectId, subjectId),
          gte(studySessions.startTime, startDate),
          sql`${studySessions.startTime} <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${studySessions.startTime})`)
      .orderBy(sql`DATE(${studySessions.startTime})`);

    return result.map((row) => ({
      date: row.date as string,
      minutes: Number(row.minutes || 0),
    }));
  }
}
