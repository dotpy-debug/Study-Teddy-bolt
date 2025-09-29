import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheWarmupService } from './cache-warmup.service';

@Global()
@Module({
  providers: [CacheService, CacheWarmupService],
  exports: [CacheService, CacheWarmupService],
})
export class CacheModule {}
