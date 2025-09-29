import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  SessionStatsQueryDto,
  CreateAnalyticsDto,
  SessionType,
  SessionStatus,
} from './dto/sessions.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async getSessions(userId: string, query?: SessionQueryDto) {
    const { limit, offset, type, status, subjectId, fromDate, toDate } =
      query || {};

    this.logger.debug(
      `Getting sessions for user ${userId} with filters:`,
      query,
    );

    if (fromDate && toDate) {
      return this.sessionsRepository.getSessionsByDateRange(
        userId,
        fromDate,
        toDate,
      );
    }

    if (type) {
      return this.sessionsRepository.getSessionsByType(userId, type);
    }

    if (subjectId) {
      return this.sessionsRepository.getSessionsBySubject(userId, subjectId);
    }

    return this.sessionsRepository.findByUserId(userId, limit, offset);
  }

  async getActiveSession(userId: string) {
    const session = await this.sessionsRepository.findActiveByUserId(userId);
    this.logger.debug(
      `Active session for user ${userId}:`,
      session?.id || 'none',
    );
    return session;
  }

  async getPausedSessions(userId: string) {
    const sessions = await this.sessionsRepository.findPausedByUserId(userId);
    this.logger.debug(
      `Found ${sessions.length} paused sessions for user ${userId}`,
    );
    return sessions;
  }

  async startSession(userId: string, createDto: CreateSessionDto) {
    this.logger.debug(`Starting ${createDto.type} session for user ${userId}`);

    // Check if there's already an active session
    const activeSession = await this.getActiveSession(userId);
    if (activeSession) {
      throw new BadRequestException(
        'You already have an active study session. Please end or pause it first.',
      );
    }

    const sessionData = {
      userId,
      title: createDto.title,
      type: createDto.type,
      subjectId: createDto.subjectId,
      goals: createDto.goals || [],
      notes: createDto.notes,
      startTime: new Date(),
      status: 'active' as const,
    };

    const session = await this.sessionsRepository.create(sessionData);

    this.logger.log(
      `Started new ${createDto.type} session ${session.id} for user ${userId}`,
    );
    return session;
  }

  async pauseSession(userId: string, sessionId: string) {
    const session = await this.validateSessionOwnership(userId, sessionId);

    if (session.status !== 'active') {
      throw new BadRequestException('Only active sessions can be paused');
    }

    const now = new Date();
    const updatedSession = await this.sessionsRepository.update(sessionId, {
      status: 'paused',
    });

    this.logger.log(`Paused session ${sessionId} for user ${userId}`);
    return updatedSession;
  }

  async resumeSession(userId: string, sessionId: string) {
    const session = await this.validateSessionOwnership(userId, sessionId);

    if (session.status !== 'paused') {
      throw new BadRequestException('Only paused sessions can be resumed');
    }

    // Check if user has another active session
    const activeSession = await this.getActiveSession(userId);
    if (activeSession && activeSession.id !== sessionId) {
      throw new BadRequestException(
        'You already have an active study session. Please end or pause it first.',
      );
    }

    const updatedSession = await this.sessionsRepository.update(sessionId, {
      status: 'active',
    });

    this.logger.log(`Resumed session ${sessionId} for user ${userId}`);
    return updatedSession;
  }

  async endSession(userId: string, sessionId: string) {
    const session = await this.validateSessionOwnership(userId, sessionId);

    if (session.status === 'completed') {
      throw new BadRequestException('Session is already completed');
    }

    const endTime = new Date();
    const totalDuration =
      Math.floor(
        (endTime.getTime() - new Date(session.startTime).getTime()) / 1000,
      ) - (session.pausedDuration || 0);

    const updatedSession = await this.sessionsRepository.update(sessionId, {
      status: 'completed',
      endTime,
      totalDuration: Math.max(0, totalDuration), // Ensure non-negative
    });

    this.logger.log(
      `Ended session ${sessionId} for user ${userId}. Duration: ${totalDuration}s`,
    );
    return updatedSession;
  }

  async abandonSession(userId: string, sessionId: string) {
    const session = await this.validateSessionOwnership(userId, sessionId);

    if (session.status === 'completed' || session.status === 'abandoned') {
      throw new BadRequestException(
        'Session is already completed or abandoned',
      );
    }

    const updatedSession = await this.sessionsRepository.update(sessionId, {
      status: 'abandoned',
      endTime: new Date(),
    });

    this.logger.log(`Abandoned session ${sessionId} for user ${userId}`);
    return updatedSession;
  }

  async updateSession(
    userId: string,
    sessionId: string,
    updateDto: UpdateSessionDto,
  ) {
    await this.validateSessionOwnership(userId, sessionId);

    const updatedSession = await this.sessionsRepository.update(
      sessionId,
      updateDto,
    );

    this.logger.debug(`Updated session ${sessionId} for user ${userId}`);
    return updatedSession;
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.validateSessionOwnership(userId, sessionId);

    if (session.status === 'active') {
      throw new BadRequestException(
        'Cannot delete an active session. Please end it first.',
      );
    }

    const deletedSession = await this.sessionsRepository.delete(sessionId);

    this.logger.log(`Deleted session ${sessionId} for user ${userId}`);
    return deletedSession;
  }

  async getSessionById(userId: string, sessionId: string) {
    const session = await this.validateSessionOwnership(userId, sessionId);
    return session;
  }

  async getSessionStatus(sessionId: string) {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Calculate current duration for active sessions
    let currentDuration = session.totalDuration || 0;
    if (session.status === 'active') {
      const now = new Date();
      currentDuration =
        Math.floor(
          (now.getTime() - new Date(session.startTime).getTime()) / 1000,
        ) - (session.pausedDuration || 0);
    }

    return {
      ...session,
      currentDuration: Math.max(0, currentDuration),
    };
  }

  async getSessionStats(userId: string, query?: SessionStatsQueryDto) {
    const { period = 'week', fromDate, toDate, subjectId } = query || {};

    this.logger.debug(`Getting ${period} stats for user ${userId}`);

    let stats;
    switch (period) {
      case 'today':
        stats = await this.sessionsRepository.getTodayStats(userId);
        break;
      case 'week':
        stats = await this.sessionsRepository.getWeeklyStats(userId);
        break;
      case 'month':
        stats = await this.sessionsRepository.getMonthlyStats(userId);
        break;
      case 'custom':
        if (!fromDate || !toDate) {
          throw new BadRequestException(
            'fromDate and toDate are required for custom period',
          );
        }
        stats = await this.sessionsRepository.getUserSessionStats(
          userId,
          fromDate,
          toDate,
        );
        break;
      default:
        stats = await this.sessionsRepository.getWeeklyStats(userId);
    }

    return {
      period,
      ...stats,
      // Convert to more readable format
      totalDurationFormatted: this.formatDuration(
        Number(stats.totalDuration) || 0,
      ),
      avgDurationFormatted: this.formatDuration(Number(stats.avgDuration) || 0),
    };
  }

  async getSessionAnalytics(userId: string, sessionId: string) {
    await this.validateSessionOwnership(userId, sessionId);
    const analytics = await this.sessionsRepository.getAnalytics(sessionId);

    if (!analytics) {
      throw new NotFoundException('Analytics not found for this session');
    }

    return analytics;
  }

  async createSessionAnalytics(userId: string, createDto: CreateAnalyticsDto) {
    // Validate session ownership
    await this.validateSessionOwnership(userId, createDto.sessionId);

    // Check if analytics already exist
    const existingAnalytics = await this.sessionsRepository.getAnalytics(
      createDto.sessionId,
    );
    if (existingAnalytics) {
      throw new BadRequestException('Analytics already exist for this session');
    }

    const analytics = await this.sessionsRepository.createAnalytics(createDto);

    this.logger.log(`Created analytics for session ${createDto.sessionId}`);
    return analytics;
  }

  private async validateSessionOwnership(userId: string, sessionId: string) {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You can only access your own sessions');
    }

    return session;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }
}
