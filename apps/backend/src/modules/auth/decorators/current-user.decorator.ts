import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BetterAuthUser } from '../better-auth.service';

/**
 * Decorator to extract the current authenticated user from the request
 * This should be used after the BetterAuthGuard has validated the session
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): BetterAuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Decorator to extract the user ID specifically
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);
