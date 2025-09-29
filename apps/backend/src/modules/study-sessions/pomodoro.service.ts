import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import { PomodoroSettingsDto } from './dto/sessions.dto';

export interface PomodoroSession {
  sessionId: string;
  userId: string;
  phase: 'work' | 'short_break' | 'long_break';
  currentCycle: number;
  pomodorosCompleted: number;
  settings: PomodoroConfig;
  phaseStartTime: Date;
  expectedEndTime: Date;
  isActive: boolean;
}

export interface PomodoroConfig {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // number of work cycles before long break
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

export interface PomodoroStats {
  totalPomodoros: number;
  totalBreaks: number;
  averageWorkDuration: number;
  totalWorkTime: number;
  efficiency: number;
  streaks: {
    current: number;
    longest: number;
  };
}

@Injectable()
export class PomodoroService {
  private readonly logger = new Logger(PomodoroService.name);
  private readonly activePomodoroSessions = new Map<string, PomodoroSession>();

  // Default Pomodoro settings (in minutes)
  private readonly defaultConfig: PomodoroConfig = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartWork: false,
  };

  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async createPomodoroSession(
    userId: string,
    sessionId: string,
    settings?: Partial<PomodoroSettingsDto>,
  ): Promise<PomodoroSession> {
    // Validate session ownership
    const session = await this.validateSessionOwnership(userId, sessionId);

    if (session.type !== 'pomodoro') {
      throw new BadRequestException('Session must be of type "pomodoro"');
    }

    const config = this.mergeWithDefaults(settings);
    const now = new Date();
    const expectedEndTime = new Date(
      now.getTime() + config.workDuration * 60 * 1000,
    );

    const pomodoroSession: PomodoroSession = {
      sessionId,
      userId,
      phase: 'work',
      currentCycle: 1,
      pomodorosCompleted: 0,
      settings: config,
      phaseStartTime: now,
      expectedEndTime,
      isActive: true,
    };

    this.activePomodoroSessions.set(sessionId, pomodoroSession);

    this.logger.log(
      `Created Pomodoro session for user ${userId}, session ${sessionId}`,
    );
    return pomodoroSession;
  }

  async getPomodoroSession(sessionId: string): Promise<PomodoroSession | null> {
    return this.activePomodoroSessions.get(sessionId) || null;
  }

  async completePhase(
    userId: string,
    sessionId: string,
  ): Promise<PomodoroSession> {
    const pomodoroSession = this.activePomodoroSessions.get(sessionId);
    if (!pomodoroSession) {
      throw new NotFoundException('Active Pomodoro session not found');
    }

    if (pomodoroSession.userId !== userId) {
      throw new BadRequestException('Unauthorized access to Pomodoro session');
    }

    const now = new Date();
    let nextPhase: 'work' | 'short_break' | 'long_break';
    let nextDuration: number;

    if (pomodoroSession.phase === 'work') {
      // Work phase completed - increment pomodoros
      pomodoroSession.pomodorosCompleted += 1;

      // Update database
      await this.sessionsRepository.update(sessionId, {
        pomodorosCompleted: pomodoroSession.pomodorosCompleted,
      });

      // Determine break type
      if (
        pomodoroSession.pomodorosCompleted %
          pomodoroSession.settings.longBreakInterval ===
        0
      ) {
        nextPhase = 'long_break';
        nextDuration = pomodoroSession.settings.longBreakDuration;
      } else {
        nextPhase = 'short_break';
        nextDuration = pomodoroSession.settings.shortBreakDuration;
      }

      this.logger.log(
        `Pomodoro ${pomodoroSession.pomodorosCompleted} completed for session ${sessionId}`,
      );
    } else {
      // Break completed - start next work cycle
      nextPhase = 'work';
      nextDuration = pomodoroSession.settings.workDuration;
      pomodoroSession.currentCycle += 1;

      // Update database
      await this.sessionsRepository.update(sessionId, {
        breaksTaken: pomodoroSession.currentCycle - 1,
      });

      this.logger.log(
        `Break completed for session ${sessionId}, starting cycle ${pomodoroSession.currentCycle}`,
      );
    }

    // Update pomodoro session
    pomodoroSession.phase = nextPhase;
    pomodoroSession.phaseStartTime = now;
    pomodoroSession.expectedEndTime = new Date(
      now.getTime() + nextDuration * 60 * 1000,
    );

    this.activePomodoroSessions.set(sessionId, pomodoroSession);

    return pomodoroSession;
  }

  async pausePomodoroSession(
    userId: string,
    sessionId: string,
  ): Promise<PomodoroSession> {
    const pomodoroSession = this.activePomodoroSessions.get(sessionId);
    if (!pomodoroSession) {
      throw new NotFoundException('Active Pomodoro session not found');
    }

    if (pomodoroSession.userId !== userId) {
      throw new BadRequestException('Unauthorized access to Pomodoro session');
    }

    pomodoroSession.isActive = false;
    this.activePomodoroSessions.set(sessionId, pomodoroSession);

    this.logger.log(`Paused Pomodoro session ${sessionId} for user ${userId}`);
    return pomodoroSession;
  }

