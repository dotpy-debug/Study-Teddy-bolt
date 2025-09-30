import { Injectable, Logger } from '@nestjs/common';
import { AIRouterService } from '../ai-router.service';
import { AICacheService } from '../ai-cache.service';
import { AITokenTrackerService } from '../ai-token-tracker.service';
import { AIActionType, AIRequest } from '../ai-provider.service';

export interface TutorRequest {
  concept: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  userId: string;
  context?: {
    learningGoals?: string[];
    priorKnowledge?: string;
    preferredStyle?: 'detailed' | 'concise' | 'visual' | 'example-heavy';
    timeAvailable?: number; // minutes
  };
}

export interface CheckAnswerRequest {
  question: string;
  studentAnswer: string;
  subject: string;
  userId: string;
  correctAnswer?: string;
  context?: {
    explanation?: string;
    hints?: string[];
  };
}

export interface PracticeQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'problem-solving';
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[]; // For multiple choice
  correctAnswer?: string;
  explanation?: string;
  hints: string[];
  estimatedTime: number; // minutes
  tags: string[];
}

export interface ConceptExplanation {
  concept: string;
  definition: string;
  keyPoints: string[];
  examples: Array<{
    title: string;
    description: string;
    visual?: string;
  }>;
  analogies: string[];
  commonMistakes: string[];
  prerequisites?: string[];
  relatedConcepts?: string[];
}

export interface TutorResponse {
  explanation: ConceptExplanation;
  practiceQuestions: PracticeQuestion[];
  studyTips: {
    memorization: string[];
    application: string[];
    furtherStudy: string[];
  };
  metadata: {
    processingTimeMs: number;
    provider: string;
    tokensUsed: number;
    cached: boolean;
    confidence: number;
  };
}

export interface AnswerCheckResponse {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: {
    positive: string[];
    corrections: string[];
    suggestions: string[];
  };
  correctAnswer: string;
  explanation: string;
  hints: string[];
  nextSteps: string[];
  metadata: {
    processingTimeMs: number;
    provider: string;
    tokensUsed: number;
    cached: boolean;
  };
}

@Injectable()
export class TutorService {
  private readonly logger = new Logger(TutorService.name);

  constructor(
    private aiRouterService: AIRouterService,
    private aiCacheService: AICacheService,
    private tokenTracker: AITokenTrackerService,
  ) {}

  async explainConcept(request: TutorRequest): Promise<TutorResponse> {
    const startTime = Date.now();

    // Check budget before proceeding
    await this.tokenTracker.checkBudget(request.userId, 2500); // Estimate 2500 tokens for explanation

    // Check cache first
    const cacheKey = this.buildCacheKey(request);
    const cached = await this.aiCacheService.getCachedResponse(
      AIActionType.TUTOR,
      cacheKey,
      undefined,
      request.userId,
    );

    if (cached) {
      return this.formatCachedTutorResponse(cached, startTime);
    }

    // Build the system prompt for tutoring
    const systemPrompt = this.buildTutorSystemPrompt(request);

    // Build the user prompt
    const userPrompt = this.buildTutorUserPrompt(request);

    // Create AI request
    const aiRequest: AIRequest = {
      actionType: AIActionType.TUTOR,
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 3000,
      temperature: 0.5, // Balanced for educational content
      userId: request.userId,
      metadata: {
        concept: request.concept,
        subject: request.subject,
        difficulty: request.difficulty,
      },
    };

    // Execute request through router
    const aiResponse = await this.aiRouterService.routeRequest(aiRequest);

    // Track token usage
    await this.tokenTracker.trackUsage({
      userId: request.userId,
      actionType: AIActionType.TUTOR,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: aiResponse.tokensUsed,
      costInCents: aiResponse.costInCents,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: new Date(),
    });

    // Parse the AI response
    const parsedResponse = await this.parseExplanationResponse(aiResponse.content, request);

    // Cache the response
    await this.aiCacheService.cacheResponse(
      AIActionType.TUTOR,
      cacheKey,
      aiResponse,
      systemPrompt,
      request.userId,
    );

    // Build final response
    const response: TutorResponse = {
      ...parsedResponse,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        cached: false,
        confidence: this.calculateExplanationConfidence(parsedResponse),
      },
    };

    this.logger.log(
      `Generated explanation for "${request.concept}" with ${response.practiceQuestions.length} questions for user ${request.userId}`,
    );

