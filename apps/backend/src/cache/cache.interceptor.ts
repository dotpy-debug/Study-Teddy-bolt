import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());

    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    if (!cacheKey) {
      return next.handle();
    }

    // Generate dynamic cache key from request context
    const request = context.switchToHttp().getRequest();
    const dynamicKey = this.generateDynamicKey(cacheKey, request);

    // Try to get from cache
    const cachedData = await this.cacheService.get(dynamicKey);
    if (cachedData) {
      return of(cachedData);
    }

    // If not in cache, execute the handler and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        if (data) {
          await this.cacheService.set(dynamicKey, data, {
            ttl: cacheTTL || 300,
          });
        }
      }),
    );
  }

  private generateDynamicKey(baseKey: string, request: any): string {
    const userId = request.user?.id || 'anonymous';
    const queryString = new URLSearchParams(request.query).toString();
    const pathParams = Object.values(request.params || {}).join(':');

    return [baseKey, userId, pathParams, queryString].filter(Boolean).join(':');
  }
}
