import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AIService } from './ai.service';
import {
  ChatDto,
  GeneratePracticeQuestionsDto,
  ChatHistoryQueryDto,
  StudyPlanDto,
  TaskifyDto,
  BreakdownDto,
  TutorExplainDto,
  CheckAnswerDto,
} from './dto/ai.dto';
import { TaskifyService } from './services/patterns/taskify.service';
import { BreakdownService } from './services/patterns/breakdown.service';
import { TutorService } from './services/patterns/tutor.service';
import { AITokenTrackerService } from './services/ai-token-tracker.service';
import { BetterAuthGuard } from '../auth/guards/better-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BetterAuthUser } from '../auth/better-auth.service';

@ApiTags('AI')
@ApiBearerAuth('JWT')
@Controller('ai')
@UseGuards(BetterAuthGuard)
export class AIController {
  constructor(
    private aiService: AIService,
    private taskifyService: TaskifyService,
    private breakdownService: BreakdownService,
    private tutorService: TutorService,
    private tokenTracker: AITokenTrackerService,
  ) {}

  @Post('chat')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for AI chat
  @ApiOperation({
    summary: 'Send a message to Teddy AI',
    description: 'Send a message to Teddy AI and receive a response',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response received successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        message: { type: 'string' },
        response: { type: 'string' },
        context: { type: 'string' },
        tokensUsed: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid message data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async chat(@Body() chatDto: ChatDto, @CurrentUser() user: BetterAuthUser) {
    return this.aiService.askQuestion(chatDto, user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get chat history',
    description:
      'Retrieve chat history for the authenticated user with optional filtering',
  })
  @ApiQuery({ type: ChatHistoryQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              message: { type: 'string' },
              response: { type: 'string' },
              context: { type: 'string' },
              tokensUsed: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getChatHistory(
    @CurrentUser() user: BetterAuthUser,
    @Query() query: ChatHistoryQueryDto,
  ) {
    return this.aiService.getChatHistory(user.id, query);
  }

  @Delete('history/:id')
  @ApiOperation({
    summary: 'Delete a chat message',
    description: 'Delete a specific chat message from history',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat message ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Chat message not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this message' })
  async deleteChatMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.aiService.deleteChatMessage(id, user.id);
  }

  @Post('practice-questions')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for practice questions
  @ApiOperation({
    summary: 'Generate practice questions for a subject',
    description: 'Generate AI-powered practice questions for studying',
  })
  @ApiResponse({
    status: 200,
    description: 'Practice questions generated successfully',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              type: {
                type: 'string',
                enum: ['multiple_choice', 'short_answer', 'essay'],
              },
              difficulty: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
              },
              options: { type: 'array', items: { type: 'string' } },
              correctAnswer: { type: 'string' },
              explanation: { type: 'string' },
            },
          },
        },
        subject: { type: 'string' },
        topic: { type: 'string' },
        difficulty: { type: 'string' },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid practice questions data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async generatePracticeQuestions(
    @Body() generateDto: GeneratePracticeQuestionsDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.aiService.generatePracticeQuestions(generateDto, user.id);
  }

  @Post('study-plan')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute for study plans
  @ApiOperation({
    summary: 'Generate personalized study plan',
    description: 'Generate an AI-powered personalized study plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Study plan generated successfully',
    schema: {
      type: 'object',
      properties: {
        studyPlan: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            totalWeeks: { type: 'number' },
            hoursPerWeek: { type: 'number' },
            skillLevel: { type: 'string' },
            weeks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  week: { type: 'number' },
                  topics: { type: 'array', items: { type: 'string' } },
                  activities: { type: 'array', items: { type: 'string' } },
                  timeAllocation: { type: 'object' },
                },
              },
            },
          },
        },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid study plan data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async generateStudyPlan(
    @Body() studyPlanDto: StudyPlanDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.aiService.generateStudyPlan(studyPlanDto, user.id);
  }

  @Post('taskify')
  @Throttle({ default: { limit: 8, ttl: 60000 } }) // 8 requests per minute
  @ApiOperation({
    summary: 'Convert free text to structured tasks',
    description:
      'Use AI to convert unstructured text into organized, actionable study tasks',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks generated successfully',
    schema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              subject: { type: 'string' },
              description: { type: 'string' },
              estimatedHours: { type: 'number' },
              dueDate: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              tags: { type: 'array', items: { type: 'string' } },
              subtasks: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        totalEstimatedHours: { type: 'number' },
        suggestedSchedule: { type: 'string' },
        aiAnalysis: {
          type: 'object',
          properties: {
            confidence: { type: 'number' },
            detectedSubjects: { type: 'array', items: { type: 'string' } },
            timeframe: { type: 'string' },
            complexity: {
              type: 'string',
              enum: ['simple', 'moderate', 'complex'],
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            processingTimeMs: { type: 'number' },
            provider: { type: 'string' },
            tokensUsed: { type: 'number' },
            cached: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid taskify data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async taskify(
    @Body() taskifyDto: TaskifyDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.taskifyService.generateTasks({
      text: taskifyDto.text,
      userId: user.id,
      context: {
        defaultSubject: taskifyDto.defaultSubject,
        timeframe: taskifyDto.timeframe,
        priorityLevel: taskifyDto.priorityLevel,
        studyGoals: taskifyDto.studyGoals,
      },
    });
  }

  @Post('breakdown')
  @Throttle({ default: { limit: 6, ttl: 60000 } }) // 6 requests per minute
  @ApiOperation({
    summary: 'Break down tasks into 4-8 manageable subtasks',
    description:
      'Use AI to intelligently break down complex study tasks into structured learning paths',
  })
  @ApiResponse({
    status: 200,
    description: 'Task broken down successfully',
    schema: {
      type: 'object',
      properties: {
        originalTask: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            subject: { type: 'string' },
            totalHours: { type: 'number' },
          },
        },
        subtasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              estimatedHours: { type: 'number' },
              order: { type: 'number' },
              dependencies: { type: 'array', items: { type: 'number' } },
              resources: { type: 'array', items: { type: 'string' } },
              skills: { type: 'array', items: { type: 'string' } },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              type: {
                type: 'string',
                enum: ['research', 'practice', 'create', 'review', 'apply'],
              },
            },
          },
        },
        learningPath: {
          type: 'object',
          properties: {
            phases: { type: 'array' },
            totalPhases: { type: 'number' },
            recommendedPace: { type: 'string' },
          },
        },
        studyStrategy: {
          type: 'object',
          properties: {
            approach: { type: 'string' },
            keyFocusAreas: { type: 'array', items: { type: 'string' } },
            successMetrics: { type: 'array', items: { type: 'string' } },
            commonPitfalls: { type: 'array', items: { type: 'string' } },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            processingTimeMs: { type: 'number' },
            provider: { type: 'string' },
            tokensUsed: { type: 'number' },
            cached: { type: 'boolean' },
            confidence: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid breakdown data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async breakdownTask(
    @Body() breakdownDto: BreakdownDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.breakdownService.breakdownTask({
      taskTitle: breakdownDto.taskTitle,
      taskDescription: breakdownDto.taskDescription,
      subject: breakdownDto.subject,
      totalEstimatedHours: breakdownDto.totalEstimatedHours,
      difficulty: breakdownDto.difficulty,
      userId: user.id,
      context: {
        availableResources: breakdownDto.availableResources,
        learningStyle: breakdownDto.learningStyle,
        timeConstraints: breakdownDto.timeConstraints,
        priorKnowledge: breakdownDto.priorKnowledge,
      },
    });
  }

  @Post('tutor/explain')
  @Throttle({ default: { limit: 8, ttl: 60000 } }) // 8 requests per minute
  @ApiOperation({
    summary: 'Get AI tutoring explanation with practice questions',
    description:
      'Get comprehensive concept explanations with generated practice questions and study tips',
  })
  @ApiResponse({
    status: 200,
    description: 'Tutoring explanation generated successfully',
    schema: {
      type: 'object',
      properties: {
        explanation: {
          type: 'object',
          properties: {
            concept: { type: 'string' },
            definition: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
            examples: { type: 'array' },
            analogies: { type: 'array', items: { type: 'string' } },
            commonMistakes: { type: 'array', items: { type: 'string' } },
            prerequisites: { type: 'array', items: { type: 'string' } },
            relatedConcepts: { type: 'array', items: { type: 'string' } },
          },
        },
        practiceQuestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              type: {
                type: 'string',
                enum: [
                  'multiple-choice',
                  'short-answer',
                  'essay',
                  'problem-solving',
                ],
              },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              options: { type: 'array', items: { type: 'string' } },
              correctAnswer: { type: 'string' },
              explanation: { type: 'string' },
              hints: { type: 'array', items: { type: 'string' } },
              estimatedTime: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        studyTips: {
          type: 'object',
          properties: {
            memorization: { type: 'array', items: { type: 'string' } },
            application: { type: 'array', items: { type: 'string' } },
            furtherStudy: { type: 'array', items: { type: 'string' } },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            processingTimeMs: { type: 'number' },
            provider: { type: 'string' },
            tokensUsed: { type: 'number' },
            cached: { type: 'boolean' },
            confidence: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid tutoring request' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async explainConcept(
    @Body() tutorDto: TutorExplainDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.tutorService.explainConcept({
      concept: tutorDto.concept,
      subject: tutorDto.subject,
      difficulty: tutorDto.difficulty,
      userId: user.id,
      context: {
        learningGoals: tutorDto.learningGoals,
        priorKnowledge: tutorDto.priorKnowledge,
        preferredStyle: tutorDto.preferredStyle,
        timeAvailable: tutorDto.timeAvailable,
      },
    });
  }

  @Post('tutor/check-answer')
  @Throttle({ default: { limit: 15, ttl: 60000 } }) // 15 requests per minute for answer checking
  @ApiOperation({
    summary: 'Check and grade student answers',
    description:
      'Use AI to evaluate student answers and provide constructive feedback',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer checked successfully',
    schema: {
      type: 'object',
      properties: {
        isCorrect: { type: 'boolean' },
        score: { type: 'number', minimum: 0, maximum: 100 },
        feedback: {
          type: 'object',
          properties: {
            positive: { type: 'array', items: { type: 'string' } },
            corrections: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } },
          },
        },
        correctAnswer: { type: 'string' },
        explanation: { type: 'string' },
        hints: { type: 'array', items: { type: 'string' } },
        nextSteps: { type: 'array', items: { type: 'string' } },
        metadata: {
          type: 'object',
          properties: {
            processingTimeMs: { type: 'number' },
            provider: { type: 'string' },
            tokensUsed: { type: 'number' },
            cached: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid answer check request' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async checkAnswer(
    @Body() checkAnswerDto: CheckAnswerDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.tutorService.checkAnswer({
      question: checkAnswerDto.question,
      studentAnswer: checkAnswerDto.studentAnswer,
      subject: checkAnswerDto.subject,
      userId: user.id,
      correctAnswer: checkAnswerDto.correctAnswer,
      context: {
        explanation: checkAnswerDto.explanation,
        hints: checkAnswerDto.hints,
      },
    });
  }

  @Get('budget')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute for budget checks
  @ApiOperation({
    summary: 'Get AI token budget status',
    description: 'Check current token usage and remaining daily budget',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dailyLimit: { type: 'number' },
        perRequestLimit: { type: 'number' },
        currentDailyUsage: { type: 'number' },
        remainingDaily: { type: 'number' },
        resetTime: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getBudget(@CurrentUser() user: BetterAuthUser) {
    return this.tokenTracker.checkBudget(user.id);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for stats (lightweight)
  @ApiOperation({
    summary: 'Get comprehensive AI usage statistics',
    description:
      'Get detailed statistics about AI usage, costs, and patterns for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'AI usage statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        // Legacy stats for backward compatibility
        totalMessages: { type: 'number' },
        totalTokensUsed: { type: 'number' },
        messagesThisMonth: { type: 'number' },
        tokensThisMonth: { type: 'number' },
        averageTokensPerMessage: { type: 'number' },
        mostUsedContext: { type: 'string' },
        lastMessageAt: { type: 'string', format: 'date-time' },
        // Enhanced stats
        usageStats: {
          type: 'object',
          properties: {
            dailyUsage: { type: 'number' },
            weeklyUsage: { type: 'number' },
            monthlyUsage: { type: 'number' },
            totalCostCents: { type: 'number' },
            averageRequestTokens: { type: 'number' },
            mostUsedAction: { type: 'string' },
            costBreakdown: { type: 'object' },
          },
        },
        budget: {
          type: 'object',
          properties: {
            dailyLimit: { type: 'number' },
            perRequestLimit: { type: 'number' },
            currentDailyUsage: { type: 'number' },
            remainingDaily: { type: 'number' },
            resetTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getAiStats(@CurrentUser() user: BetterAuthUser) {
    const [legacyStats, usageStats, budget] = await Promise.all([
      this.aiService.getAiStats(user.id),
      this.tokenTracker.getUsageStats(user.id),
      this.tokenTracker.checkBudget(user.id),
    ]);

    return {
      ...legacyStats, // Maintain backward compatibility
      usageStats,
      budget,
    };
  }
}
