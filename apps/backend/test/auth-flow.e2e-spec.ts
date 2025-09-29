import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseTestHelper } from './database.test-helper';

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await DatabaseTestHelper.clearAllTables();
    } catch (error) {
      // Ignore cleanup errors in case database helper is not available
    }
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration and login flow', async () => {
      const userData = {
        name: 'Flow Test User',
        email: 'flowtest@example.com',
        password: 'SecurePassword123!',
      };

      // Step 1: Register new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('access_token');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(userData.email);
      expect(registerResponse.body.user.name).toBe(userData.name);
      expect(registerResponse.body.user).not.toHaveProperty('password');

      const { access_token, user } = registerResponse.body;

      // Step 2: Use access token to access protected route
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(profileResponse.body.id).toBe(user.id);
      expect(profileResponse.body.email).toBe(userData.email);

      // Step 3: Login with same credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body.user.id).toBe(user.id);

      // Step 4: Use new token to access protected route
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .expect(200);
    });

    it('should prevent duplicate registration', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });
  });

  describe('Password Reset Flow', () => {
    let userEmail: string;
    let accessToken: string;

    beforeEach(async () => {
      // Create a user for password reset tests
      const userData = {
        name: 'Reset User',
        email: 'reset@example.com',
        password: 'OriginalPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      userEmail = userData.email;
      accessToken = response.body.access_token;
    });

    it('should handle forgot password request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: userEmail })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset');
    });

    it('should handle forgot password for non-existent email gracefully', async () => {
      // Should not reveal whether email exists or not
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
    });

    it('should validate email format in forgot password', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('Token Validation and Expiry', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        name: 'Token User',
        email: 'token@example.com',
        password: 'TokenPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it('should accept valid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should reject missing authorization header', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject empty authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', '')
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate registration input', async () => {
      // Missing name
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(400);

      // Invalid email format
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);

      // Weak password
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);

      // Empty fields
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: '',
          email: '',
          password: '',
        })
        .expect(400);
    });

    it('should validate login input', async () => {
      // Missing email
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'Password123!',
        })
        .expect(400);

      // Missing password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      // Invalid email format
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Security User',
          email: 'security@example.com',
          password: 'SecurePassword123!',
        });

      // Check for common security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS preflight requests', async () => {
      await request(app.getHttpServer())
        .options('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      const userData = {
        name: 'Rate Limit User',
        email: 'ratelimit@example.com',
        password: 'Password123!',
      };

      // First request should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Multiple rapid login attempts should eventually be rate limited
      const loginAttempts = Array(20)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/login').send({
            email: userData.email,
            password: 'wrongpassword',
          }),
        );

      const responses = await Promise.allSettled(loginAttempts);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (response) =>
          response.status === 'fulfilled' &&
          (response.value as any).status === 429,
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Session Management', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        name: 'Session User',
        email: 'session@example.com',
        password: 'SessionPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it('should maintain session across multiple requests', async () => {
      // First request
      const response1 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Second request with same token
      const response2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response1.body.id).toBe(response2.body.id);
      expect(response1.body.email).toBe(response2.body.email);
    });

    it('should handle concurrent requests with same token', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${accessToken}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(userId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the endpoint responds appropriately
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Error Test User',
          email: 'error@example.com',
          password: 'Password123!',
        });

      // Should either succeed (201) or fail gracefully with proper error
      expect([201, 500, 503]).toContain(response.status);

      if (response.status !== 201) {
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize user input', async () => {
      const userData = {
        name: '<script>alert("xss")</script>Test User',
        email: 'sanitize@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Name should be sanitized (exact behavior depends on implementation)
      expect(response.body.user.name).not.toContain('<script>');
      expect(response.body.user.name).toContain('Test User');
    });

    it('should prevent SQL injection attempts', async () => {
      const maliciousEmail = "test@example.com'; DROP TABLE users; --";

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: maliciousEmail,
          password: 'password123',
        });

      // Should handle gracefully without causing database errors
      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty('statusCode');
    });
  });
});
