import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringController } from './monitoring.controller';
import { PerformanceService } from './performance.service';
import { ErrorTrackingService } from './error-tracking.service';
import { DatabaseMonitorService } from './database-monitor.service';
import { UptimeMonitorService } from './uptime-monitor.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [ScheduleModule.forRoot(), DbModule],
  controllers: [MonitoringController],
  providers: [
    PerformanceService,
    ErrorTrackingService,
    DatabaseMonitorService,
    UptimeMonitorService,
  ],
  exports: [
    PerformanceService,
    ErrorTrackingService,
    DatabaseMonitorService,
    UptimeMonitorService,
  ],
})
export class MonitoringModule {}
