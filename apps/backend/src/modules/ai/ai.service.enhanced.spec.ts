import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { DrizzleService } from '../../db/drizzle.service';
import { CacheService } from '../../common/cache/cache.service';
import { AIRouterService } from './services/ai-router.service';
import { AITokenTrackerService } from './services/ai-token-tracker.service';
import { AIChatFactory } from '../../../test/factories/ai-chat.factory';
import { TestModuleHelper } from '../../../test/helpers/test-module.helper';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
  APIError: class APIError extends Error {
    constructor(
      message: string,
      public status?: number,
    ) {
      super(message);
      this.name = 'APIError';
    }
  },
}));

describe('AIService - Enhanced Tests', () => {
  let service: AIService;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<CacheService>;
  let drizzleService: jest.Mocked<DrizzleService>;
  let aiRouterService: jest.Mocked<AIRouterService>;
  let tokenTracker: jest.Mocked<AITokenTrackerService>;
  let mockOpenAI: jest.Mocked<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: TestModuleHelper.createMockConfigService(),
        },
        {
          provide: CacheService,
          useValue: TestModuleHelper.createMockCacheService(),
        },
        {
          provide: DrizzleService,
          useValue: TestModuleHelper.createMockDrizzleService(),
        },
        {
          provide: AIRouterService,
          useValue: TestModuleHelper.createMockAIRouterService(),
        },
        {
          provide: AITokenTrackerService,
          useValue: TestModuleHelper.createMockAITokenTrackerService(),
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get(ConfigService);
    cacheService = module.get(CacheService);
    drizzleService = module.get(DrizzleService);
    aiRouterService = module.get(AIRouterService);
    tokenTracker = module.get(AITokenTrackerService);

    // Setup OpenAI mock
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAI,
    );

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('askQuestion - Router Mode', () => {
    const userId = 'user-123';
    const chatDto = { message: 'What is calculus?' };

    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'AI_PROVIDER') return 'router';
          return TestModuleHelper.createMockConfigService().get(
            key,
            defaultValue,
          );
        },
      );
    });

    it('should handle chat with router service successfully', async () => {
      const mockAIResponse = {
        content: 'Calculus is a branch of mathematics...',
        tokensUsed: 150,
        costInCents: 0.02,
        model: 'gpt-4o-mini',
        provider: 'openai',
      };

      const mockSavedChat = AIChatFactory.createChatMessage({
        userId,
        prompt: chatDto.message,
        response: mockAIResponse.content,
      });

      cacheService.get.mockResolvedValue(null); // No cache hit
      tokenTracker.checkBudget.mockResolvedValue(true);
      aiRouterService.routeRequest.mockResolvedValue(mockAIResponse);
      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockSavedChat]);

      const result = await service.askQuestion(chatDto, userId);

      expect(tokenTracker.checkBudget).toHaveBeenCalledWith(userId, 1000);
      expect(aiRouterService.routeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CHAT',
          prompt: chatDto.message,
          userId,
        }),
      );
      expect(tokenTracker.trackUsage).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
      expect(drizzleService.db.insert).toHaveBeenCalled();

      expect(result).toEqual({
        id: mockSavedChat.id,
        message: mockSavedChat.prompt,
        response: mockSavedChat.response,
        tokensUsed: mockSavedChat.totalTokens,
        createdAt: mockSavedChat.createdAt,
      });
    });

    it('should return cached response when available', async () => {
      const cachedResponse = {
        response: 'Cached calculus explanation',
        tokensUsed: 100,
        provider: 'openai',
      };

      const mockSavedChat = AIChatFactory.createChatMessage({
        userId,
        prompt: chatDto.message,
        response: cachedResponse.response,
      });

      cacheService.get.mockResolvedValue(cachedResponse);
      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockSavedChat]);

      const result = await service.askQuestion(chatDto, userId);

      expect(aiRouterService.routeRequest).not.toHaveBeenCalled();
      expect(tokenTracker.trackUsage).not.toHaveBeenCalled();
      expect(result.response).toBe(cachedResponse.response);
    });

    it('should handle budget check failure', async () => {
      tokenTracker.checkBudget.mockRejectedValue(new Error('Budget exceeded'));

      await expect(service.askQuestion(chatDto, userId)).rejects.toThrow(
        'Budget exceeded',
      );

      expect(aiRouterService.routeRequest).not.toHaveBeenCalled();
    });

    it('should handle AI router service errors', async () => {
      cacheService.get.mockResolvedValue(null);
      tokenTracker.checkBudget.mockResolvedValue(true);
      aiRouterService.routeRequest.mockRejectedValue(
        new Error('AI service error'),
      );

      await expect(service.askQuestion(chatDto, userId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('askQuestion - Legacy Mode', () => {
    const userId = 'user-123';
    const chatDto = { message: 'Explain photosynthesis' };

    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'AI_PROVIDER') return 'openai';
          return TestModuleHelper.createMockConfigService().get(
            key,
            defaultValue,
          );
        },
      );
    });

    it('should handle chat with OpenAI directly', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Photosynthesis is the process...',
            },
          },
        ],
        usage: {
          total_tokens: 200,
        },
      };

      const mockSavedChat = AIChatFactory.createChatMessage({
        userId,
        prompt: chatDto.message,
        response: mockOpenAIResponse.choices[0].message.content,
        totalTokens: 200,
      });

      cacheService.get.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockSavedChat]);

      const result = await service.askQuestion(chatDto, userId);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: expect.any(String),
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('Teddy AI'),
          },
          {
            role: 'user',
            content: chatDto.message,
          },
        ],
        max_tokens: expect.any(Number),
        temperature: expect.any(Number),
      });

      expect(cacheService.set).toHaveBeenCalled();
      expect(result.response).toBe(
        mockOpenAIResponse.choices[0].message.content,
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      cacheService.get.mockResolvedValue(null);

      const apiError = new (OpenAI as any).APIError('Rate limit exceeded', 429);
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.askQuestion(chatDto, userId)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .askQuestion(chatDto, userId)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should handle authentication errors', async () => {
      cacheService.get.mockResolvedValue(null);

      const authError = new (OpenAI as any).APIError('Invalid API key', 401);
      mockOpenAI.chat.completions.create.mockRejectedValue(authError);

      await expect(service.askQuestion(chatDto, userId)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .askQuestion(chatDto, userId)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should handle service unavailable errors', async () => {
      cacheService.get.mockResolvedValue(null);

      const serviceError = new (OpenAI as any).APIError(
        'Service unavailable',
        503,
      );
      mockOpenAI.chat.completions.create.mockRejectedValue(serviceError);

      await expect(service.askQuestion(chatDto, userId)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .askQuestion(chatDto, userId)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should handle non-OpenAI errors', async () => {
      cacheService.get.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.askQuestion(chatDto, userId)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .askQuestion(chatDto, userId)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('getChatHistory', () => {
    const userId = 'user-123';

    it('should return cached chat history', async () => {
      const mockChats = AIChatFactory.createRecentChats(userId, 3);
      const expectedResponse = {
        chats: mockChats.map((chat) => ({
          id: chat.id,
          message: chat.prompt,
          response: chat.response,
          tokensUsed: chat.totalTokens,
          createdAt: chat.createdAt,
        })),
        total: mockChats.length,
        hasMore: false,
      };

      cacheService.warm.mockImplementation(async (key, factory) => {
        return await factory();
      });

      // Mock the database query
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockReturnValue(drizzleService.db);
      drizzleService.db.offset.mockResolvedValue(mockChats);

      const result = await service.getChatHistory(userId);

      expect(result.chats).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(cacheService.warm).toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      const query = { limit: 10, page: 2 };
      const mockChats = AIChatFactory.createMany(10, { userId });

      cacheService.warm.mockImplementation(async (key, factory) => {
        return await factory();
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockReturnValue(drizzleService.db);
      drizzleService.db.offset.mockResolvedValue(mockChats);

      await service.getChatHistory(userId, query);

      expect(drizzleService.db.limit).toHaveBeenCalledWith(10);
      expect(drizzleService.db.offset).toHaveBeenCalledWith(10); // (page - 1) * limit
    });

    it('should use default pagination when not provided', async () => {
      const mockChats = AIChatFactory.createMany(5, { userId });

      cacheService.warm.mockImplementation(async (key, factory) => {
        return await factory();
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockReturnValue(drizzleService.db);
      drizzleService.db.offset.mockResolvedValue(mockChats);

      await service.getChatHistory(userId);

      expect(drizzleService.db.limit).toHaveBeenCalledWith(50);
      expect(drizzleService.db.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('deleteChatMessage', () => {
    const userId = 'user-123';
    const chatId = 'chat-123';

    it('should delete chat message successfully', async () => {
      const mockChat = AIChatFactory.createChatMessage({ id: chatId, userId });

      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: [mockChat],
      });

      const result = await service.deleteChatMessage(chatId, userId);

      expect(drizzleService.db.delete).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Chat message deleted successfully' });
    });

    it('should throw HttpException if chat not found', async () => {
      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: [],
      });

      await expect(service.deleteChatMessage(chatId, userId)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .deleteChatMessage(chatId, userId)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('should throw HttpException if chat belongs to different user', async () => {
      const mockChat = AIChatFactory.createChatMessage({
        id: chatId,
        userId: 'different-user',
      });

      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: [mockChat],
      });

      await expect(service.deleteChatMessage(chatId, userId)).rejects.toThrow(
        HttpException,
      );

      const thrownError = await service
        .deleteChatMessage(chatId, userId)
        .catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('generatePracticeQuestions', () => {
    const userId = 'user-123';
    const generateDto = {
      subject: 'Mathematics',
      difficulty: 'medium' as const,
      questionCount: 5,
    };

    it('should generate practice questions', async () => {
      const mockResponse = {
        id: 'response-123',
        message: expect.stringContaining('Generate 5 practice questions'),
        response: '1. What is 2+2?\n2. Solve for x: 2x = 10\n...',
        tokensUsed: 200,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'askQuestion').mockResolvedValue(mockResponse);

      const result = await service.generatePracticeQuestions(
        generateDto,
        userId,
      );

      expect(service.askQuestion).toHaveBeenCalledWith(
        {
          message: expect.stringContaining(
            'Generate 5 practice questions for the subject: Mathematics',
          ),
        },
        userId,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use default values for optional parameters', async () => {
      const minimalDto = { subject: 'Physics' };

      const mockResponse = {
        id: 'response-123',
        message: expect.any(String),
        response: 'Physics questions...',
        tokensUsed: 150,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'askQuestion').mockResolvedValue(mockResponse);

      await service.generatePracticeQuestions(minimalDto, userId);

      expect(service.askQuestion).toHaveBeenCalledWith(
        {
          message: expect.stringContaining('Generate 5 practice questions'),
        },
        userId,
      );
    });
  });

  describe('generateStudyPlan', () => {
    const userId = 'user-123';
    const studyPlanDto = {
      subject: 'Computer Science',
      totalWeeks: 8,
      hoursPerWeek: 10,
      skillLevel: 'intermediate' as const,
      goals: 'Learn data structures and algorithms',
    };

    it('should generate study plan', async () => {
      const mockResponse = {
        id: 'response-123',
        message: expect.stringContaining('Create a detailed study plan'),
        response: 'Week 1: Introduction to data structures...',
        tokensUsed: 800,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'askQuestion').mockResolvedValue(mockResponse);

      const result = await service.generateStudyPlan(studyPlanDto, userId);

      expect(service.askQuestion).toHaveBeenCalledWith(
        {
          message: expect.stringContaining(
            'Create a detailed study plan for the subject: Computer Science',
          ),
        },
        userId,
      );

      expect(result).toEqual({
        studyPlan: {
          subject: studyPlanDto.subject,
          totalWeeks: studyPlanDto.totalWeeks,
          hoursPerWeek: studyPlanDto.hoursPerWeek,
          skillLevel: studyPlanDto.skillLevel,
          weeks: [],
        },
        generatedAt: expect.any(Date),
        aiResponse: mockResponse.response,
      });
    });

    it('should calculate duration when totalWeeks not provided', async () => {
      const dtoWithoutWeeks = {
        subject: 'Mathematics',
        hoursPerWeek: 5,
        skillLevel: 'beginner' as const,
      };

      const mockResponse = {
        id: 'response-123',
        message: expect.any(String),
        response: 'Study plan content...',
        tokensUsed: 600,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'askQuestion').mockResolvedValue(mockResponse);

      const result = await service.generateStudyPlan(dtoWithoutWeeks, userId);

      expect(result.studyPlan.totalWeeks).toBe(8); // Math.ceil(40 / 5)
    });
  });

  describe('getAiStats', () => {
    const userId = 'user-123';

    it('should return comprehensive AI statistics', async () => {
      const mockChats = [
        AIChatFactory.createChatMessage({ userId, totalTokens: 100 }),
        AIChatFactory.createChatMessage({ userId, totalTokens: 150 }),
        AIChatFactory.createStudyPlan({ userId, totalTokens: 500 }),
      ];

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue(mockChats);

      const result = await service.getAiStats(userId);

      expect(result).toEqual({
        totalMessages: 3,
        totalTokensUsed: 750,
        messagesThisMonth: expect.any(Number),
        tokensThisMonth: expect.any(Number),
        averageTokensPerMessage: 250,
        mostUsedContext: 'general',
        lastMessageAt: expect.any(Date),
      });
    });

    it('should handle empty chat history', async () => {
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([]);

      const result = await service.getAiStats(userId);

      expect(result).toEqual({
        totalMessages: 0,
        totalTokensUsed: 0,
        messagesThisMonth: 0,
        tokensThisMonth: 0,
        averageTokensPerMessage: 0,
        mostUsedContext: 'general',
        lastMessageAt: null,
      });
    });

    it('should handle database errors', async () => {
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockRejectedValue(new Error('Database error'));

      await expect(service.getAiStats(userId)).rejects.toThrow(HttpException);

      const thrownError = await service.getAiStats(userId).catch((e) => e);
      expect(thrownError.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('invalidateChatCache', () => {
    it('should invalidate chat cache for user', async () => {
      const userId = 'user-123';

      await service.invalidateChatCache(userId);

      expect(cacheService.del).toHaveBeenCalledWith(
        expect.stringContaining(`ai_chat_history:${userId}`),
      );
    });
  });
});
