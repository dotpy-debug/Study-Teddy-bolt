import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { DrizzleService } from '../../db/drizzle.service';
import { aiChats } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  ChatDto,
  ChatHistoryQueryDto,
  GeneratePracticeQuestionsDto,
  StudyPlanDto,
} from './dto/ai.dto';
import { CacheService } from '../../common/cache/cache.service';
import { AIRouterService } from './services/ai-router.service';
import { AITokenTrackerService } from './services/ai-token-tracker.service';
import { AIActionType, AIRequest } from './services/ai-provider.service';

@Injectable()
export class AIService {
  private openai: OpenAI;
  private readonly logger = new Logger(AIService.name);
  private readonly modelConfig: {
    model: string;
    maxTokens: number;
    temperature: number;
  };

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private drizzleService: DrizzleService,
    private aiRouterService: AIRouterService,
    private tokenTracker: AITokenTrackerService,
  ) {
    // Legacy OpenAI configuration for backward compatibility
    // New requests will use the AIRouterService instead
    const apiProvider = this.configService.get<string>('AI_PROVIDER', 'router');
    const apiKey =
      this.configService.get<string>('AI_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');

    if (apiProvider === 'deepseek') {
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
    } else if (apiProvider !== 'router') {
      this.openai = new OpenAI({
        apiKey,
      });
    }

    // Initialize model configuration from environment variables
    this.modelConfig = {
      model:
        this.configService.get<string>('AI_MODEL') ||
        this.configService.get<string>(
          'OPENAI_MODEL',
          apiProvider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
        ),
      maxTokens:
        this.configService.get<number>('AI_MAX_TOKENS') ||
        this.configService.get<number>('OPENAI_MAX_TOKENS', 500),
      temperature:
        this.configService.get<number>('AI_TEMPERATURE') ||
        this.configService.get<number>('OPENAI_TEMPERATURE', 0.7),
    };

    this.logger.log(
      `AI Service initialized with provider: ${apiProvider === 'router' ? 'AI Router (DeepSeek-V3 → DeepSeek-Coder → GPT-4)' : apiProvider}, ` +
        `model: ${this.modelConfig.model}, ` +
        `maxTokens: ${this.modelConfig.maxTokens}, temperature: ${this.modelConfig.temperature}`,
    );
  }

  async askQuestion(chatDto: ChatDto, userId: string) {
    try {
      this.logger.debug(
        `Processing AI request for user ${userId} with message length: ${chatDto.message.length}`,
      );

      // Use modern AI router service if enabled (default)
      const useRouter =
        this.configService.get<string>('AI_PROVIDER', 'router') === 'router';

      if (useRouter) {
        return await this.handleChatWithRouter(chatDto, userId);
      }

      // Legacy direct OpenAI/DeepSeek handling (fallback)
      return await this.handleChatLegacy(chatDto, userId);
    } catch (error) {
      this.logger.error('AI Chat error:', error);

      // Handle specific errors with more informative messages
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpExceptions as-is
      }

      if (error instanceof OpenAI.APIError) {
        const status = error.status || 500;
        let message = 'AI service error';
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

        if (status === 401) {
          message = 'AI service authentication failed';
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (status === 429) {
          message = 'AI service rate limit exceeded. Please try again later.';
          httpStatus = HttpStatus.TOO_MANY_REQUESTS;
        } else if (status === 503) {
          message =
            'AI service temporarily unavailable. Please try again later.';
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        } else if (error.message) {
          message = `AI service error: ${error.message}`;
        }

        throw new HttpException(
          {
            statusCode: httpStatus,
            message,
            error: 'AI_SERVICE_ERROR',
            details:
              process.env.NODE_ENV === 'development'
                ? error.message
                : undefined,
          },
          httpStatus,
        );
      }

      // Handle non-OpenAI errors
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'AI service temporarily unavailable. Please try again later.',
          error: 'AI_SERVICE_UNAVAILABLE',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Modern chat handling using AI router service with provider fallbacks
   */
  private async handleChatWithRouter(chatDto: ChatDto, userId: string) {
    // Check budget before proceeding
    await this.tokenTracker.checkBudget(userId, 1000); // Estimate 1000 tokens for chat

    // Check cache for similar questions
    const cacheKey = this.cacheService.generateKey(
      'ai_chat_response',
      chatDto.message.toLowerCase().trim().slice(0, 100),
    );

    const cachedResponse = await this.cacheService.get(cacheKey);

    if (cachedResponse) {
      this.logger.debug('Using cached AI response for similar question');

      // Save to database with cached response
      const [savedChat] = await this.drizzleService.db
        .insert(aiChats)
        .values({
          userId,
          actionType: 'chat',
          prompt: chatDto.message,
          response: cachedResponse.response,
          model: cachedResponse.provider || 'cached',
          promptTokens: 0,
          completionTokens: cachedResponse.tokensUsed || 0,
          totalTokens: cachedResponse.tokensUsed || 0,
        })
        .returning();

      await this.invalidateChatCache(userId);

      return {
        id: savedChat.id,
        message: savedChat.prompt,
        response: savedChat.response,
        tokensUsed: savedChat.totalTokens,
        createdAt: savedChat.createdAt,
      };
    }

    // Create AI request for router
    const aiRequest: AIRequest = {
      actionType: AIActionType.CHAT,
      prompt: chatDto.message,
      systemPrompt:
        'You are Teddy AI, a helpful AI tutor. Provide clear, concise answers that help students learn effectively.',
      maxTokens: this.modelConfig.maxTokens,
      temperature: this.modelConfig.temperature,
      userId,
      metadata: {
        originalMessage: chatDto.message,
        cacheKey,
      },
    };

    // Execute request through router with provider fallbacks
    const aiResponse = await this.aiRouterService.routeRequest(aiRequest);

    // Track token usage
    await this.tokenTracker.trackUsage({
      userId,
      actionType: AIActionType.CHAT,
      promptTokens: 0, // Will be calculated by the tracker
      completionTokens: 0,
      totalTokens: aiResponse.tokensUsed,
      costInCents: aiResponse.costInCents,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: new Date(),
    });

    // Cache successful responses for 1 hour
    await this.cacheService.set(
      cacheKey,
      {
        response: aiResponse.content,
        tokensUsed: aiResponse.tokensUsed,
        provider: aiResponse.provider,
      },
      3600,
    );

    // Save to database
    const [savedChat] = await this.drizzleService.db
      .insert(aiChats)
      .values({
        userId,
        actionType: 'chat',
        prompt: chatDto.message,
        response: aiResponse.content,
        model: aiResponse.model,
        promptTokens: Math.floor(aiResponse.tokensUsed * 0.3), // Rough estimate
        completionTokens: Math.floor(aiResponse.tokensUsed * 0.7), // Rough estimate
        totalTokens: aiResponse.tokensUsed,
        costInCents: aiResponse.costInCents.toString(),
      })
      .returning();

    // Invalidate chat history cache
    await this.invalidateChatCache(userId);

    return {
      id: savedChat.id,
      message: savedChat.prompt,
      response: savedChat.response,
      tokensUsed: savedChat.totalTokens,
      createdAt: savedChat.createdAt,
    };
  }

  /**
   * Legacy chat handling using direct OpenAI/DeepSeek calls
   */
  private async handleChatLegacy(chatDto: ChatDto, userId: string) {
    // Check cache for similar questions to improve response time
    const cacheKey = this.cacheService.generateKey(
      'ai_response',
      chatDto.message.toLowerCase().trim().slice(0, 100),
    );

    const cachedResponse = await this.cacheService.get(cacheKey);
    if (cachedResponse) {
      this.logger.debug('Using cached AI response for similar question');

      // Save to database with cached response
      const [savedChat] = await this.drizzleService.db
        .insert(aiChats)
        .values({
          userId,
          actionType: 'chat',
          prompt: chatDto.message,
          response: cachedResponse.response,
          model: this.modelConfig.model,
          promptTokens: 0,
          completionTokens: cachedResponse.tokensUsed || 0,
          totalTokens: cachedResponse.tokensUsed || 0,
        })
        .returning();

      await this.invalidateChatCache(userId);

      return {
        id: savedChat.id,
        message: savedChat.prompt,
        response: savedChat.response,
        tokensUsed: savedChat.totalTokens,
        createdAt: savedChat.createdAt,
      };
    }

    // Optimized system prompt for faster responses
    const systemPrompt =
      'You are Teddy AI, a helpful AI tutor. Provide clear, concise answers that help students learn effectively.';

    const completion = await this.openai.chat.completions.create({
      model: this.modelConfig.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: chatDto.message,
        },
      ],
      max_tokens: this.modelConfig.maxTokens,
      temperature: this.modelConfig.temperature,
    });

    const response = completion.choices[0].message.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Cache successful responses for 1 hour to improve future response times
    await this.cacheService.set(cacheKey, { response, tokensUsed }, 3600);

    // Save to database in parallel with cache operation for better performance
    const [savedChat] = await this.drizzleService.db
      .insert(aiChats)
      .values({
        userId,
        actionType: 'chat',
        prompt: chatDto.message,
        response: response,
        model: this.modelConfig.model,
        promptTokens: Math.floor(tokensUsed * 0.3), // Rough estimate for prompt tokens
        completionTokens: Math.floor(tokensUsed * 0.7), // Rough estimate for completion tokens
        totalTokens: tokensUsed,
      })
      .returning();

    // Invalidate chat history cache after new message
    await this.invalidateChatCache(userId);

    return {
      id: savedChat.id,
      message: savedChat.prompt,
      response: savedChat.response,
      tokensUsed: savedChat.totalTokens,
      createdAt: savedChat.createdAt,
    };
  }

  async getChatHistory(userId: string, query?: ChatHistoryQueryDto) {
    const cacheKey = this.cacheService.generateKey('ai_chat_history', userId);

    return this.cacheService.warm(
      cacheKey,
      async () => {
        this.logger.debug(
          `Fetching chat history from database for user: ${userId}`,
        );

        const limit = query?.limit || 50;
        const page = query?.page || 1;
        const offset = (page - 1) * limit;

        const chats = await this.drizzleService.db
          .select()
          .from(aiChats)
          .where(eq(aiChats.userId, userId))
          .orderBy(desc(aiChats.createdAt))
          .limit(limit)
          .offset(offset);

        return {
          chats: chats.map((chat) => ({
            id: chat.id,
            message: chat.prompt,
            response: chat.response,
            tokensUsed: chat.totalTokens,
            createdAt: chat.createdAt,
          })),
          total: chats.length,
          hasMore: chats.length === limit,
        };
      },
      900,
    ); // 15 minutes TTL for chat history
  }

  async deleteChatMessage(chatId: string, userId: string) {
    const deletedRows = await this.drizzleService.db
      .delete(aiChats)
      .where(eq(aiChats.id, chatId))
      .returning();

    if (deletedRows.length === 0) {
      throw new HttpException('Chat message not found', HttpStatus.NOT_FOUND);
    }

    // Verify the chat belongs to the user
    if (deletedRows[0].userId !== userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Invalidate chat history cache after deletion
    await this.invalidateChatCache(userId);

    return { message: 'Chat message deleted successfully' };
  }

  async generatePracticeQuestions(
    generateDto: GeneratePracticeQuestionsDto,
    userId: string,
  ) {
    const { subject, difficulty, questionCount } = generateDto;
    const prompt = `Generate ${questionCount || 5} practice questions for the subject: ${subject}.
    Difficulty level: ${difficulty || 'medium'}. Make them educational and appropriate for students.
    Format as a numbered list with clear questions and provide answer hints.`;

    return this.askQuestion({ message: prompt }, userId);
  }

  async generateStudyPlan(studyPlanDto: StudyPlanDto, userId: string) {
    const { subject, totalWeeks, hoursPerWeek, skillLevel, goals } =
      studyPlanDto;
    const duration = totalWeeks || Math.ceil(40 / hoursPerWeek); // Use provided weeks or estimate
    const prompt = `Create a detailed study plan for the subject: ${subject}.
    Duration: ${duration} weeks
    Time commitment: ${hoursPerWeek} hours per week
    Skill level: ${skillLevel}
    Goals: ${goals || 'General improvement and mastery'}

    Please structure this as a week-by-week plan with specific topics, activities, and time allocation.`;

    const response = await this.askQuestion({ message: prompt }, userId);

    return {
      studyPlan: {
        subject,
        totalWeeks: duration,
        hoursPerWeek,
        skillLevel,
        weeks: [], // This would be parsed from AI response in a real implementation
      },
      generatedAt: new Date(),
      aiResponse: response.response,
    };
  }

  async getAiStats(userId: string) {
    try {
      const stats = await this.drizzleService.db
        .select()
        .from(aiChats)
        .where(eq(aiChats.userId, userId));

      const totalMessages = stats.length;
      const totalTokensUsed = stats.reduce(
        (sum, chat) => sum + (chat.totalTokens || 0),
        0,
      );
      const averageTokensPerMessage =
        totalMessages > 0 ? totalTokensUsed / totalMessages : 0;

      // Get this month's stats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const thisMonthStats = stats.filter(
        (chat) => new Date(chat.createdAt) >= thisMonth,
      );

      const lastMessage = stats.length > 0 ? stats[0] : null;

      return {
        totalMessages,
        totalTokensUsed,
        messagesThisMonth: thisMonthStats.length,
        tokensThisMonth: thisMonthStats.reduce(
          (sum, chat) => sum + (chat.totalTokens || 0),
          0,
        ),
        averageTokensPerMessage: Math.round(averageTokensPerMessage),
        mostUsedContext: 'general', // Could be computed from message analysis
        lastMessageAt: lastMessage?.createdAt || null,
      };
    } catch (error) {
      this.logger.error('Error fetching AI stats:', error);
      throw new HttpException(
        'Unable to fetch AI statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Cache invalidation methods
  async invalidateChatCache(userId: string): Promise<void> {
    const cacheKey = this.cacheService.generateKey('ai_chat_history', userId);
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Invalidated chat history cache for user: ${userId}`);
  }
}
