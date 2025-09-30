import { SetMetadata } from '@nestjs/common';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from './cache.interceptor';

/**
 * Decorator to enable caching for a controller method
 * @param key Cache key prefix
 * @param ttl Time to live in seconds (default: 300)
 */
export const Cache = (key: string, ttl: number = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
  };
};

/**
 * Cache invalidation decorator
 * Invalidates cache when method is called
 */
export const InvalidateCache = (tags: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache tags after successful execution
      const cacheService = this.cacheService;
      if (cacheService && tags.length > 0) {
        await Promise.all(tags.map((tag) => cacheService.invalidateByTag(tag)));
      }

      return result;
    };

    return descriptor;
  };
};

/**
 * Method-level cache decorator
 */
export const CacheMethod = (keyPrefix: string, ttl: number = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService;

      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key from method arguments
      const argsKey = JSON.stringify(args);
      const cacheKey = `${keyPrefix}:${target.constructor.name}:${propertyKey}:${argsKey}`;

      return cacheService.getOrSet(cacheKey, () => originalMethod.apply(this, args), { ttl });
    };

    return descriptor;
  };
};
