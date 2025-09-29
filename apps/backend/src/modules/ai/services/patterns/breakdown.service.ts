import { Injectable, Logger } from '@nestjs/common';
import { AIRouterService } from '../ai-router.service';
import { AICacheService } from '../ai-cache.service';
import { AITokenTrackerService } from '../ai-token-tracker.service';
import { AIActionType, AIRequest } from '../ai-provider.service';

export interface BreakdownRequest {
  taskTitle: string;
  taskDescription?: string;
  subject: string;
  totalEstimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  userId: string;
  context?: {
    availableResources?: string[];
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    timeConstraints?: string;
    priorKnowledge?: string;
  };
}

export interface SubTask {
  title: string;
  description: string;
  estimatedHours: number;
  order: number;
  dependencies?: number[]; // Order numbers of prerequisite subtasks
  resources?: string[];
  skills?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'research' | 'practice' | 'create' | 'review' | 'apply';
}

export interface BreakdownResponse {
  originalTask: {
    title: string;
    subject: string;
    totalHours: number;
  };
  subtasks: SubTask[];
  learningPath: {
    phases: Array<{
      name: string;
      subtaskOrders: number[];
      estimatedDuration: string;
      goals: string[];
    }>;
    totalPhases: number;
    recommendedPace: string;
  };
  studyStrategy: {
    approach: string;
    keyFocusAreas: string[];
    successMetrics: string[];
    commonPitfalls: string[];
  };
  metadata: {
    processingTimeMs: number;
    provider: string;
    tokensUsed: number;
    cached: boolean;
    confidence: number;
  };
}

@Injectable()
export class BreakdownService {
  private readonly logger = new Logger(BreakdownService.name);

  constructor(
    private aiRouterService: AIRouterService,
    private aiCacheService: AICacheService,
    private tokenTracker: AITokenTrackerService,
  ) {}

  async breakdownTask(request: BreakdownRequest): Promise<BreakdownResponse> {
    const startTime = Date.now();

    // Check budget before proceeding
    await this.tokenTracker.checkBudget(request.userId, 2000); // Estimate 2000 tokens for breakdown

    // Check cache first
    const cacheKey = this.buildCacheKey(request);
    const cached = await this.aiCacheService.getCachedResponse(
      AIActionType.BREAKDOWN,
      cacheKey,
      undefined,
      request.userId,
    );

    if (cached) {
      return this.formatCachedResponse(cached, startTime);
    }

    // Build the system prompt for task breakdown
    const systemPrompt = this.buildSystemPrompt(request);

    // Build the user prompt
    const userPrompt = this.buildUserPrompt(request);

    // Create AI request
    const aiRequest: AIRequest = {
      actionType: AIActionType.BREAKDOWN,
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 2500,
      temperature: 0.4, // Slightly higher for creativity in breaking down tasks
      userId: request.userId,
      metadata: {
        originalTask: request.taskTitle,
        subject: request.subject,
        difficulty: request.difficulty,
      },
    };

    // Execute request through router
    const aiResponse = await this.aiRouterService.routeRequest(aiRequest);

    // Track token usage
    await this.tokenTracker.trackUsage({
      userId: request.userId,
      actionType: AIActionType.BREAKDOWN,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: aiResponse.tokensUsed,
      costInCents: aiResponse.costInCents,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: new Date(),
    });

    // Parse the AI response
    const parsedResponse = await this.parseAIResponse(
      aiResponse.content,
      request,
    );

    // Cache the response
    await this.aiCacheService.cacheResponse(
      AIActionType.BREAKDOWN,
      cacheKey,
      aiResponse,
      systemPrompt,
      request.userId,
    );

    // Build final response
    const response: BreakdownResponse = {
      ...parsedResponse,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        cached: false,
        confidence: this.calculateConfidence(parsedResponse.subtasks),
      },
    };

    this.logger.log(
      `Broke down task into ${response.subtasks.length} subtasks for user ${request.userId} in ${response.metadata.processingTimeMs}ms`,
    );

