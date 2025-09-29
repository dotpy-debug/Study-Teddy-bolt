import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SubjectsRepository } from './subjects.repository';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectsDto } from './dto/query-subjects.dto';
import {
  SubjectAnalyticsQueryDto,
  SubjectAnalyticsResponse,
} from './dto/subject-analytics.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubjectsService {
  constructor(private readonly subjectsRepository: SubjectsRepository) {}

  async create(userId: string, createSubjectDto: CreateSubjectDto) {
    const subject = {
      id: uuidv4(),
      userId,
      ...createSubjectDto,
      // Convert resources to match schema format
      resources: createSubjectDto.resources
        ? {
            links: createSubjectDto.resources.links || [],
            notes: createSubjectDto.resources.notes || '',
          }
        : null,
      isArchived: false,
      totalStudyMinutes: 0,
      lastStudiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.subjectsRepository.create(subject);
  }

  async findAll(userId: string, query: QuerySubjectsDto) {
    return this.subjectsRepository.findAll(userId, query);
  }

  async findOne(userId: string, id: string) {
    const subject = await this.subjectsRepository.findOne(id);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException('Access denied to this subject');
    }

    return subject;
  }

  async update(userId: string, id: string, updateSubjectDto: UpdateSubjectDto) {
    const subject = await this.findOne(userId, id);

    const updateData: any = { ...updateSubjectDto };

    // Convert resources to match schema format if provided
    if (updateSubjectDto.resources) {
      updateData.resources = {
        links: updateSubjectDto.resources.links || [],
        notes: updateSubjectDto.resources.notes || '',
      };
    }

    return this.subjectsRepository.update(id, updateData);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.subjectsRepository.delete(id);
  }

  async getSubjectAnalytics(
    userId: string,
    subjectId: string,
    query: SubjectAnalyticsQueryDto,
  ): Promise<SubjectAnalyticsResponse> {
    await this.findOne(userId, subjectId);

    // Get metrics
    const metrics = await this.subjectsRepository.getSubjectAnalytics(
      subjectId,
      query,
    );

    // Get daily focus time data
    const { startDate, endDate, window = 'week' } = query;
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

    const dailyFocusTime = await this.subjectsRepository.getDailyFocusTime(
      subjectId,
      start,
      end,
    );

    // Generate weekly completion data (mock for now - would need more complex queries)
    const weeklyCompletion = [
      {
        week: '2024-W01',
        completed: Math.floor(metrics.completedTasks * 0.3),
        total: Math.floor(metrics.completedTasks * 0.4),
      },
      {
        week: '2024-W02',
        completed: Math.floor(metrics.completedTasks * 0.7),
        total: metrics.completedTasks + metrics.pendingTasks,
      },
    ];

    // Calculate week-over-week comparison
    const thisWeekMinutes = dailyFocusTime
      .slice(-7)
      .reduce((sum, day) => sum + day.minutes, 0);
    const lastWeekMinutes = dailyFocusTime
      .slice(-14, -7)
      .reduce((sum, day) => sum + day.minutes, 0);
    const weeklyChange =
      lastWeekMinutes > 0
        ? ((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100
        : 0;

    return {
      metrics,
      dailyFocusTime,
      weeklyCompletion,
      weeklyComparison: {
        thisWeek: thisWeekMinutes,
        lastWeek: lastWeekMinutes,
        change: Math.round(weeklyChange * 10) / 10,
      },
    };
  }

  async getSubjectDistribution(userId: string) {
    return this.subjectsRepository.getSubjectDistribution(userId);
  }

  // Legacy method for backward compatibility
  async getSubjectStats(userId: string, subjectId: string) {
    const analytics = await this.getSubjectAnalytics(userId, subjectId, {
      window: 'week',
    });

    return {
      subjectId,
      totalStudyTime: analytics.metrics.totalFocusedMinutes,
      sessionsCount: analytics.metrics.sessionsCount,
      averageSessionDuration: analytics.metrics.averageSessionDuration,
      lastStudied: analytics.metrics.lastStudiedAt,
      completionRate: analytics.metrics.completionRate,
      upcomingTasks: analytics.metrics.pendingTasks,
    };
  }
}
