import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  poolMax: number;
  idleTimeout: number;
  connectTimeout: number;
  debug: boolean;
  logging: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface RateLimitConfig {
  global: {
    ttl: number;
    limit: number;
  };
  ai: {
    chat: {
      ttl: number;
      limit: number;
    };
    practiceQuestions: {
      ttl: number;
      limit: number;
    };
    studyPlan: {
      ttl: number;
      limit: number;
    };
    heavy: {
      ttl: number;
      limit: number;
    };
    light: {
      ttl: number;
      limit: number;
    };
  };
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  apiPrefix: string;
}

@Injectable()
export class EnvironmentConfig {
  constructor(private configService: ConfigService) {}

  get database(): DatabaseConfig {
    return {
      url: this.configService.get<string>('DATABASE_URL') || '',
      poolMax: parseInt(this.configService.get<string>('DB_POOL_MAX') || '20'),
      idleTimeout: parseInt(this.configService.get<string>('DB_IDLE_TIMEOUT') || '20'),
      connectTimeout: parseInt(this.configService.get<string>('DB_CONNECT_TIMEOUT') || '10'),
      debug: this.configService.get<string>('DB_DEBUG') === 'true',
      logging: this.configService.get<string>('DB_LOGGING') === 'true',
    };
  }

  get jwt(): JwtConfig {
    return {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    };
  }

  get googleOAuth(): GoogleOAuthConfig {
    return {
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackUrl: this.configService.get<string>('GOOGLE_CALLBACK_URL') || '',
    };
  }

  get openAI(): OpenAIConfig {
    return {
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || '',
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
      maxTokens: parseInt(this.configService.get<string>('OPENAI_MAX_TOKENS') || '500'),
      temperature: parseFloat(this.configService.get<string>('OPENAI_TEMPERATURE') || '0.7'),
    };
  }

  get rateLimit(): RateLimitConfig {
    return {
      global: {
        ttl: parseInt(this.configService.get<string>('RATE_LIMIT_TTL') || '60000'), // 1 minute
        limit: parseInt(this.configService.get<string>('RATE_LIMIT_COUNT') || '100'), // 100 requests
      },
      ai: {
        chat: {
          ttl: parseInt(this.configService.get<string>('AI_CHAT_TTL') || '60000'),
          limit: parseInt(this.configService.get<string>('AI_CHAT_LIMIT') || '10'),
        },
        practiceQuestions: {
          ttl: parseInt(this.configService.get<string>('AI_PRACTICE_TTL') || '60000'),
          limit: parseInt(this.configService.get<string>('AI_PRACTICE_LIMIT') || '5'),
        },
        studyPlan: {
          ttl: parseInt(this.configService.get<string>('AI_STUDY_PLAN_TTL') || '60000'),
          limit: parseInt(this.configService.get<string>('AI_STUDY_PLAN_LIMIT') || '3'),
        },
        heavy: {
          ttl: parseInt(this.configService.get<string>('AI_HEAVY_TTL') || '60000'),
          limit: parseInt(this.configService.get<string>('AI_HEAVY_LIMIT') || '2'),
        },
        light: {
          ttl: parseInt(this.configService.get<string>('AI_LIGHT_TTL') || '60000'),
          limit: parseInt(this.configService.get<string>('AI_LIGHT_LIMIT') || '20'),
        },
      },
    };
  }

  get app(): AppConfig {
    return {
      port: parseInt(this.configService.get<string>('PORT') || '3001'),
      nodeEnv: this.configService.get<string>('NODE_ENV') || 'development',
      frontendUrl: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
      apiPrefix: this.configService.get<string>('API_PREFIX') || 'api',
    };
  }

  get isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.app.nodeEnv === 'test';
  }

  validateConfig(): void {
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];

    const missingVars = requiredVars.filter((varName) => !this.configService.get(varName));

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate JWT secret length
    if (this.jwt.secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Validate database URL format
    if (
      !this.database.url.startsWith('postgresql://') &&
      !this.database.url.startsWith('postgres://')
    ) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }
  }
}
