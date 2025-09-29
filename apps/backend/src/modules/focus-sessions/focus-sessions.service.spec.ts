import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FocusSessionsService } from './focus-sessions.service';
import { FocusSessionFactory } from '../../../test/factories/focus-session.factory';
import { TestModuleHelper } from '../../../test/helpers/test-module.helper';
import { SessionStatus } from './dto/focus-session-query.dto';

describe('FocusSessionsService', () => {
  let service: FocusSessionsService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FocusSessionsService,
        {
          provide: EventEmitter2,
          useValue: TestModuleHelper.createMockEventEmitter(),
        },
      ],
    }).compile();

    service = module.get<FocusSessionsService>(FocusSessionsService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    const userId = 'user-123';
    const startSessionDto = {
      taskId: 'task-123',
      subjectId: 'subject-123',
      type: 'pomodoro' as const,
      duration: 25,
      breakDuration: 5,
      goals: ['Complete homework', 'Study chapter 1'],
      distractionBlocking: true,
      backgroundSound: false,
    };

    it('should start a new focus session successfully', async () => {
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(null);

      const result = await service.startSession(userId, startSessionDto);

      expect(result.userId).toBe(userId);
      expect(result.status).toBe(SessionStatus.ACTIVE);
      expect(result.scheduledDuration).toBe(startSessionDto.duration);
      expect(result.goals).toEqual(startSessionDto.goals);
      expect(result.distractionBlocking).toBe(true);
      expect(result.startTime).toBeInstanceOf(Date);

      expect(eventEmitter.emit).toHaveBeenCalledWith('focus.session.started', {
        sessionId: result.id,
        userId,
        taskId: startSessionDto.taskId,
        duration: startSessionDto.duration,
      });
    });

    it('should throw BadRequestException if user already has an active session', async () => {
      const activeSession = FocusSessionFactory.createActive({ userId });
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(activeSession);

      await expect(
        service.startSession(userId, startSessionDto),
      ).rejects.toThrow(BadRequestException);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should set default values for optional fields', async () => {
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(null);

      const minimalDto = {
        taskId: 'task-123',
        subjectId: 'subject-123',
        type: 'custom' as const,
        duration: 60,
      };

      const result = await service.startSession(userId, minimalDto);

      expect(result.distractionBlocking).toBe(true);
      expect(result.backgroundSound).toBe(false);
      expect(result.soundType).toBeUndefined();
    });

    it('should handle sound settings correctly', async () => {
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(null);

      const soundDto = {
        ...startSessionDto,
        backgroundSound: true,
        soundType: 'rain',
      };

      const result = await service.startSession(userId, soundDto);

      expect(result.backgroundSound).toBe(true);
      expect(result.soundType).toBe('rain');
    });
  });

  describe('stopSession', () => {
    const userId = 'user-123';
    const stopSessionDto = {
      productivityRating: 4,
      focusRating: 5,
      distractionCount: 2,
      notes: 'Great session!',
      taskProgress: 75,
      completed: true,
    };

    it('should stop an active session successfully', async () => {
      const activeSession = FocusSessionFactory.createActive({ userId });
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(activeSession);

      const result = await service.stopSession(userId, stopSessionDto);

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.actualDuration).toBeGreaterThan(0);
      expect(result.productivityRating).toBe(stopSessionDto.productivityRating);
      expect(result.focusRating).toBe(stopSessionDto.focusRating);
      expect(result.distractionCount).toBe(stopSessionDto.distractionCount);
      expect(result.notes).toBe(stopSessionDto.notes);
      expect(result.taskProgress).toBe(stopSessionDto.taskProgress);

      expect(eventEmitter.emit).toHaveBeenCalledWith('focus.session.stopped', {
        sessionId: activeSession.id,
        userId,
        taskId: activeSession.taskId,
        duration: expect.any(Number),
        completed: true,
      });
    });

    it('should throw NotFoundException if no active session exists', async () => {
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(null);

      await expect(service.stopSession(userId, stopSessionDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should calculate actual duration correctly', async () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const activeSession = FocusSessionFactory.createActive({
        userId,
        startTime,
      });

      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(activeSession);

      const result = await service.stopSession(userId, stopSessionDto);

      expect(result.actualDuration).toBeCloseTo(30, 0); // Should be around 30 minutes
    });

    it('should handle minimal stop data', async () => {
      const activeSession = FocusSessionFactory.createActive({ userId });
      jest.spyOn(service, 'getCurrentSession').mockResolvedValue(activeSession);

      const minimalDto = {};

      const result = await service.stopSession(userId, minimalDto);

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.actualDuration).toBeGreaterThan(0);
    });
  });

  describe('scheduleSession', () => {
    const userId = 'user-123';

    it('should schedule a session successfully', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const scheduleDto = {
        taskId: 'task-123',
        subjectId: 'subject-123',
        type: 'deep_work' as const,
        duration: 90,
        breakDuration: 15,
        startTime: futureTime.toISOString(),
        title: 'Study Session',
        description: 'Focus on math homework',
        reminderMinutes: 15,
      };

      const result = await service.scheduleSession(userId, scheduleDto);

      expect(result.status).toBe(SessionStatus.SCHEDULED);
      expect(result.startTime).toEqual(futureTime);
      expect(result.title).toBe(scheduleDto.title);
      expect(result.description).toBe(scheduleDto.description);
      expect(result.scheduledDuration).toBe(scheduleDto.duration);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'focus.session.schedule.reminder',
        {
          sessionId: result.id,
          userId,
          reminderTime: expect.any(Date),
        },
      );
    });

    it('should throw BadRequestException for past scheduling time', async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const scheduleDto = {
        taskId: 'task-123',
        subjectId: 'subject-123',
        type: 'pomodoro' as const,
        duration: 25,
        startTime: pastTime.toISOString(),
      };

      await expect(
        service.scheduleSession(userId, scheduleDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle calendar sync when calendar event ID provided', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const scheduleDto = {
        taskId: 'task-123',
        subjectId: 'subject-123',
        type: 'custom' as const,
        duration: 60,
        startTime: futureTime.toISOString(),
        calendarEventId: 'calendar-event-123',
      };

      const result = await service.scheduleSession(userId, scheduleDto);

      expect(result.calendarEventId).toBe(scheduleDto.calendarEventId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('calendar.sync.session', {
        sessionId: result.id,
        calendarEventId: scheduleDto.calendarEventId,
      });
    });

    it('should handle recurrence settings', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const scheduleDto = {
        taskId: 'task-123',
        subjectId: 'subject-123',
        type: 'pomodoro' as const,
        duration: 25,
        startTime: futureTime.toISOString(),
        recurrence: 'daily' as const,
      };

      const result = await service.scheduleSession(userId, scheduleDto);

      expect(result.recurrence).toBe('daily');
      // TODO: Verify recurring sessions are created when implemented
    });
  });

  describe('getCurrentSession', () => {
    const userId = 'user-123';

    it('should return null when no active session exists', async () => {
      const result = await service.getCurrentSession(userId);

      expect(result).toBeNull();
    });

    // TODO: Implement when database integration is added
    it.skip('should return active session when one exists', async () => {
      // This test will be implemented when database integration is added
    });
  });

  describe('getSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-123';

    it('should throw NotFoundException for non-existent session', async () => {
      await expect(service.getSession(userId, sessionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    // TODO: Implement when database integration is added
    it.skip('should return session when found', async () => {
      // This test will be implemented when database integration is added
    });
  });

  describe('updateSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-123';
    const updateDto = {
      title: 'Updated Session',
      duration: 45,
      description: 'Updated description',
    };

    it('should throw NotFoundException for non-existent session', async () => {
      await expect(
        service.updateSession(userId, sessionId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    // TODO: Implement when database integration is added
    it.skip('should update scheduled session successfully', async () => {
      // This test will be implemented when database integration is added
    });

    it.skip('should throw BadRequestException for non-scheduled session', async () => {
      // This test will be implemented when database integration is added
    });
  });

  describe('cancelSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-123';

    it('should throw NotFoundException for non-existent session', async () => {
      await expect(service.cancelSession(userId, sessionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    // TODO: Implement when database integration is added
    it.skip('should cancel scheduled session successfully', async () => {
      // This test will be implemented when database integration is added
    });
  });

  describe('extendSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-123';

    it('should throw NotFoundException for non-existent session', async () => {
      await expect(
        service.extendSession(userId, sessionId, 15),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid extension duration', async () => {
      const activeSession = FocusSessionFactory.createActive({ userId });
      jest.spyOn(service, 'getSession').mockResolvedValue(activeSession);

      await expect(service.extendSession(userId, sessionId, 2)).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        service.extendSession(userId, sessionId, 70),
      ).rejects.toThrow(BadRequestException);
    });

    // TODO: Implement when database integration is added
    it.skip('should extend active session successfully', async () => {
      // This test will be implemented when database integration is added
    });

    it.skip('should throw BadRequestException for non-active session', async () => {
      // This test will be implemented when database integration is added
    });
  });

  describe('getSessionStats', () => {
    const userId = 'user-123';

    it('should return default stats when no sessions exist', async () => {
      const result = await service.getSessionStats(userId);

      expect(result).toEqual({
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTime: 0,
        averageSessionDuration: 0,
        averageProductivityRating: 0,
        averageFocusRating: 0,
        longestStreak: 0,
        currentStreak: 0,
        mostProductiveTime: '14:00-16:00',
        mostFocusedSubject: 'Mathematics',
      });
    });

    // TODO: Implement when database integration is added
    it.skip('should calculate stats from existing sessions', async () => {
      // This test will be implemented when database integration is added
    });
  });

  describe('generateId', () => {
    it('should generate unique session IDs', () => {
      const id1 = (service as any).generateId();
      const id2 = (service as any).generateId();

      expect(id1).toMatch(/^fs_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^fs_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct format', () => {
      const id = (service as any).generateId();

      expect(id).toMatch(/^fs_/);
      expect(id.split('_')).toHaveLength(3);
    });
  });
});
