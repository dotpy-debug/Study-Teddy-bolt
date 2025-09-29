import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      let message = 'Unauthorized access';

      if (info?.name === 'TokenExpiredError') {
        message = 'Access token has expired';
      } else if (info?.name === 'JsonWebTokenError') {
        message = 'Invalid access token';
      } else if (info?.name === 'NotBeforeError') {
        message = 'Access token not active yet';
      } else if (err?.message) {
        message = err.message;
      }

      throw new UnauthorizedException(message);
    }

    return user;
  }
}
