import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { EmailModule } from '../../src/modules/email/email.module';
import { DrizzleService } from '../../src/db/drizzle.service';
import { UserFactory } from '../factories/user.factory';
import { TestModuleHelper } from '../helpers/test-module.helper';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let drizzleService: jest.Mocked<DrizzleService>;
  let configService: jest.Mocked<ConfigService>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, UsersModule, EmailModule],
      providers: [
        {
          provide: DrizzleService,
          useValue: TestModuleHelper.createMockDrizzleService(),
        },
        {
          provide: ConfigService,
          useValue: TestModuleHelper.createMockConfigService(),
        },
      ],
    })
      .overrideProvider(DrizzleService)
      .useValue(TestModuleHelper.createMockDrizzleService())
      .compile();

    app = moduleFixture.createNestApplication();
    drizzleService = moduleFixture.get(DrizzleService);
    configService = moduleFixture.get(ConfigService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const mockUser = UserFactory.create({
        email: registerDto.email,
        name: registerDto.name,
      });

      // Mock user doesn't exist
      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: null, // findByEmail returns null
      });

      // Mock user creation
      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockUser]);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });

    it('should return conflict if user already exists', async () => {
      const existingUser = UserFactory.create({ email: registerDto.email });

      // Mock user already exists
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([existingUser]);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.CONFLICT);

      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        email: 'invalid-email',
        password: '123', // too short
        // name is missing
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('validation');
    });

    it('should reject weak passwords', async () => {
      const weakPasswordDto = {
        ...registerDto,
        password: '123',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login with valid credentials', async () => {
      const mockUser = UserFactory.create({
        email: loginDto.email,
        passwordHash: 'hashed-password',
      });

      // Mock user exists and password is valid
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([mockUser]);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
      });
    });

    it('should reject invalid credentials', async () => {
      // Mock user not found
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should validate login fields', async () => {
      const invalidDto = {
        email: 'not-an-email',
        password: '', // empty password
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockUser = UserFactory.create();

      // Mock valid refresh token
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([mockUser]);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshTokenDto)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      });
    });

    it('should reject invalid refresh token', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      // Mock invalid refresh token
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshTokenDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const validToken = 'valid-jwt-token';

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const mockUser = UserFactory.create();
      const validToken = 'valid-jwt-token';

      // Mock authenticated user
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([mockUser]);

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        authProvider: mockUser.authProvider,
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      const mockUser = UserFactory.create({
        email: forgotPasswordDto.email,
      });

      // Mock user exists
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([mockUser]);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain(
        'password reset link has been sent',
      );
    });

    it('should return same message for non-existent user', async () => {
      const forgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      // Mock user doesn't exist
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain(
        'password reset link has been sent',
      );
    });

    it('should enforce rate limiting', async () => {
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      const recentResetUser = UserFactory.create({
        email: forgotPasswordDto.email,
        lastPasswordResetRequest: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      });

      // Mock user with recent reset request
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([recentResetUser]);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const resetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'newPassword123',
      };

      const mockUser = UserFactory.createWithResetToken({
        resetPasswordToken: resetPasswordDto.token,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      // Mock valid reset token
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([mockUser]);

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe(
        'Password has been successfully reset',
      );
    });

    it('should reject invalid reset token', async () => {
      const resetPasswordDto = {
        token: 'invalid-reset-token',
        newPassword: 'newPassword123',
      };

      // Mock invalid reset token
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([]);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject expired reset token', async () => {
      const resetPasswordDto = {
        token: 'expired-reset-token',
        newPassword: 'newPassword123',
      };

      const expiredTokenUser = UserFactory.createWithResetToken({
        resetPasswordToken: resetPasswordDto.token,
        resetPasswordExpires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      // Mock expired reset token
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([expiredTokenUser]);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      const userCredentials = {
        email: 'flow-test@example.com',
        password: 'password123',
        name: 'Flow Test User',
      };

      const mockUser = UserFactory.create({
        email: userCredentials.email,
        name: userCredentials.name,
      });

      // Step 1: Register
      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: null, // User doesn't exist for registration
      });
      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockUser]);

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userCredentials)
        .expect(HttpStatus.CREATED);

      expect(registerResponse.body.access_token).toBeDefined();

      // Step 2: Login with same credentials
      jest.clearAllMocks();
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([mockUser]);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(HttpStatus.OK);

      expect(loginResponse.body.access_token).toBeDefined();
      expect(loginResponse.body.user.email).toBe(userCredentials.email);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to sensitive endpoints', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Mock user not found for all attempts
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockResolvedValue([]);

      // Make multiple failed login attempts
      const attempts = Array.from({ length: 6 }, () =>
        request(app.getHttpServer()).post('/auth/login').send(loginDto),
      );

      const responses = await Promise.all(attempts);

      // Some responses should be rate limited
      const rateLimitedResponses = responses.filter(
        (response) => response.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
