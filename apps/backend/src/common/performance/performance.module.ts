import { Module } from '@nestjs/common';
import { QueryOptimizerService } from './query-optimizer.service';
import { PerformanceController } from './performance.controller';

@Module({
  providers: [QueryOptimizerService],
  controllers: [PerformanceController],
  exports: [QueryOptimizerService],
})
export class PerformanceModule {}
