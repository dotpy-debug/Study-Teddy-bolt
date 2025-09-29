import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { BetterAuthController } from './better-auth.controller';
import { AuthService } from './auth.service';
import { BetterAuthService } from './better-auth.service';
import { BetterAuthGuard } from './guards/better-auth.guard';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    forwardRef(() => NotificationsModule),
    PassportModule,
    // Keep JWT for backward compatibility during transition
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, BetterAuthController],
  providers: [
    AuthService,
    BetterAuthService,
    BetterAuthGuard,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService, BetterAuthService, BetterAuthGuard, JwtStrategy],
})
export class AuthModule {}
