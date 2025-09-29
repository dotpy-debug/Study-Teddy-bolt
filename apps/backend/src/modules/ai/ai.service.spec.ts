import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AIService } from './ai.service';
import { CacheService } from '../../common/cache/cache.service';
import { DrizzleService } from '../../db/drizzle.service';
import { AIRouterService } from './services/ai-router.service';
import { AITokenTrackerService } from './services/ai-token-tracker.service';
import { TestUtils } from '../../../test/utils/test.utils';
import { TestDataFactory } from '../../../test/factories';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn(),
}));

describe('AIService', () => {
  let service: AIService;
  let configService: ConfigService;
  let cacheService: CacheService;
  let drizzleService: DrizzleService;
  let aiRouterService: AIRouterService;
  let tokenTracker: AITokenTrackerService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockChatCompletion = {
    choices: [
      {
        message: {
          content: 'This is a test AI response',
        },
      },
    ],
    usage: {
      prompt_tokens: 25,
      completion_tokens: 25,
      total_tokens: 50,
    },
  };

  const mockChatDto = {
    message: 'What is photosynthesis?',
  };

  const mockUserId = 'user-123';

  beforeEach(async () => {
    const mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockChatCompletion),
        },
      },
    };

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAIInstance as any,
    );

    // Create mock database
    const mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest
            .fn()
            .mockResolvedValue([TestDataFactory.createAIChat(mockUserId)]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: TestUtils.createMockConfigService(),
        },
        {
          provide: CacheService,
          useValue: TestUtils.createMockCacheService(),
        },
        {
          provide: DrizzleService,
          useValue: {
            db: mockDb,
          },
        },
        {
          provide: AIRouterService,
          useValue: TestUtils.createMockAIRouterService(),
        },
        {
          provide: AITokenTrackerService,
          useValue: TestUtils.createMockAITokenTrackerService(),
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get<ConfigService>(ConfigService);
    cacheService = module.get<CacheService>(CacheService);
    drizzleService = module.get<DrizzleService>(DrizzleService);
    aiRouterService = module.get<AIRouterService>(AIRouterService);
    tokenTracker = module.get<AITokenTrackerService>(AITokenTrackerService);
    mockOpenAI = (service as any).openai;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('askQuestion', () => {
    it('should successfully ask a question and save to database', async () => {
      const mockSavedChat = {
        id: 'chat-123',
        userId: mockUserId,
        message: mockChatDto.message,
        aiResponse: 'This is a test AI response',
        tokensUsed: 50,
        createdAt: new Date(),
      };

      // Mock OpenAI response
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(
        mockChatCompletion,
      );

      // Mock database operations
      const { db } = require('../../db');
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockSavedChat]),
      };
      db.insert.mockReturnValue(mockInsertChain);

      // Mock cache invalidation
      jest.spyOn(service, 'invalidateChatCache').mockResolvedValue();

      const result = await service.askQuestion(mockChatDto, mockUserId);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('Study Teddy'),
          },
          {
            role: 'user',
            content: mockChatDto.message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      expect(db.insert).toHaveBeenCalled();
      expect(service.invalidateChatCache).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        id: mockSavedChat.id,
        message: mockSavedChat.message,
        response: mockSavedChat.aiResponse,
        tokensUsed: mockSavedChat.tokensUsed,
        createdAt: mockSavedChat.createdAt,
      });
    });

    it('should throw HttpException when OpenAI API fails', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.askQuestion(mockChatDto, mockUserId),
      ).rejects.toThrow(HttpException);

      await expect(
        service.askQuestion(mockChatDto, mockUserId),
      ).rejects.toThrow('AI service temporarily unavailable');
    });
  });

  describe('getChatHistory', () => {
    it('should return cached chat history', async () => {
      const mockChatHistory = {
        chats: [
          {
            id: 'chat-1',
            message: 'Test message',
            response: 'Test response',
            tokensUsed: 25,
            createdAt: new Date(),
          },
        ],
        total: 1,
        hasMore: false,
      };

      cacheService.warm = jest.fn().mockResolvedValue(mockChatHistory);
      cacheService.generateKey = jest
        .fn()
        .mockReturnValue('ai_chat_history:user-123');

      const result = await service.getChatHistory(mockUserId);

      expect(cacheService.generateKey).toHaveBeenCalledWith(
        'ai_chat_history',
        mockUserId,
      );
      expect(cacheService.warm).toHaveBeenCalledWith(
        'ai_chat_history:user-123',
        expect.any(Function),
        900,
      );
      expect(result).toEqual(mockChatHistory);
    });

    it('should fetch chat history from database when not cached', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          userId: mockUserId,
          message: 'Test message',
          aiResponse: 'Test response',
          tokensUsed: 25,
          createdAt: new Date(),
        },
      ];

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockChats),
      };
      db.select.mockReturnValue(mockSelectChain);

      // Mock cache service to call the function directly
      cacheService.warm = jest.fn().mockImplementation(async (key, fn) => {
        return await fn();
      });
      cacheService.generateKey = jest
        .fn()
        .mockReturnValue('ai_chat_history:user-123');

      const result = await service.getChatHistory(mockUserId);

      expect(db.select).toHaveBeenCalled();
      expect(result.chats).toHaveLength(1);
      expect(result.chats[0]).toEqual({
        id: mockChats[0].id,
        message: mockChats[0].message,
        response: mockChats[0].aiResponse,
        tokensUsed: mockChats[0].tokensUsed,
        createdAt: mockChats[0].createdAt,
      });
    });
  });

  describe('deleteChatMessage', () => {
    it('should successfully delete a chat message', async () => {
      const chatId = 'chat-123';
      const mockDeletedChat = {
        id: chatId,
        userId: mockUserId,
        message: 'Test message',
        aiResponse: 'Test response',
        tokensUsed: 25,
        createdAt: new Date(),
      };

      const { db } = require('../../db');
      const mockDeleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDeletedChat]),
      };
      db.delete.mockReturnValue(mockDeleteChain);

      jest.spyOn(service, 'invalidateChatCache').mockResolvedValue();

      const result = await service.deleteChatMessage(chatId, mockUserId);

      expect(db.delete).toHaveBeenCalled();
      expect(service.invalidateChatCache).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ message: 'Chat message deleted successfully' });
    });

    it('should throw HttpException when chat message not found', async () => {
      const chatId = 'nonexistent-chat';

      const { db } = require('../../db');
      const mockDeleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      db.delete.mockReturnValue(mockDeleteChain);

      await expect(
        service.deleteChatMessage(chatId, mockUserId),
      ).rejects.toThrow(HttpException);

      await expect(
        service.deleteChatMessage(chatId, mockUserId),
      ).rejects.toThrow('Chat message not found');
    });

    it('should throw HttpException when user is not authorized', async () => {
      const chatId = 'chat-123';
      const mockDeletedChat = {
        id: chatId,
        userId: 'different-user',
        message: 'Test message',
        aiResponse: 'Test response',
        tokensUsed: 25,
        createdAt: new Date(),
      };

      const { db } = require('../../db');
      const mockDeleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDeletedChat]),
      };
      db.delete.mockReturnValue(mockDeleteChain);

      await expect(
        service.deleteChatMessage(chatId, mockUserId),
      ).rejects.toThrow(HttpException);

      await expect(
        service.deleteChatMessage(chatId, mockUserId),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('generatePracticeQuestions', () => {
    it('should generate practice questions', async () => {
      const generateDto = {
        subject: 'Mathematics',
        difficulty: 'intermediate' as any,
        questionCount: 5,
      };

      const mockResponse = {
        id: 'chat-123',
        message: expect.stringContaining('Mathematics'),
        response: 'Generated practice questions',
        tokensUsed: 100,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'askQuestion').mockResolvedValue(mockResponse);

      const result = await service.generatePracticeQuestions(
        generateDto,
        mockUserId,
      );

      expect(service.askQuestion).toHaveBeenCalledWith(
        {
          message: expect.stringContaining('Mathematics'),
        },
        mockUserId,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAiStats', () => {
    it('should return AI usage statistics', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          userId: mockUserId,
          message: 'Test 1',
          aiResponse: 'Response 1',
          tokensUsed: 25,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'chat-2',
          userId: mockUserId,
          message: 'Test 2',
          aiResponse: 'Response 2',
          tokensUsed: 35,
          createdAt: new Date('2024-01-16'),
        },
      ];

      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockChats),
      };
      db.select.mockReturnValue(mockSelectChain);

      const result = await service.getAiStats(mockUserId);

      expect(result).toEqual({
        totalMessages: 2,
        totalTokensUsed: 60,
        messagesThisMonth: expect.any(Number),
        tokensThisMonth: expect.any(Number),
        averageTokensPerMessage: 30,
        mostUsedContext: 'general',
        lastMessageAt: mockChats[0].createdAt,
      });
    });

    it('should handle database errors gracefully', async () => {
      const { db } = require('../../db');
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      db.select.mockReturnValue(mockSelectChain);

      await expect(service.getAiStats(mockUserId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('invalidateChatCache', () => {
    it('should invalidate chat cache', async () => {
      cacheService.generateKey = jest
        .fn()
        .mockReturnValue('ai_chat_history:user-123');
      cacheService.del = jest.fn().mockResolvedValue();

      await service.invalidateChatCache(mockUserId);

      expect(cacheService.generateKey).toHaveBeenCalledWith(
        'ai_chat_history',
        mockUserId,
      );
      expect(cacheService.del).toHaveBeenCalledWith('ai_chat_history:user-123');
    });
  });
});
