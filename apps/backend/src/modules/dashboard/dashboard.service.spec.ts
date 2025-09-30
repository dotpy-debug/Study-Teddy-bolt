import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { CacheService } from '../../common/cache/cache.service';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
  },
}));

describe('DashboardService', () => {
  let service: DashboardService;
  let cacheService: CacheService;

  const mockUserId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: CacheService,
          useValue: {
            warm: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
            generateKey: jest.fn(),
          },
        },
        {
          provide: 'DrizzleService',
          useValue: {
            db: {
              select: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalTasks: 10,
        completedTasks: 7,
        pendingTasks: 3,
        totalStudyHours: 15.5,
        totalAIChats: 25,
        completionRate: 70,
      };

      // Mock database queries
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 10 }]),
      };
      db.select.mockReturnValue(mockSelectChain);

      // Mock cache service to call the function directly
      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });
      cacheService.generateKey = jest.fn().mockReturnValue('dashboard_stats:user-123');

      // Mock different query results
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 10 }]), // total tasks
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 7 }]), // completed tasks
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ totalMinutes: 930 }]), // study time
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 25 }]), // AI chats
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 3 }]), // pending tasks
        });

      const result = await service.getStats(mockUserId);

      expect(cacheService.generateKey).toHaveBeenCalledWith('dashboard_stats', mockUserId);
      expect(result).toEqual({
        totalTasks: 10,
        completedTasks: 7,
        pendingTasks: 3,
        totalStudyHours: 15.5,
        totalAIChats: 25,
        completionRate: 70,
      });
    });

    it('should handle zero tasks gracefully', async () => {
      const { db } = require('../../db');

      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });

      // Mock zero results
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]), // total tasks
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]), // completed tasks
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ totalMinutes: null }]), // study time
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]), // AI chats
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]), // pending tasks
        });

      const result = await service.getStats(mockUserId);

      expect(result).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalStudyHours: 0,
        totalAIChats: 0,
        completionRate: 0,
      });
    });
  });

  describe('getStreak', () => {
    it('should calculate current study streak', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          date: new Date('2024-01-15'),
          durationMinutes: 30,
        },
        {
          id: 'session-2',
          userId: mockUserId,
          date: new Date('2024-01-14'),
          durationMinutes: 45,
        },
      ];

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockSessions),
      };
      db.select.mockReturnValue(mockSelectChain);

      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });
      cacheService.generateKey = jest.fn().mockReturnValue('dashboard_streak:user-123');

      const result = await service.getStreak(mockUserId);

      expect(result).toEqual({
        currentStreak: expect.any(Number),
        longestStreak: expect.any(Number),
        lastStudyDate: mockSessions[0].date,
      });
    });

    it('should return zero streak for no sessions', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockSelectChain);

      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });

      const result = await service.getStreak(mockUserId);

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      });
    });
  });

  describe('getWeeklyOverview', () => {
    it('should return weekly overview data', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          userId: mockUserId,
          title: 'Test Task',
          dueDate: new Date(),
          completed: true,
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          date: new Date(),
          durationMinutes: 60,
        },
      ];

      const { db } = require('../../db');
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockTasks),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockSessions),
        });

      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });

      const result = await service.getWeeklyOverview(mockUserId);

      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('weekEnd');
      expect(result).toHaveProperty('totalTasks');
      expect(result).toHaveProperty('completedTasks');
      expect(result).toHaveProperty('totalStudyHours');
      expect(result).toHaveProperty('dailyBreakdown');
      expect(result.dailyBreakdown).toHaveLength(7);
    });
  });

  describe('getActivity', () => {
    it('should return activity data for date range', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          date: new Date('2024-01-15'),
          durationMinutes: 30,
        },
      ];

      const mockTasks = [
        {
          id: 'task-1',
          userId: mockUserId,
          title: 'Test Task',
          createdAt: new Date('2024-01-15'),
          completed: true,
        },
      ];

      const mockChats = [
        {
          id: 'chat-1',
          userId: mockUserId,
          message: 'Test',
          createdAt: new Date('2024-01-15'),
        },
      ];

      const { db } = require('../../db');
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockSessions),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockTasks),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockChats),
        });

      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });

      const result = await service.getActivity(mockUserId);

      expect(result).toHaveProperty('startDate');
      expect(result).toHaveProperty('endDate');
      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.activities)).toBe(true);
    });
  });

  describe('getGoals', () => {
    it('should return user goals and progress', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          userId: mockUserId,
          title: 'Test Task',
          subject: 'Math',
          completed: true,
          createdAt: new Date(),
        },
      ];

      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          date: new Date(),
          durationMinutes: 60,
        },
      ];

      const mockChats = [
        {
          id: 'chat-1',
          userId: mockUserId,
          message: 'Test',
          createdAt: new Date(),
        },
      ];

      const { db } = require('../../db');
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockTasks),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockSessions),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockChats),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockTasks),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(mockSessions),
        });

      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });

      const result = await service.getGoals(mockUserId);

      expect(result).toHaveProperty('dailyGoals');
      expect(result).toHaveProperty('weeklyGoals');
      expect(result).toHaveProperty('progress');
      expect(result.dailyGoals).toHaveProperty('tasks');
      expect(result.dailyGoals).toHaveProperty('studyTime');
      expect(result.dailyGoals).toHaveProperty('aiInteractions');
    });
  });

  describe('cache invalidation methods', () => {
    it('should invalidate user cache', async () => {
      cacheService.delPattern = jest.fn().mockResolvedValue();

      await service.invalidateUserCache(mockUserId);

      expect(cacheService.delPattern).toHaveBeenCalledWith(mockUserId);
    });

    it('should invalidate stats cache', async () => {
      cacheService.generateKey = jest.fn().mockReturnValue('dashboard_stats:user-123');
      cacheService.del = jest.fn().mockResolvedValue();

      await service.invalidateStatsCache(mockUserId);

      expect(cacheService.generateKey).toHaveBeenCalledWith('dashboard_stats', mockUserId);
      expect(cacheService.del).toHaveBeenCalledWith('dashboard_stats:user-123');
    });

    it('should invalidate streak cache', async () => {
      cacheService.generateKey = jest.fn().mockReturnValue('dashboard_streak:user-123');
      cacheService.del = jest.fn().mockResolvedValue();

      await service.invalidateStreakCache(mockUserId);

      expect(cacheService.generateKey).toHaveBeenCalledWith('dashboard_streak', mockUserId);
      expect(cacheService.del).toHaveBeenCalledWith('dashboard_streak:user-123');
    });

    it('should invalidate weekly cache', async () => {
      cacheService.delPattern = jest.fn().mockResolvedValue();

      await service.invalidateWeeklyCache(mockUserId);

      expect(cacheService.delPattern).toHaveBeenCalledWith(`dashboard_weekly:${mockUserId}`);
    });
  });
});