  async resumePomodoroSession(
    userId: string,
    sessionId: string,
  ): Promise<PomodoroSession> {
    const pomodoroSession = this.activePomodoroSessions.get(sessionId);
    if (!pomodoroSession) {
      throw new NotFoundException('Active Pomodoro session not found');
    }

    if (pomodoroSession.userId !== userId) {
      throw new BadRequestException('Unauthorized access to Pomodoro session');
    }

    pomodoroSession.isActive = true;
    // Recalculate expected end time based on remaining time
    const now = new Date();
    const remainingTime =
      pomodoroSession.expectedEndTime.getTime() -
      pomodoroSession.phaseStartTime.getTime();
    pomodoroSession.phaseStartTime = now;
    pomodoroSession.expectedEndTime = new Date(now.getTime() + remainingTime);

    this.activePomodoroSessions.set(sessionId, pomodoroSession);

    this.logger.log(`Resumed Pomodoro session ${sessionId} for user ${userId}`);
    return pomodoroSession;
  }

  async endPomodoroSession(userId: string, sessionId: string): Promise<void> {
    const pomodoroSession = this.activePomodoroSessions.get(sessionId);
    if (!pomodoroSession) {
      throw new NotFoundException('Active Pomodoro session not found');
    }

    if (pomodoroSession.userId !== userId) {
      throw new BadRequestException('Unauthorized access to Pomodoro session');
    }

    // Final update to database with completed stats
    await this.sessionsRepository.update(sessionId, {
      pomodorosCompleted: pomodoroSession.pomodorosCompleted,
      breaksTaken: Math.max(0, pomodoroSession.currentCycle - 1),
    });

    this.activePomodoroSessions.delete(sessionId);

    this.logger.log(
      `Ended Pomodoro session ${sessionId} for user ${userId}. Total pomodoros: ${pomodoroSession.pomodorosCompleted}`,
    );
  }

  async getPomodoroStats(
    userId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<PomodoroStats> {
    const stats = await this.sessionsRepository.getUserSessionStats(
      userId,
      fromDate,
      toDate,
    );

    // Calculate efficiency (completed vs started sessions)
    const totalSessions = Number(stats.totalSessions) || 0;
    const totalPomodoros = Number(stats.totalPomodoros) || 0;
    const efficiency =
      totalSessions > 0 ? (totalPomodoros / totalSessions) * 100 : 0;

    // For now, calculate simple stats. In the future, this could be enhanced with streak tracking
    return {
      totalPomodoros,
      totalBreaks: Number(stats.totalBreaks) || 0,
      averageWorkDuration: Number(stats.avgDuration) || 0,
      totalWorkTime: Number(stats.totalDuration) || 0,
      efficiency: Math.round(efficiency * 100) / 100,
      streaks: {
        current: 0, // Would need additional tracking
        longest: 0, // Would need additional tracking
      },
    };
  }

  getDefaultConfig(): PomodoroConfig {
    return { ...this.defaultConfig };
  }

  async updateSettings(
    userId: string,
    sessionId: string,
    settings: Partial<PomodoroSettingsDto>,
  ): Promise<PomodoroSession> {
    const pomodoroSession = this.activePomodoroSessions.get(sessionId);
    if (!pomodoroSession) {
      throw new NotFoundException('Active Pomodoro session not found');
    }

    if (pomodoroSession.userId !== userId) {
      throw new BadRequestException('Unauthorized access to Pomodoro session');
    }

    // Merge new settings
    pomodoroSession.settings = this.mergeWithDefaults(
      settings,
      pomodoroSession.settings,
    );
    this.activePomodoroSessions.set(sessionId, pomodoroSession);

    this.logger.debug(`Updated Pomodoro settings for session ${sessionId}`);
    return pomodoroSession;
  }

  private async validateSessionOwnership(userId: string, sessionId: string) {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Unauthorized access to session');
    }

    return session;
  }

  private mergeWithDefaults(
    settings?: Partial<PomodoroSettingsDto>,
    existing?: PomodoroConfig,
  ): PomodoroConfig {
    const base = existing || this.defaultConfig;

    return {
      workDuration: settings?.workDuration ?? base.workDuration,
      shortBreakDuration:
        settings?.shortBreakDuration ?? base.shortBreakDuration,
      longBreakDuration: settings?.longBreakDuration ?? base.longBreakDuration,
      longBreakInterval: settings?.longBreakInterval ?? base.longBreakInterval,
      autoStartBreaks: settings?.autoStartBreaks ?? base.autoStartBreaks,
      autoStartWork: settings?.autoStartWork ?? base.autoStartWork,
    };
  }

  // Cleanup method to remove old sessions
  cleanupInactiveSessions(): void {
    const now = new Date();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours

    for (const [
      sessionId,
      pomodoroSession,
    ] of this.activePomodoroSessions.entries()) {
      const sessionAge =
        now.getTime() - pomodoroSession.phaseStartTime.getTime();
      if (sessionAge > maxAge) {
        this.activePomodoroSessions.delete(sessionId);
        this.logger.debug(`Cleaned up inactive Pomodoro session ${sessionId}`);
      }
    }
  }
}
