import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // Validate JWT_SECRET is properly configured
    if (!jwtSecret || jwtSecret.trim() === '') {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is not configured. ' +
          'Please set a strong, unique JWT_SECRET in your environment variables.',
      );
    }

    // Ensure JWT_SECRET meets minimum security requirements
    if (jwtSecret.length < 32) {
      throw new Error(
        'CRITICAL: JWT_SECRET must be at least 32 characters long for security. ' +
          'Please use a cryptographically secure random string.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      jsonWebTokenOptions: {
        ignoreExpiration: false,
      },
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Verify user still exists and is active
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider,
      },
    };
  }
}
