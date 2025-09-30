import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.createUser(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    const tokens = await this.generateTokens(user.id, user.email);
    const refreshToken = await this.usersService.generateRefreshToken();
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    const refreshToken = await this.usersService.generateRefreshToken();
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async googleLogin(user: any) {
    const tokens = await this.generateTokens(user.id, user.email);
    const refreshToken = await this.usersService.generateRefreshToken();
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const user = await this.usersService.findByRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValidRefreshToken = await this.usersService.validateRefreshToken(user.id, refreshToken);

    if (!isValidRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    const newRefreshToken = await this.usersService.generateRefreshToken();
    await this.usersService.updateRefreshToken(user.id, newRefreshToken);

    return {
      access_token: tokens.access_token,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.usersService.clearRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If a user with this email exists, a password reset link has been sent.',
      };
    }

    // Check for rate limiting - prevent multiple requests within 5 minutes
    if (user.lastPasswordResetRequest) {
      const timeSinceLastRequest = Date.now() - new Date(user.lastPasswordResetRequest).getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeSinceLastRequest < fiveMinutes) {
        throw new BadRequestException(
          'Please wait 5 minutes before requesting another password reset',
        );
      }
    }

    // Generate secure reset token
    const resetToken = this.generateResetToken();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Save reset token to database
    await this.usersService.updatePasswordResetToken(user.id, resetToken, resetTokenExpiry);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    return {
      message: 'If a user with this email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Find user by reset token
    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (user.resetPasswordExpires && new Date() > new Date(user.resetPasswordExpires)) {
      throw new BadRequestException('Reset token has expired');
    }

    // Update user's password
    await this.usersService.updatePassword(user.id, newPassword);

    // Clear reset token
    await this.usersService.clearPasswordResetToken(user.id);

    // Send success email
    await this.emailService.sendPasswordResetSuccessEmail(user.email, user.name);

    return { message: 'Password has been successfully reset' };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    await this.usersService.verifyEmail(user.id);

    return { message: 'Email successfully verified' };
  }

  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email: email,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }
}