    return response;
  }

  private buildSystemPrompt(request: BreakdownRequest): string {
    const basePrompt = `You are an expert learning strategist and task breakdown specialist. Your role is to break complex study tasks into manageable, sequential subtasks that optimize learning outcomes.

CORE PRINCIPLES:
1. Break the task into 4-8 logical subtasks (never fewer than 4, never more than 8)
2. Ensure subtasks build upon each other in a logical sequence
3. Balance task complexity - mix easy, medium, and hard subtasks
4. Include different types of learning activities
5. Provide realistic time estimates
6. Consider learning progression and skill development

TASK TYPES:
- research: Information gathering and understanding
- practice: Skill development and application
- create: Producing something new
- review: Consolidation and assessment
- apply: Real-world application

OUTPUT FORMAT - Return ONLY valid JSON in this exact structure:
{
  "originalTask": {
    "title": "Original task title",
    "subject": "Subject name",
    "totalHours": ${request.totalEstimatedHours}
  },
  "subtasks": [
    {
      "title": "Specific subtask title",
      "description": "Detailed description of what to do",
      "estimatedHours": 1.5,
      "order": 1,
      "dependencies": [],
      "resources": ["specific resources needed"],
      "skills": ["skills developed/required"],
      "difficulty": "easy|medium|hard",
      "type": "research|practice|create|review|apply"
    }
  ],
  "learningPath": {
    "phases": [
      {
        "name": "Phase name",
        "subtaskOrders": [1, 2],
        "estimatedDuration": "2-3 hours",
        "goals": ["specific learning goals"]
      }
    ],
    "totalPhases": 3,
    "recommendedPace": "Study pace recommendation"
  },
  "studyStrategy": {
    "approach": "Overall learning approach",
    "keyFocusAreas": ["area1", "area2"],
    "successMetrics": ["how to measure success"],
    "commonPitfalls": ["what to avoid"]
  }
}`;

    // Add context-specific guidance
    let contextualPrompt = basePrompt;

    if (request.context?.learningStyle) {
      contextualPrompt += `\n\nLEARNING STYLE: Adapt the breakdown for ${request.context.learningStyle} learners`;
    }

    if (request.context?.timeConstraints) {
      contextualPrompt += `\n\nTIME CONSTRAINTS: ${request.context.timeConstraints}`;
    }

    if (request.context?.priorKnowledge) {
      contextualPrompt += `\n\nPRIOR KNOWLEDGE: ${request.context.priorKnowledge}`;
    }

    return contextualPrompt;
  }

  private buildUserPrompt(request: BreakdownRequest): string {
    let prompt = `Break down this study task into 4-8 manageable subtasks:

TASK: "${request.taskTitle}"
SUBJECT: ${request.subject}
TOTAL TIME AVAILABLE: ${request.totalEstimatedHours} hours
DIFFICULTY LEVEL: ${request.difficulty}`;

    if (request.taskDescription) {
      prompt += `\n\nDETAILS: ${request.taskDescription}`;
    }

    if (request.context?.availableResources) {
      prompt += `\n\nAVAILABLE RESOURCES: ${request.context.availableResources.join(', ')}`;
    }

    if (request.context?.timeConstraints) {
      prompt += `\n\nTIME CONSTRAINTS: ${request.context.timeConstraints}`;
    }

    prompt += `\n\nCreate a logical sequence of subtasks that will help the student master this topic effectively.`;

    return prompt;
  }

  private buildCacheKey(request: BreakdownRequest): string {
    const baseKey = `${request.taskTitle}_${request.subject}_${request.difficulty}_${request.totalEstimatedHours}h`;
    const contextStr = request.context ? JSON.stringify(request.context) : '';
    return `${baseKey}_${contextStr}`;
  }

  private async parseAIResponse(
    content: string,
    originalRequest: BreakdownRequest,
  ): Promise<Omit<BreakdownResponse, 'metadata'>> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);

      // Validate and enhance the response
      this.validateBreakdownResponse(parsed);

      // Ensure subtasks have proper order and dependencies
      const enhancedSubtasks = this.enhanceSubtasks(
        parsed.subtasks,
        originalRequest.totalEstimatedHours,
      );

      return {
        originalTask: {
          title: originalRequest.taskTitle,
          subject: originalRequest.subject,
          totalHours: originalRequest.totalEstimatedHours,
        },
        subtasks: enhancedSubtasks,
        learningPath:
          parsed.learningPath ||
          this.generateDefaultLearningPath(enhancedSubtasks),
        studyStrategy:
          parsed.studyStrategy ||
          this.generateDefaultStudyStrategy(originalRequest),
      };
    } catch (error) {
      this.logger.error('Failed to parse breakdown response:', error);
      this.logger.debug('Raw AI response:', content);

      // Return fallback breakdown
      return this.generateFallbackBreakdown(originalRequest);
    }
  }

  private validateBreakdownResponse(response: any): void {
    if (!response.subtasks || !Array.isArray(response.subtasks)) {
      throw new Error('Invalid response: subtasks must be an array');
    }

    if (response.subtasks.length < 4 || response.subtasks.length > 8) {
      throw new Error(
        `Invalid response: must have 4-8 subtasks, got ${response.subtasks.length}`,
      );
    }

    for (const subtask of response.subtasks) {
      if (!subtask.title || !subtask.description) {
        throw new Error('Invalid subtask: title and description are required');
      }
      if (
        typeof subtask.estimatedHours !== 'number' ||
        subtask.estimatedHours <= 0
      ) {
        throw new Error(
          'Invalid subtask: estimatedHours must be a positive number',
        );
      }
      if (!['easy', 'medium', 'hard'].includes(subtask.difficulty)) {
        throw new Error(
          'Invalid subtask: difficulty must be easy, medium, or hard',
        );
      }
      if (
        !['research', 'practice', 'create', 'review', 'apply'].includes(
          subtask.type,
        )
      ) {
        throw new Error(
          'Invalid subtask: type must be research, practice, create, review, or apply',
        );
      }
    }
  }

  private enhanceSubtasks(subtasks: SubTask[], totalHours: number): SubTask[] {
    // Ensure proper ordering
    const orderedSubtasks = subtasks
      .map((task, index) => ({ ...task, order: task.order || index + 1 }))
      .sort((a, b) => a.order - b.order);

    // Adjust time estimates to match total hours
    const currentTotal = orderedSubtasks.reduce(
      (sum, task) => sum + task.estimatedHours,
      0,
    );
    const scaleFactor = totalHours / currentTotal;

    return orderedSubtasks.map((task, index) => ({
      ...task,
      order: index + 1,
      estimatedHours: Math.round(task.estimatedHours * scaleFactor * 4) / 4, // Round to nearest 0.25
      resources: task.resources || this.generateDefaultResources(task),
      skills: task.skills || this.generateDefaultSkills(task),
    }));
  }

  private generateDefaultLearningPath(
    subtasks: SubTask[],
  ): BreakdownResponse['learningPath'] {
    const phases = [
      {
        name: 'Foundation',
        subtaskOrders: subtasks
          .slice(0, Math.ceil(subtasks.length / 3))
          .map((t) => t.order),
        estimatedDuration: '1-2 days',
        goals: ['Establish basic understanding', 'Gather necessary resources'],
      },
      {
        name: 'Development',
        subtaskOrders: subtasks
          .slice(
            Math.ceil(subtasks.length / 3),
            Math.ceil((2 * subtasks.length) / 3),
          )
          .map((t) => t.order),
        estimatedDuration: '2-3 days',
        goals: ['Build core skills', 'Practice application'],
      },
      {
        name: 'Mastery',
        subtaskOrders: subtasks
          .slice(Math.ceil((2 * subtasks.length) / 3))
          .map((t) => t.order),
        estimatedDuration: '1-2 days',
        goals: ['Consolidate learning', 'Demonstrate competency'],
      },
    ];

    return {
      phases,
      totalPhases: phases.length,
      recommendedPace: 'Complete 1-2 subtasks per study session',
    };
  }

  private generateDefaultStudyStrategy(
    request: BreakdownRequest,
  ): BreakdownResponse['studyStrategy'] {
    return {
      approach: `Progressive learning approach for ${request.difficulty} level ${request.subject}`,
      keyFocusAreas: [
        'Understanding core concepts',
        'Practical application',
        'Self-assessment and review',
      ],
      successMetrics: [
        'Completion of all subtasks',
        'Ability to explain key concepts',
        'Successful application of knowledge',
      ],
      commonPitfalls: [
        'Rushing through foundational concepts',
        'Skipping practice exercises',
        'Not reviewing previous learning',
      ],
    };
  }

  private generateDefaultResources(subtask: SubTask): string[] {
    const resources: string[] = [];

    switch (subtask.type) {
      case 'research':
        resources.push('Textbooks', 'Online articles', 'Academic papers');
        break;
      case 'practice':
        resources.push('Practice problems', 'Exercises', 'Sample questions');
        break;
      case 'create':
        resources.push('Project templates', 'Examples', 'Creation tools');
        break;
      case 'review':
        resources.push('Summary notes', 'Flashcards', 'Review guides');
        break;
      case 'apply':
        resources.push(
          'Real-world examples',
          'Case studies',
          'Application scenarios',
        );
        break;
    }

    return resources;
  }

  private generateDefaultSkills(subtask: SubTask): string[] {
    const skills: string[] = [];

    switch (subtask.type) {
      case 'research':
        skills.push(
          'Information gathering',
          'Critical reading',
          'Source evaluation',
        );
        break;
      case 'practice':
        skills.push(
          'Problem solving',
          'Skill application',
          'Repetition learning',
        );
        break;
      case 'create':
        skills.push('Creative thinking', 'Synthesis', 'Production skills');
        break;
      case 'review':
        skills.push(
          'Memory consolidation',
          'Self-assessment',
          'Knowledge organization',
        );
        break;
      case 'apply':
        skills.push(
          'Transfer learning',
          'Real-world application',
          'Adaptation',
        );
        break;
    }

    return skills;
  }

  private generateFallbackBreakdown(
    request: BreakdownRequest,
  ): Omit<BreakdownResponse, 'metadata'> {
    const hoursPerTask = request.totalEstimatedHours / 4;

    const fallbackSubtasks: SubTask[] = [
      {
        title: `Research ${request.subject} fundamentals`,
        description: `Gather and study basic information about ${request.taskTitle}`,
        estimatedHours: hoursPerTask,
        order: 1,
        dependencies: [],
        resources: ['Textbooks', 'Online resources'],
        skills: ['Research', 'Reading comprehension'],
        difficulty: 'easy',
        type: 'research',
      },
      {
        title: `Practice core concepts`,
        description: `Work through exercises and examples related to ${request.taskTitle}`,
        estimatedHours: hoursPerTask,
        order: 2,
        dependencies: [1],
        resources: ['Practice problems', 'Exercises'],
        skills: ['Problem solving', 'Application'],
        difficulty: 'medium',
        type: 'practice',
      },
      {
        title: `Create study materials`,
        description: `Develop summaries, notes, or other study aids for ${request.taskTitle}`,
        estimatedHours: hoursPerTask,
        order: 3,
        dependencies: [2],
        resources: ['Note-taking tools', 'Templates'],
        skills: ['Synthesis', 'Organization'],
        difficulty: 'medium',
        type: 'create',
      },
      {
        title: `Review and assess understanding`,
        description: `Test your knowledge and review areas that need improvement`,
        estimatedHours: hoursPerTask,
        order: 4,
        dependencies: [3],
        resources: ['Self-assessment tools', 'Review guides'],
        skills: ['Self-evaluation', 'Review'],
        difficulty: 'easy',
        type: 'review',
      },
    ];

    return {
      originalTask: {
        title: request.taskTitle,
        subject: request.subject,
        totalHours: request.totalEstimatedHours,
      },
      subtasks: fallbackSubtasks,
      learningPath: this.generateDefaultLearningPath(fallbackSubtasks),
      studyStrategy: this.generateDefaultStudyStrategy(request),
    };
  }

  private calculateConfidence(subtasks: SubTask[]): number {
    // Calculate confidence based on subtask quality
    let confidence = 0.8; // Base confidence

    // Check for proper distribution of difficulty levels
    const difficulties = subtasks.map((t) => t.difficulty);
    const hasEasy = difficulties.includes('easy');
    const hasMedium = difficulties.includes('medium');
    const hasHard = difficulties.includes('hard');

    if (hasEasy && hasMedium && hasHard) confidence += 0.1;

    // Check for variety in task types
    const types = new Set(subtasks.map((t) => t.type));
    if (types.size >= 3) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private formatCachedResponse(
    cached: any,
    startTime: number,
  ): BreakdownResponse {
    return {
      originalTask: cached.originalTask || {
        title: '',
        subject: '',
        totalHours: 0,
      },
      subtasks: cached.subtasks || [],
      learningPath: cached.learningPath || {
        phases: [],
        totalPhases: 0,
        recommendedPace: '',
      },
      studyStrategy: cached.studyStrategy || {
        approach: '',
        keyFocusAreas: [],
        successMetrics: [],
        commonPitfalls: [],
      },
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: cached.provider || 'cache',
        tokensUsed: cached.tokensUsed || 0,
        cached: true,
        confidence: cached.confidence || 0.5,
      },
    };
  }
}
