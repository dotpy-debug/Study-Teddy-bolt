import { Injectable, Logger } from '@nestjs/common';
import { AIRouterService } from '../ai-router.service';
import { AICacheService } from '../ai-cache.service';
import { AITokenTrackerService } from '../ai-token-tracker.service';
import { AIActionType, AIRequest } from '../ai-provider.service';

export interface TaskifyRequest {
  text: string;
  userId: string;
  context?: {
    defaultSubject?: string;
    timeframe?: string;
    priorityLevel?: 'low' | 'medium' | 'high';
    studyGoals?: string[];
  };
}

export interface GeneratedTask {
  title: string;
  subject: string;
  description?: string;
  estimatedHours: number;
  dueDate: string; // ISO string or relative like "tomorrow", "next week"
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  subtasks?: string[];
}

export interface TaskifyResponse {
  tasks: GeneratedTask[];
  totalEstimatedHours: number;
  suggestedSchedule?: string;
  aiAnalysis: {
    confidence: number;
    detectedSubjects: string[];
    timeframe: string;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  metadata: {
    processingTimeMs: number;
    provider: string;
    tokensUsed: number;
    cached: boolean;
  };
}

@Injectable()
export class TaskifyService {
  private readonly logger = new Logger(TaskifyService.name);

  constructor(
    private aiRouterService: AIRouterService,
    private aiCacheService: AICacheService,
    private tokenTracker: AITokenTrackerService,
  ) {}

  async generateTasks(request: TaskifyRequest): Promise<TaskifyResponse> {
    const startTime = Date.now();

    // Check budget before proceeding
    await this.tokenTracker.checkBudget(request.userId, 1500); // Estimate 1500 tokens

    // Check cache first
    const cacheKey = this.buildCacheKey(request);
    const cached = await this.aiCacheService.getCachedResponse(
      AIActionType.TASKIFY,
      cacheKey,
      undefined,
      request.userId,
    );

    if (cached) {
      return this.formatCachedResponse(cached, startTime);
    }

    // Build the system prompt for task generation
    const systemPrompt = this.buildSystemPrompt(request.context);

    // Build the user prompt
    const userPrompt = this.buildUserPrompt(request);

    // Create AI request
    const aiRequest: AIRequest = {
      actionType: AIActionType.TASKIFY,
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent structure
      userId: request.userId,
      metadata: {
        originalText: request.text,
        context: request.context,
      },
    };

    // Execute request through router
    const aiResponse = await this.aiRouterService.routeRequest(aiRequest);

    // Track token usage
    await this.tokenTracker.trackUsage({
      userId: request.userId,
      actionType: AIActionType.TASKIFY,
      promptTokens: 0, // Will be calculated by the tracker
      completionTokens: 0,
      totalTokens: aiResponse.tokensUsed,
      costInCents: aiResponse.costInCents,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: new Date(),
    });

    // Parse the AI response
    const parsedResponse = await this.parseAIResponse(aiResponse.content);

    // Cache the response
    await this.aiCacheService.cacheResponse(
      AIActionType.TASKIFY,
      cacheKey,
      aiResponse,
      systemPrompt,
      request.userId,
    );

    // Build final response
    const response: TaskifyResponse = {
      ...parsedResponse,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        cached: false,
      },
    };

    this.logger.log(
      `Generated ${response.tasks.length} tasks for user ${request.userId} in ${response.metadata.processingTimeMs}ms`,
    );

    return response;
  }

  private buildSystemPrompt(context?: TaskifyRequest['context']): string {
    const basePrompt = `You are an expert study planner and task organizer. Your role is to convert unstructured text into well-organized, actionable study tasks.

INSTRUCTIONS:
1. Analyze the provided text and extract all study-related activities, assignments, and goals
2. Convert each activity into a structured task with specific details
3. Provide realistic time estimates based on typical student capabilities
4. Assign appropriate subjects and priorities
5. Suggest reasonable due dates based on urgency indicators in the text

OUTPUT FORMAT - Return ONLY valid JSON in this exact structure:
{
  "tasks": [
    {
      "title": "Specific, actionable task title",
      "subject": "Subject name",
      "description": "Optional detailed description",
      "estimatedHours": 2.5,
      "dueDate": "2024-01-15T23:59:00Z OR relative like 'tomorrow'",
      "priority": "low|medium|high",
      "tags": ["optional", "tags"],
      "subtasks": ["optional subtask 1", "subtask 2"]
    }
  ],
  "totalEstimatedHours": 10.5,
  "suggestedSchedule": "Brief scheduling suggestion",
  "aiAnalysis": {
    "confidence": 0.95,
    "detectedSubjects": ["Math", "Science"],
    "timeframe": "This week",
    "complexity": "moderate"
  }
}`;

    // Add context-specific instructions
    if (context?.defaultSubject) {
      return basePrompt + `\n\nDEFAULT SUBJECT: ${context.defaultSubject}`;
    }

    if (context?.timeframe) {
      return basePrompt + `\n\nTIMEFRAME CONTEXT: ${context.timeframe}`;
    }

    if (context?.priorityLevel) {
      return basePrompt + `\n\nDEFAULT PRIORITY: ${context.priorityLevel}`;
    }

    return basePrompt;
  }

