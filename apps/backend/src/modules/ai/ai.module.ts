import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';

// New AI Services
import { AIProviderService } from './services/ai-provider.service';
import { AIRouterService } from './services/ai-router.service';
import { AITokenTrackerService } from './services/ai-token-tracker.service';
import { AICacheService } from './services/ai-cache.service';

// Pattern Services
import { TaskifyService } from './services/patterns/taskify.service';
import { BreakdownService } from './services/patterns/breakdown.service';
import { TutorService } from './services/patterns/tutor.service';

// Common Services Dependencies
import { DrizzleService } from '../../db/drizzle.service';
import { CacheModule } from '../../common/cache/cache.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CacheModule, ConfigModule],
  controllers: [AIController],
  providers: [
    // Legacy service for backward compatibility
    AIService,

    // Core AI services
    AIProviderService,
    AIRouterService,
    AITokenTrackerService,
    AICacheService,

    // Pattern services
    TaskifyService,
    BreakdownService,
    TutorService,

    // Dependencies
    DrizzleService,
  ],
  exports: [
    AIService,
    AIProviderService,
    AIRouterService,
    AITokenTrackerService,
    AICacheService,
    TaskifyService,
    BreakdownService,
    TutorService,
  ],
})
export class AIModule {}
