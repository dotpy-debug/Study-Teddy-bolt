import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let emailService: EmailService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashedPassword',
    avatarUrl: null,
    role: 'student' as const,
    authProvider: 'local' as const,
    googleId: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    emailVerified: false,
    emailVerificationToken: null,
    lastLoginAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
            updateRefreshToken: jest.fn(),
            generateRefreshToken: jest.fn().mockReturnValue('refresh_token'),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '7d',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'createUser').mockResolvedValue(mockUser);
      jest.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue(undefined);
      jest.spyOn(jwtService, 'sign').mockReturnValue('access_token');

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(jwtService, 'sign').mockReturnValue('access_token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const forgotPasswordDto = { email: 'test@example.com' };
      const userWithResetInfo = { ...mockUser, lastPasswordResetRequest: null };

      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(userWithResetInfo);
      jest
        .spyOn(usersService, 'updateUser')
        .mockResolvedValue(userWithResetInfo);
      jest
        .spyOn(emailService, 'sendPasswordResetEmail')
        .mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        message:
          'If a user with this email exists, a password reset link has been sent.',
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success message for non-existent user', async () => {
      const forgotPasswordDto = { email: 'nonexistent@example.com' };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        message:
          'If a user with this email exists, a password reset link has been sent.',
      });
    });
  });
});
