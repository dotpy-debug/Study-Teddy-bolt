import { PartialType } from '@nestjs/swagger';
import { ScheduleFocusSessionDto } from './schedule-focus-session.dto';

export class UpdateFocusSessionDto extends PartialType(ScheduleFocusSessionDto) {}
