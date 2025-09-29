import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleService } from './drizzle.service';

export const DRIZZLE_DB = 'DRIZZLE_DB';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE_DB,
      useFactory: (drizzleService: DrizzleService) => drizzleService.db,
      inject: [DrizzleService],
    },
  ],
  exports: [DrizzleService, DRIZZLE_DB],
})
export class DbModule {}
