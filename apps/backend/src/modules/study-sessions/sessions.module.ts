import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';
import { SessionsGateway } from './sessions.gateway';
import { PomodoroService } from './pomodoro.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { DrizzleService } from '../../db/drizzle.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    AuthModule, // Import AuthModule for Better Auth integration
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionsRepository,
    SessionsGateway,
    PomodoroService,
    DrizzleService, // Ensure DrizzleService is available
  ],
  exports: [SessionsService, SessionsRepository, PomodoroService],
})
export class StudySessionsModule {}
