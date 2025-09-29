import { ApiProperty } from '@nestjs/swagger';
import { FocusType } from './start-focus-session.dto';
import { SessionStatus } from './focus-session-query.dto';

export class FocusSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty({ required: false })
  subjectId?: string;

  @ApiProperty()
  type: FocusType;

  @ApiProperty()
  status: SessionStatus;

  @ApiProperty()
  startTime: Date;

  @ApiProperty({ required: false })
  endTime?: Date;

  @ApiProperty()
  scheduledDuration: number;

  @ApiProperty({ required: false })
  actualDuration?: number;

  @ApiProperty({ required: false })
  breakDuration?: number;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  goals?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  productivityRating?: number;

  @ApiProperty({ required: false })
  focusRating?: number;

  @ApiProperty({ required: false })
  distractionCount?: number;

  @ApiProperty({ required: false })
  taskProgress?: number;

  @ApiProperty()
  distractionBlocking: boolean;

  @ApiProperty()
  backgroundSound: boolean;

  @ApiProperty({ required: false })
  soundType?: string;

  @ApiProperty({ required: false })
  pausedAt?: Date;

  @ApiProperty({ required: false })
  totalPauseDuration?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FocusSessionStatsDto {
  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  completedSessions: number;

  @ApiProperty()
  totalFocusTime: number;

  @ApiProperty()
  averageSessionDuration: number;

  @ApiProperty()
  averageProductivityRating: number;

  @ApiProperty()
  averageFocusRating: number;

  @ApiProperty()
  longestStreak: number;

  @ApiProperty()
  currentStreak: number;

  @ApiProperty()
  mostProductiveTime: string;

  @ApiProperty()
  mostFocusedSubject: string;
}
