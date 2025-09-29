import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { GoalsRepository } from './goals.repository';
import { DrizzleModule } from '../../db/drizzle.module';
import { CacheModule } from '../../common/cache/cache.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    DrizzleModule,
    CacheModule,
    AIModule,
    ScheduleModule.forRoot(), // Enable scheduled tasks for reminders and overdue goals
  ],
  controllers: [GoalsController],
  providers: [GoalsService, GoalsRepository],
  exports: [GoalsService, GoalsRepository],
})
export class GoalsModule {}
