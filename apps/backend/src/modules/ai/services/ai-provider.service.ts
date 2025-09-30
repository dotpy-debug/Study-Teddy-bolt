import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

export enum AIProvider {
  DEEPSEEK_V3 = 'deepseek-v3',
  DEEPSEEK_CODER = 'deepseek-coder',
  OPENAI_GPT4 = 'openai-gpt4',
  OPENAI_GPT4O_MINI = 'openai-gpt4o-mini',
}

export enum AIActionType {
  TASKIFY = 'taskify',
  BREAKDOWN = 'breakdown',
  TUTOR = 'tutor',
  CHAT = 'chat',
}

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
  baseURL?: string;
  costPerToken: number; // Cost in cents per 1k tokens
}

export interface AIRequest {
  actionType: AIActionType;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  userId: string;
  metadata?: any;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  provider: AIProvider;
  model: string;
  costInCents: number;
  responseTimeMs: number;
  cached?: boolean;
}

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);
  private readonly providers: Map<AIProvider, OpenAI> = new Map();
  private readonly configs: Map<AIProvider, AIProviderConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // DeepSeek V3 (Primary provider)
    const deepseekV3Config: AIProviderConfig = {
      provider: AIProvider.DEEPSEEK_V3,
      model: 'deepseek-chat',
      maxTokens: 3000,
      temperature: 0.7,
      apiKey: this.configService.get<string>('DEEPSEEK_API_KEY'),
      baseURL: 'https://api.deepseek.com/v1',
      costPerToken: 0.0014, // $0.14 per 1k input tokens
    };

    // DeepSeek Coder (For code-related tasks)
    const deepseekCoderConfig: AIProviderConfig = {
      provider: AIProvider.DEEPSEEK_CODER,
      model: 'deepseek-coder',
      maxTokens: 3000,
      temperature: 0.3,
      apiKey: this.configService.get<string>('DEEPSEEK_API_KEY'),
      baseURL: 'https://api.deepseek.com/v1',
      costPerToken: 0.0014,
    };

    // OpenAI GPT-4 (Complex fallback)
    const openaiGpt4Config: AIProviderConfig = {
      provider: AIProvider.OPENAI_GPT4,
      model: 'gpt-4',
      maxTokens: 3000,
      temperature: 0.7,
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      costPerToken: 0.03, // $3.00 per 1k input tokens
    };

    // OpenAI GPT-4O Mini (Efficient fallback)
    const openaiGpt4oMiniConfig: AIProviderConfig = {
      provider: AIProvider.OPENAI_GPT4O_MINI,
      model: 'gpt-4o-mini',
      maxTokens: 3000,
      temperature: 0.7,
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      costPerToken: 0.00015, // $0.15 per 1k input tokens
    };

    // Initialize configurations
    this.configs.set(AIProvider.DEEPSEEK_V3, deepseekV3Config);
    this.configs.set(AIProvider.DEEPSEEK_CODER, deepseekCoderConfig);
    this.configs.set(AIProvider.OPENAI_GPT4, openaiGpt4Config);
    this.configs.set(AIProvider.OPENAI_GPT4O_MINI, openaiGpt4oMiniConfig);

    // Initialize OpenAI clients
    this.initializeClient(deepseekV3Config);
    this.initializeClient(deepseekCoderConfig);
    this.initializeClient(openaiGpt4Config);
    this.initializeClient(openaiGpt4oMiniConfig);

    this.logger.log('AI providers initialized successfully');
  }

  private initializeClient(config: AIProviderConfig): void {
    if (!config.apiKey) {
      this.logger.warn(`API key not found for provider: ${config.provider}`);
      return;
    }

    const clientOptions: any = {
      apiKey: config.apiKey,
    };

    if (config.baseURL) {
      clientOptions.baseURL = config.baseURL;
    }

    const client = new OpenAI(clientOptions);
    this.providers.set(config.provider, client);

    this.logger.log(`Initialized client for provider: ${config.provider}`);
  }

  async executeRequest(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const client = this.providers.get(provider);
    const config = this.configs.get(provider);

    if (!client || !config) {
      throw new Error(`Provider ${provider} is not available`);
    }

    const startTime = Date.now();

    try {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || 'You are a helpful AI assistant.',
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature ?? config.temperature,
      });

      const responseTime = Date.now() - startTime;
      const content = completion.choices[0].message.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const costInCents = (tokensUsed / 1000) * config.costPerToken;

      return {
        content,
        tokensUsed,
        provider,
        model: config.model,
        costInCents,
        responseTimeMs: responseTime,
      };
    } catch (error) {
      this.logger.error(`Error executing request with provider ${provider}:`, error);
      throw error;
    }
  }

  getProviderConfig(provider: AIProvider): AIProviderConfig | undefined {
    return this.configs.get(provider);
  }

  isProviderAvailable(provider: AIProvider): boolean {
    return this.providers.has(provider) && this.configs.has(provider);
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  calculateCost(provider: AIProvider, tokens: number): number {
    const config = this.configs.get(provider);
    if (!config) return 0;
    return (tokens / 1000) * config.costPerToken;
  }
}
