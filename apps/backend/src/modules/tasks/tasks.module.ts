import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { SubtasksController } from './subtasks.controller';
import { TasksService } from './tasks.service';
import { SubtasksService } from './subtasks.service';
import { TaskParserService } from './services/task-parser.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PerformanceModule } from '../../common/performance/performance.module';
import { CacheModule } from '../../common/cache/cache.module';
import { DrizzleService } from '../../db/drizzle.service';

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    PerformanceModule,
    CacheModule,
  ],
  controllers: [TasksController, SubtasksController],
  providers: [TasksService, SubtasksService, TaskParserService, DrizzleService],
  exports: [TasksService, SubtasksService, TaskParserService],
})
export class TasksModule {}