    return response;
  }

  async checkAnswer(request: CheckAnswerRequest): Promise<AnswerCheckResponse> {
    const startTime = Date.now();

    // Check budget before proceeding
    await this.tokenTracker.checkBudget(request.userId, 1000); // Estimate 1000 tokens for answer checking

    // Build cache key for answer checking
    const cacheKey = `${request.question}_${request.studentAnswer}_${request.subject}`;
    const cached = await this.aiCacheService.getCachedResponse(
      AIActionType.TUTOR,
      cacheKey,
      undefined,
      request.userId,
    );

    if (cached) {
      return this.formatCachedAnswerResponse(cached, startTime);
    }

    // Build the system prompt for answer checking
    const systemPrompt = this.buildAnswerCheckSystemPrompt();

    // Build the user prompt
    const userPrompt = this.buildAnswerCheckUserPrompt(request);

    // Create AI request
    const aiRequest: AIRequest = {
      actionType: AIActionType.TUTOR,
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.3, // Lower temperature for consistent grading
      userId: request.userId,
      metadata: {
        question: request.question,
        subject: request.subject,
      },
    };

    // Execute request through router
    const aiResponse = await this.aiRouterService.routeRequest(aiRequest);

    // Track token usage
    await this.tokenTracker.trackUsage({
      userId: request.userId,
      actionType: AIActionType.TUTOR,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: aiResponse.tokensUsed,
      costInCents: aiResponse.costInCents,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: new Date(),
    });

    // Parse the AI response
    const parsedResponse = await this.parseAnswerCheckResponse(aiResponse.content, request);

    // Cache the response (shorter TTL for answer checking)
    await this.aiCacheService.cacheResponse(
      AIActionType.TUTOR,
      cacheKey,
      aiResponse,
      systemPrompt,
      request.userId,
    );

    // Build final response
    const response: AnswerCheckResponse = {
      ...parsedResponse,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        cached: false,
      },
    };

    this.logger.log(
      `Checked answer for user ${request.userId}: ${response.isCorrect ? 'Correct' : 'Incorrect'} (Score: ${response.score})`,
    );

    return response;
  }

  private buildTutorSystemPrompt(request: TutorRequest): string {
    const basePrompt = `You are an expert tutor specializing in ${request.subject}. Your role is to provide clear, comprehensive explanations and generate effective practice questions.

TEACHING PRINCIPLES:
1. Explain concepts clearly at the ${request.difficulty} level
2. Use concrete examples and analogies
3. Highlight common mistakes and misconceptions
4. Generate exactly 3 practice questions of varying difficulty
5. Provide helpful study tips and learning strategies

OUTPUT FORMAT - Return ONLY valid JSON in this exact structure:
{
  "explanation": {
    "concept": "Concept name",
    "definition": "Clear, concise definition",
    "keyPoints": ["key point 1", "key point 2", "key point 3"],
    "examples": [
      {
        "title": "Example title",
        "description": "Detailed example description",
        "visual": "optional visual description"
      }
    ],
    "analogies": ["helpful analogy 1", "analogy 2"],
    "commonMistakes": ["mistake 1", "mistake 2"],
    "prerequisites": ["prerequisite 1", "prerequisite 2"],
    "relatedConcepts": ["related concept 1", "concept 2"]
  },
  "practiceQuestions": [
    {
      "id": "q1",
      "question": "Question text",
      "type": "multiple-choice|short-answer|essay|problem-solving",
      "difficulty": "easy|medium|hard",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "correct answer",
      "explanation": "why this is correct",
      "hints": ["hint 1", "hint 2"],
      "estimatedTime": 5,
      "tags": ["tag1", "tag2"]
    }
  ],
  "studyTips": {
    "memorization": ["tip 1", "tip 2"],
    "application": ["tip 1", "tip 2"],
    "furtherStudy": ["resource 1", "resource 2"]
  }
}`;

    // Add context-specific guidance
    if (request.context?.preferredStyle) {
      return (
        basePrompt + `\n\nSTYLE: Use ${request.context.preferredStyle} approach to explanations`
      );
    }

    if (request.context?.timeAvailable) {
      return (
        basePrompt +
        `\n\nTIME CONSTRAINT: Student has ${request.context.timeAvailable} minutes available`
      );
    }

    return basePrompt;
  }

  private buildTutorUserPrompt(request: TutorRequest): string {
    let prompt = `Explain the concept: "${request.concept}" in ${request.subject}

DIFFICULTY LEVEL: ${request.difficulty}`;

    if (request.context?.learningGoals) {
      prompt += `\n\nLEARNING GOALS: ${request.context.learningGoals.join(', ')}`;
    }

    if (request.context?.priorKnowledge) {
      prompt += `\n\nPRIOR KNOWLEDGE: ${request.context.priorKnowledge}`;
    }

    prompt += `\n\nPlease provide a comprehensive explanation with examples and generate 3 practice questions to test understanding.`;

    return prompt;
  }

  private buildAnswerCheckSystemPrompt(): string {
    return `You are an expert grader and educational assessor. Your role is to evaluate student answers fairly and provide constructive feedback.

GRADING PRINCIPLES:
1. Assess both correctness and understanding
2. Provide specific, actionable feedback
3. Acknowledge what the student did well
4. Offer hints for improvement without giving away the answer
5. Suggest next learning steps

OUTPUT FORMAT - Return ONLY valid JSON in this exact structure:
{
  "isCorrect": true/false,
  "score": 85,
  "feedback": {
    "positive": ["what they did well"],
    "corrections": ["what needs fixing"],
    "suggestions": ["how to improve"]
  },
  "correctAnswer": "the correct answer",
  "explanation": "why this is the correct answer",
  "hints": ["hint 1", "hint 2"],
  "nextSteps": ["what to study next"]
}`;
  }

  private buildAnswerCheckUserPrompt(request: CheckAnswerRequest): string {
    let prompt = `Please evaluate this student answer:

QUESTION: "${request.question}"
STUDENT ANSWER: "${request.studentAnswer}"
SUBJECT: ${request.subject}`;

    if (request.correctAnswer) {
      prompt += `\n\nCORRECT ANSWER: ${request.correctAnswer}`;
    }

    if (request.context?.explanation) {
      prompt += `\n\nEXPLANATION: ${request.context.explanation}`;
    }

    if (request.context?.hints) {
      prompt += `\n\nAVAILABLE HINTS: ${request.context.hints.join(', ')}`;
    }

    return prompt;
  }

  private buildCacheKey(request: TutorRequest): string {
    const contextStr = request.context ? JSON.stringify(request.context) : '';
    return `${request.concept}_${request.subject}_${request.difficulty}_${contextStr}`;
  }

  private async parseExplanationResponse(
    content: string,
    originalRequest: TutorRequest,
  ): Promise<Omit<TutorResponse, 'metadata'>> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);

      // Validate and enhance the response
      this.validateExplanationResponse(parsed);

      // Generate IDs for practice questions
      const enhancedQuestions = parsed.practiceQuestions.map((q: any, index: number) => ({
        ...q,
        id: q.id || `q${index + 1}`,
        hints: q.hints || [],
        tags: q.tags || [originalRequest.subject.toLowerCase()],
        estimatedTime: q.estimatedTime || 5,
      }));

      return {
        explanation: parsed.explanation,
        practiceQuestions: enhancedQuestions,
        studyTips: parsed.studyTips || this.generateDefaultStudyTips(originalRequest),
      };
    } catch (error) {
      this.logger.error('Failed to parse tutor explanation response:', error);
      this.logger.debug('Raw AI response:', content);

      // Return fallback explanation
      return this.generateFallbackExplanation(originalRequest);
    }
  }

  private async parseAnswerCheckResponse(
    content: string,
    originalRequest: CheckAnswerRequest,
  ): Promise<Omit<AnswerCheckResponse, 'metadata'>> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);

      return {
        isCorrect: parsed.isCorrect || false,
        score: Math.max(0, Math.min(100, parsed.score || 0)),
        feedback: parsed.feedback || {
          positive: [],
          corrections: ['Please review the concept and try again'],
          suggestions: ['Consider studying the fundamentals'],
        },
        correctAnswer: parsed.correctAnswer || 'Answer not available',
        explanation: parsed.explanation || 'Explanation not available',
        hints: parsed.hints || [],
        nextSteps: parsed.nextSteps || ['Review the material and practice more'],
      };
    } catch (error) {
      this.logger.error('Failed to parse answer check response:', error);

      // Return fallback assessment
      return {
        isCorrect: false,
        score: 0,
        feedback: {
          positive: ['Thank you for attempting the question'],
          corrections: ['Unable to assess the answer automatically'],
          suggestions: ['Please review with a teacher or tutor'],
        },
        correctAnswer: 'Unable to determine',
        explanation: 'Automatic grading failed - please seek additional help',
        hints: ['Review your notes', 'Check examples in your textbook'],
        nextSteps: ['Practice similar problems', 'Ask for help if needed'],
      };
    }
  }

  private validateExplanationResponse(response: any): void {
    if (!response.explanation || !response.explanation.concept) {
      throw new Error('Invalid response: explanation.concept is required');
    }

    if (!response.practiceQuestions || !Array.isArray(response.practiceQuestions)) {
      throw new Error('Invalid response: practiceQuestions must be an array');
    }

    if (response.practiceQuestions.length !== 3) {
      throw new Error('Invalid response: must have exactly 3 practice questions');
    }

    for (const question of response.practiceQuestions) {
      if (!question.question || !question.type || !question.difficulty) {
        throw new Error('Invalid question: question, type, and difficulty are required');
      }
    }
  }

  private generateDefaultStudyTips(request: TutorRequest): TutorResponse['studyTips'] {
    return {
      memorization: [
        'Create flashcards for key terms',
        'Use spaced repetition techniques',
        'Draw concept maps to visualize relationships',
      ],
      application: [
        'Practice with real-world examples',
        'Solve problems step by step',
        'Explain concepts to someone else',
      ],
      furtherStudy: [
        `Look for additional ${request.subject} resources`,
        'Join study groups or online communities',
        'Practice regularly with varied examples',
      ],
    };
  }

  private generateFallbackExplanation(request: TutorRequest): Omit<TutorResponse, 'metadata'> {
    return {
      explanation: {
        concept: request.concept,
        definition: `${request.concept} is an important concept in ${request.subject}`,
        keyPoints: [
          `Understanding ${request.concept} is fundamental`,
          'Practice and application are key to mastery',
          'Connect this concept to what you already know',
        ],
        examples: [
          {
            title: 'Basic Example',
            description: `A simple example of ${request.concept} in practice`,
          },
        ],
        analogies: [`Think of ${request.concept} like...`],
        commonMistakes: ['Not understanding the fundamentals', 'Rushing through examples'],
        prerequisites: ['Basic understanding of the subject'],
        relatedConcepts: ['Related topics in the field'],
      },
      practiceQuestions: [
        {
          id: 'q1',
          question: `What is ${request.concept}?`,
          type: 'short-answer',
          difficulty: 'easy',
          correctAnswer: 'Review the definition and key points',
          explanation: 'This tests basic understanding',
          hints: ['Think about the main definition', 'Consider the key characteristics'],
          estimatedTime: 5,
          tags: [request.subject.toLowerCase()],
        },
        {
          id: 'q2',
          question: `How would you apply ${request.concept} in practice?`,
          type: 'short-answer',
          difficulty: 'medium',
          correctAnswer: 'Application depends on specific context',
          explanation: 'This tests application understanding',
          hints: ['Think of real-world examples', 'Consider step-by-step process'],
          estimatedTime: 10,
          tags: [request.subject.toLowerCase(), 'application'],
        },
        {
          id: 'q3',
          question: `Compare ${request.concept} with similar concepts`,
          type: 'essay',
          difficulty: 'hard',
          correctAnswer: 'Detailed comparison with examples',
          explanation: 'This tests deeper understanding',
          hints: ['Identify similarities and differences', 'Use specific examples'],
          estimatedTime: 15,
          tags: [request.subject.toLowerCase(), 'analysis'],
        },
      ],
      studyTips: this.generateDefaultStudyTips(request),
    };
  }

  private calculateExplanationConfidence(response: Omit<TutorResponse, 'metadata'>): number {
    let confidence = 0.7; // Base confidence

    // Check explanation quality
    if (response.explanation.keyPoints.length >= 3) confidence += 0.1;
    if (response.explanation.examples.length >= 1) confidence += 0.1;
    if (response.explanation.analogies.length >= 1) confidence += 0.05;

    // Check question quality
    if (response.practiceQuestions.length === 3) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private formatCachedTutorResponse(cached: any, startTime: number): TutorResponse {
    return {
      explanation: cached.explanation || {},
      practiceQuestions: cached.practiceQuestions || [],
      studyTips: cached.studyTips || {
        memorization: [],
        application: [],
        furtherStudy: [],
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

  private formatCachedAnswerResponse(cached: any, startTime: number): AnswerCheckResponse {
    return {
      isCorrect: cached.isCorrect || false,
      score: cached.score || 0,
      feedback: cached.feedback || {
        positive: [],
        corrections: [],
        suggestions: [],
      },
      correctAnswer: cached.correctAnswer || '',
      explanation: cached.explanation || '',
      hints: cached.hints || [],
      nextSteps: cached.nextSteps || [],
      metadata: {
        processingTimeMs: Date.now() - startTime,
        provider: cached.provider || 'cache',
        tokensUsed: cached.tokensUsed || 0,
        cached: true,
      },
    };
  }
}