  private buildUserPrompt(request: TaskifyRequest): string {
    let prompt = `Convert this text into structured study tasks:\n\n"${request.text}"`;

    if (request.context?.studyGoals) {
      prompt += `\n\nStudy Goals: ${request.context.studyGoals.join(', ')}`;
    }

    if (request.context?.timeframe) {
      prompt += `\n\nTimeframe: ${request.context.timeframe}`;
    }

    return prompt;
  }

  private buildCacheKey(request: TaskifyRequest): string {
    // Create a deterministic cache key based on content
    const contextStr = request.context ? JSON.stringify(request.context) : '';
    return `${request.text.trim()}_${contextStr}`;
  }

  private async parseAIResponse(content: string): Promise<Omit<TaskifyResponse, 'metadata'>> {
    try {
      // Extract JSON from the response (in case it's wrapped in text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);

      // Validate the response structure
      this.validateTaskifyResponse(parsed);

      return {
        tasks: parsed.tasks || [],
        totalEstimatedHours: parsed.totalEstimatedHours || 0,
        suggestedSchedule: parsed.suggestedSchedule || '',
        aiAnalysis: parsed.aiAnalysis || {
          confidence: 0.5,
          detectedSubjects: [],
          timeframe: 'Unknown',
          complexity: 'moderate',
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse taskify response:', error);
      this.logger.debug('Raw AI response:', content);

      // Return a fallback response
      return {
        tasks: [
          {
            title: 'Review and organize study materials',
            subject: 'General',
            description: 'Based on the provided text, organize your study approach',
            estimatedHours: 1,
            dueDate: 'tomorrow',
            priority: 'medium',
            tags: ['organization'],
          },
        ],
        totalEstimatedHours: 1,
        suggestedSchedule: 'Schedule this task at your earliest convenience',
        aiAnalysis: {
          confidence: 0.3,
          detectedSubjects: ['General'],
          timeframe: 'Flexible',
          complexity: 'simple',
        },
      };
    }
  }

  private validateTaskifyResponse(response: any): void {
    if (!response.tasks || !Array.isArray(response.tasks)) {
      throw new Error('Invalid response: tasks must be an array');
    }

    for (const task of response.tasks) {
      if (!task.title || typeof task.title !== 'string') {
        throw new Error('Invalid task: title is required and must be a string');
      }
      if (!task.subject || typeof task.subject !== 'string') {
        throw new Error('Invalid task: subject is required and must be a string');
      }
      if (typeof task.estimatedHours !== 'number' || task.estimatedHours <= 0) {
        throw new Error('Invalid task: estimatedHours must be a positive number');
      }
      if (!['low', 'medium', 'high'].includes(task.priority)) {
        throw new Error('Invalid task: priority must be low, medium, or high');
      }
    }
  }

  private formatCachedResponse(cached: any, startTime: number): TaskifyResponse {
    return {
      tasks: cached.tasks || [],
      totalEstimatedHours: cached.totalEstimatedHours || 0,
      suggestedSchedule: cached.suggestedSchedule || '',
      aiAnalysis: cached.aiAnalysis || {
        confidence: 0.5,
        detectedSubjects: [],
        timeframe: 'Unknown',
        complexity: 'moderate',
      },
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: cached.provider || 'cache',
        tokensUsed: cached.tokensUsed || 0,
        cached: true,
      },
    };
  }

  /**
   * Validate and enhance generated tasks before returning
   */
  private enhanceTasks(tasks: GeneratedTask[]): GeneratedTask[] {
    return tasks.map((task) => ({
      ...task,
      // Ensure reasonable time estimates
      estimatedHours: Math.max(0.25, Math.min(8, task.estimatedHours)),
      // Normalize subject names
      subject: this.normalizeSubject(task.subject),
      // Add default tags if none provided
      tags: task.tags || this.generateDefaultTags(task),
    }));
  }

  private normalizeSubject(subject: string): string {
    const normalized = subject.trim().toLowerCase();

    // Common subject mappings
    const subjectMap: Record<string, string> = {
      math: 'Mathematics',
      maths: 'Mathematics',
      mathematics: 'Mathematics',
      science: 'Science',
      physics: 'Physics',
      chemistry: 'Chemistry',
      biology: 'Biology',
      english: 'English',
      history: 'History',
      geography: 'Geography',
      'computer science': 'Computer Science',
      programming: 'Computer Science',
      coding: 'Computer Science',
    };

    return (
      subjectMap[normalized] || subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase()
    );
  }

  private generateDefaultTags(task: GeneratedTask): string[] {
    const tags: string[] = [];

    // Add priority-based tags
    if (task.priority === 'high') tags.push('urgent');
    if (task.priority === 'low') tags.push('flexible');

    // Add time-based tags
    if (task.estimatedHours <= 1) tags.push('quick');
    if (task.estimatedHours >= 4) tags.push('extended');

    // Add subject-based tags
    if (task.subject.toLowerCase().includes('math')) tags.push('problem-solving');
    if (task.subject.toLowerCase().includes('science')) tags.push('research');
    if (task.subject.toLowerCase().includes('english')) tags.push('writing');

    return tags;
  }
}
