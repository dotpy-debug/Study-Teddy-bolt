import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { UserFactory } from '../../../test/factories/user.factory';
import { TestModuleHelper } from '../../../test/helpers/test-module.helper';

describe('AuthService - Enhanced Tests', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: TestModuleHelper.createMockUsersService(),
        },
        {
          provide: JwtService,
          useValue: TestModuleHelper.createMockJwtService(),
        },
        {
          provide: ConfigService,
          useValue: TestModuleHelper.createMockConfigService(),
        },
        {
          provide: EmailService,
          useValue: TestModuleHelper.createMockEmailService(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should successfully register a new user', async () => {
      const mockUser = UserFactory.create({
        email: registerDto.email,
        name: registerDto.name,
      });

      usersService.findByEmail.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-access-token');
      usersService.generateRefreshToken.mockReturnValue('mock-refresh-token');

      const result = await service.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.createUser).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.name,
      );
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(mockUser.email, mockUser.name);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token',
      );

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = UserFactory.create({ email: registerDto.email });
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should handle email service failure gracefully', async () => {
      const mockUser = UserFactory.create({
        email: registerDto.email,
        name: registerDto.name,
      });

      usersService.findByEmail.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue(mockUser);
      emailService.sendWelcomeEmail.mockRejectedValue(new Error('Email failed'));

      // Should still complete registration even if email fails
      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      const mockUser = UserFactory.create({
        email: loginDto.email,
        passwordHash: 'hashed-password',
      });

      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-access-token');
      usersService.generateRefreshToken.mockReturnValue('mock-refresh-token');

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token',
      );

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has no password (OAuth user)', async () => {
      const mockUser = UserFactory.create({
        email: loginDto.email,
        passwordHash: null,
        authProvider: 'google',
      });

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = UserFactory.create({
        email: loginDto.email,
        passwordHash: 'hashed-password',
      });

      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('googleLogin', () => {
    it('should successfully login with Google user', async () => {
      const mockUser = UserFactory.createWithGoogleAuth();

      jwtService.sign.mockReturnValue('mock-access-token');
      usersService.generateRefreshToken.mockReturnValue('mock-refresh-token');

      const result = await service.googleLogin(mockUser);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token',
      );

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = UserFactory.create();

      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        avatarUrl: mockUser.avatarUrl,
        authProvider: mockUser.authProvider,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    const refreshTokenDto = { refreshToken: 'valid-refresh-token' };

    it('should successfully refresh tokens', async () => {
      const mockUser = UserFactory.create();

      usersService.findByRefreshToken.mockResolvedValue(mockUser);
      usersService.validateRefreshToken.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('new-access-token');
      usersService.generateRefreshToken.mockReturnValue('new-refresh-token');

      const result = await service.refreshTokens(refreshTokenDto);

      expect(usersService.findByRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(usersService.validateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        refreshTokenDto.refreshToken,
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'new-refresh-token',
      );

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      usersService.findByRefreshToken.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token validation fails', async () => {
      const mockUser = UserFactory.create();

      usersService.findByRefreshToken.mockResolvedValue(mockUser);
      usersService.validateRefreshToken.mockResolvedValue(false);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = 'user-id';

      const result = await service.logout(userId);

      expect(usersService.clearRefreshToken).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = { email: 'test@example.com' };

    it('should send password reset email for existing user', async () => {
      const mockUser = UserFactory.create({ email: forgotPasswordDto.email });

      usersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'generateResetToken').mockReturnValue('reset-token');

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(usersService.updatePasswordResetToken).toHaveBeenCalledWith(
        mockUser.id,
        'reset-token',
        expect.any(Date),
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        'reset-token',
      );

      expect(result.message).toContain('password reset link has been sent');
    });

    it('should return same message for non-existent user (security)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('password reset link has been sent');
      expect(usersService.updatePasswordResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      const mockUser = UserFactory.create({
        email: forgotPasswordDto.email,
        lastPasswordResetRequest: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      });

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should allow password reset after rate limit period', async () => {
      const mockUser = UserFactory.create({
        email: forgotPasswordDto.email,
        lastPasswordResetRequest: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
      });

      usersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'generateResetToken').mockReturnValue('reset-token');

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toContain('password reset link has been sent');
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'newPassword123',
    };

    it('should successfully reset password with valid token', async () => {
      const mockUser = UserFactory.createWithResetToken({
        resetPasswordToken: resetPasswordDto.token,
      });

      usersService.findByResetToken.mockResolvedValue(mockUser);

      const result = await service.resetPassword(resetPasswordDto);

      expect(usersService.findByResetToken).toHaveBeenCalledWith(resetPasswordDto.token);
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        resetPasswordDto.newPassword,
      );
      expect(usersService.clearPasswordResetToken).toHaveBeenCalledWith(mockUser.id);
      expect(emailService.sendPasswordResetSuccessEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
      );

      expect(result.message).toBe('Password has been successfully reset');
    });

    it('should throw BadRequestException for invalid token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const mockUser = UserFactory.createWithResetToken({
        resetPasswordToken: resetPasswordDto.token,
        resetPasswordExpires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      usersService.findByResetToken.mockResolvedValue(mockUser);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const mockUser = UserFactory.createUnverified();

      usersService.findByEmailVerificationToken.mockResolvedValue(mockUser);

      const result = await service.verifyEmail('valid-token');

      expect(usersService.findByEmailVerificationToken).toHaveBeenCalledWith('valid-token');
      expect(usersService.verifyEmail).toHaveBeenCalledWith(mockUser.id);
      expect(result.message).toBe('Email successfully verified');
    });

    it('should return message if email already verified', async () => {
      const mockUser = UserFactory.create({ emailVerified: true });

      usersService.findByEmailVerificationToken.mockResolvedValue(mockUser);

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toBe('Email already verified');
      expect(usersService.verifyEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateTokens', () => {
    it('should generate access token with correct payload', async () => {
      const userId = 'user-id';
      const email = 'test@example.com';

      jwtService.sign.mockReturnValue('generated-token');

      const result = await service.generateTokens(userId, email);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: userId,
        email: email,
        iat: expect.any(Number),
      });

      expect(result).toEqual({
        access_token: 'generated-token',
      });
    });
  });
});
