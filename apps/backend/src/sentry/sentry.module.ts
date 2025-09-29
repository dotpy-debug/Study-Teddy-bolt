import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryService } from './sentry.service';
import { SentryInterceptor } from '../common/interceptors/sentry.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SentryService, SentryInterceptor],
  exports: [SentryService, SentryInterceptor],
})
export class SentryModule {}
