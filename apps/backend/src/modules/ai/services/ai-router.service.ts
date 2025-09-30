import { Injectable, Logger } from '@nestjs/common';
import {
  AIProviderService,
  AIProvider,
  AIActionType,
  AIRequest,
  AIResponse,
} from './ai-provider.service';

export interface ProviderRoute {
  primary: AIProvider;
  fallbacks: AIProvider[];
  retryAttempts: number;
}

export interface CodeIntent {
  isCodeRelated: boolean;
  confidence: number;
  keywords: string[];
}

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  // Code-related keywords for intent detection
  private readonly codeKeywords = [
    'code',
    'programming',
    'function',
    'variable',
    'algorithm',
    'debug',
    'syntax',
    'method',
    'class',
    'object',
    'array',
    'loop',
    'conditional',
    'javascript',
    'python',
    'java',
    'c++',
    'typescript',
    'react',
    'node',
    'api',
    'database',
    'sql',
    'html',
    'css',
    'git',
    'github',
    'repository',
    'framework',
    'library',
    'package',
    'import',
    'export',
    'compile',
    'runtime',
    'error',
    'exception',
    'stack trace',
    'callback',
    'promise',
    'async',
    'await',
    'closure',
    'scope',
    'hoisting',
    'prototype',
  ];

  constructor(private aiProviderService: AIProviderService) {}

  /**
   * Route AI request to appropriate provider based on action type and content analysis
   */
  async routeRequest(request: AIRequest): Promise<AIResponse> {
    const route = this.determineRoute(request);

    this.logger.debug(
      `Routing ${request.actionType} request to primary provider: ${route.primary}`,
    );

    // Try primary provider first
    try {
      return await this.aiProviderService.executeRequest(route.primary, request);
    } catch (error) {
      this.logger.warn(
        `Primary provider ${route.primary} failed, attempting fallbacks`,
        error.message,
      );

      return await this.executeWithFallbacks(request, route.fallbacks);
    }
  }

  /**
   * Determine the best provider route based on action type and content analysis
   */
  private determineRoute(request: AIRequest): ProviderRoute {
    const codeIntent = this.analyzeCodeIntent(request.prompt);

    switch (request.actionType) {
      case AIActionType.TASKIFY:
        return {
          primary: AIProvider.DEEPSEEK_V3,
          fallbacks: [AIProvider.OPENAI_GPT4O_MINI, AIProvider.OPENAI_GPT4],
          retryAttempts: 2,
        };

      case AIActionType.BREAKDOWN:
        return {
          primary: AIProvider.DEEPSEEK_V3,
          fallbacks: [AIProvider.OPENAI_GPT4O_MINI, AIProvider.OPENAI_GPT4],
          retryAttempts: 2,
        };

      case AIActionType.TUTOR:
        // For complex educational content, prefer more capable models
        return {
          primary: AIProvider.DEEPSEEK_V3,
          fallbacks: [AIProvider.OPENAI_GPT4, AIProvider.OPENAI_GPT4O_MINI],
          retryAttempts: 2,
        };

      case AIActionType.CHAT:
        // Route based on code intent detection
        if (codeIntent.isCodeRelated && codeIntent.confidence > 0.7) {
          return {
            primary: AIProvider.DEEPSEEK_CODER,
            fallbacks: [AIProvider.DEEPSEEK_V3, AIProvider.OPENAI_GPT4O_MINI],
            retryAttempts: 2,
          };
        }

        // For general chat, use default routing
        return {
          primary: AIProvider.DEEPSEEK_V3,
          fallbacks: [AIProvider.OPENAI_GPT4O_MINI, AIProvider.OPENAI_GPT4],
          retryAttempts: 2,
        };

      default:
        // Default routing
        return {
          primary: AIProvider.DEEPSEEK_V3,
          fallbacks: [AIProvider.OPENAI_GPT4O_MINI, AIProvider.OPENAI_GPT4],
          retryAttempts: 2,
        };
    }
  }

  /**
   * Analyze prompt to detect code-related intent
   */
  private analyzeCodeIntent(prompt: string): CodeIntent {
    const lowerPrompt = prompt.toLowerCase();
    const foundKeywords: string[] = [];

    // Count keyword matches
    for (const keyword of this.codeKeywords) {
      if (lowerPrompt.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }

    // Calculate confidence based on keyword density
    const wordCount = prompt.split(/\s+/).length;
    const keywordDensity = foundKeywords.length / wordCount;

    // Code block detection
    const hasCodeBlock = /```|`[^`\n]+`/.test(prompt);

    // Programming patterns
    const hasProgrammingPatterns =
      /\b(function\s+\w+|class\s+\w+|import\s+\w+|const\s+\w+\s*=|def\s+\w+|public\s+class|private\s+\w+)\b/.test(
        prompt,
      );

    let confidence = keywordDensity * 0.5;

    if (hasCodeBlock) confidence += 0.3;
    if (hasProgrammingPatterns) confidence += 0.4;
    if (foundKeywords.length >= 3) confidence += 0.2;

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    const isCodeRelated = confidence > 0.3;

    this.logger.debug(
      `Code intent analysis: ${isCodeRelated ? 'Code-related' : 'General'} ` +
        `(confidence: ${confidence.toFixed(2)}, keywords: ${foundKeywords.length})`,
    );

    return {
      isCodeRelated,
      confidence,
      keywords: foundKeywords,
    };
  }

  /**
   * Execute request with fallback providers if primary fails
   */
  private async executeWithFallbacks(
    request: AIRequest,
    fallbacks: AIProvider[],
  ): Promise<AIResponse> {
    let lastError: Error;

    for (const provider of fallbacks) {
      if (!this.aiProviderService.isProviderAvailable(provider)) {
        this.logger.warn(`Fallback provider ${provider} is not available`);
        continue;
      }

      try {
        this.logger.debug(`Trying fallback provider: ${provider}`);
        const response = await this.aiProviderService.executeRequest(provider, request);

        this.logger.log(`Successfully executed with fallback provider: ${provider}`);
        return response;
      } catch (error) {
        this.logger.warn(`Fallback provider ${provider} failed:`, error.message);
        lastError = error;
      }
    }

    // If all providers failed, throw the last error
    this.logger.error('All providers failed to execute request');
    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Get routing statistics for monitoring
   */
  getRoutingStats(): {
    availableProviders: AIProvider[];
    routingRules: Record<AIActionType, ProviderRoute>;
  } {
    const availableProviders = this.aiProviderService.getAvailableProviders();

    const routingRules: Record<AIActionType, ProviderRoute> = {
      [AIActionType.TASKIFY]: this.determineRoute({
        actionType: AIActionType.TASKIFY,
        prompt: '',
        userId: '',
      }),
      [AIActionType.BREAKDOWN]: this.determineRoute({
        actionType: AIActionType.BREAKDOWN,
        prompt: '',
        userId: '',
      }),
      [AIActionType.TUTOR]: this.determineRoute({
        actionType: AIActionType.TUTOR,
        prompt: '',
        userId: '',
      }),
      [AIActionType.CHAT]: this.determineRoute({
        actionType: AIActionType.CHAT,
        prompt: '',
        userId: '',
      }),
    };

    return {
      availableProviders,
      routingRules,
    };
  }
}
