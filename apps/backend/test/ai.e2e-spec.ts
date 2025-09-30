import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AIController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create a test user and get access token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'AI Test User',
      email: 'aitest@example.com',
      password: 'password123',
    });

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/ai/chat (POST)', () => {
    it('should send a message to AI and get response', () => {
      const chatDto = {
        message: 'What is photosynthesis?',
      };

      return request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('message', chatDto.message);
          expect(res.body).toHaveProperty('response');
          expect(res.body).toHaveProperty('tokensUsed');
          expect(res.body).toHaveProperty('createdAt');
          expect(typeof res.body.response).toBe('string');
          expect(res.body.response.length).toBeGreaterThan(0);
        });
    });

    it('should return 400 for empty message', () => {
      return request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: '',
        })
        .expect(400);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/ai/chat')
        .send({
          message: 'Test message',
        })
        .expect(401);
    });

    it('should handle rate limiting', async () => {
      const chatDto = {
        message: 'Rate limit test message',
      };

      // Send multiple requests quickly to trigger rate limiting
      const requests = Array(12)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/ai/chat')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(chatDto),
        );

      const responses = await Promise.allSettled(requests);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(
        (response) => response.status === 'fulfilled' && (response.value as any).status === 429,
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('/ai/history (GET)', () => {
    beforeEach(async () => {
      // Create some chat history
      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'History test message 1' });

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'History test message 2' });
    });

    it('should get chat history', () => {
      return request(app.getHttpServer())
        .get('/ai/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('hasMore');
          expect(Array.isArray(res.body.chats)).toBe(true);
          expect(res.body.chats.length).toBeGreaterThan(0);

          // Check chat structure
          const chat = res.body.chats[0];
          expect(chat).toHaveProperty('id');
          expect(chat).toHaveProperty('message');
          expect(chat).toHaveProperty('response');
          expect(chat).toHaveProperty('tokensUsed');
          expect(chat).toHaveProperty('createdAt');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/ai/history?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.chats.length).toBeLessThanOrEqual(1);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/ai/history').expect(401);
    });
  });

  describe('/ai/chat/:id (DELETE)', () => {
    let chatId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Delete test message' });

      chatId = response.body.id;
    });

    it('should delete a chat message', () => {
      return request(app.getHttpServer())
        .delete(`/ai/chat/${chatId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Chat message deleted successfully');
        });
    });

    it('should return 404 for non-existent chat', () => {
      return request(app.getHttpServer())
        .delete('/ai/chat/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).delete(`/ai/chat/${chatId}`).expect(401);
    });
  });

  describe('/ai/practice-questions (POST)', () => {
    it('should generate practice questions', () => {
      const generateDto = {
        subject: 'Mathematics',
        difficulty: 'medium',
        questionCount: 3,
      };

      return request(app.getHttpServer())
        .post('/ai/practice-questions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(generateDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('response');
          expect(res.body.message).toContain('Mathematics');
          expect(res.body.message).toContain('medium');
          expect(res.body.message).toContain('3');
        });
    });

    it('should return 400 for invalid subject', () => {
      return request(app.getHttpServer())
        .post('/ai/practice-questions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject: '',
          difficulty: 'medium',
        })
        .expect(400);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/ai/practice-questions')
        .send({
          subject: 'Math',
          difficulty: 'easy',
        })
        .expect(401);
    });
  });

  describe('/ai/study-plan (POST)', () => {
    it('should generate a study plan', () => {
      const studyPlanDto = {
        subject: 'Computer Science',
        totalWeeks: 8,
        hoursPerWeek: 10,
        skillLevel: 'beginner',
        goals: 'Learn programming fundamentals',
      };

      return request(app.getHttpServer())
        .post('/ai/study-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(studyPlanDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('studyPlan');
          expect(res.body).toHaveProperty('generatedAt');
          expect(res.body).toHaveProperty('aiResponse');

          expect(res.body.studyPlan.subject).toBe(studyPlanDto.subject);
          expect(res.body.studyPlan.totalWeeks).toBe(studyPlanDto.totalWeeks);
          expect(res.body.studyPlan.hoursPerWeek).toBe(studyPlanDto.hoursPerWeek);
          expect(res.body.studyPlan.skillLevel).toBe(studyPlanDto.skillLevel);
        });
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/ai/study-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject: 'Math',
          // Missing other required fields
        })
        .expect(400);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/ai/study-plan')
        .send({
          subject: 'Math',
          totalWeeks: 4,
          hoursPerWeek: 5,
          skillLevel: 'intermediate',
          goals: 'Test goals',
        })
        .expect(401);
    });
  });

  describe('/ai/stats (GET)', () => {
    beforeEach(async () => {
      // Create some AI interactions for stats
      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Stats test message 1' });

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Stats test message 2' });
    });

    it('should get AI usage statistics', () => {
      return request(app.getHttpServer())
        .get('/ai/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalMessages');
          expect(res.body).toHaveProperty('totalTokensUsed');
          expect(res.body).toHaveProperty('messagesThisMonth');
          expect(res.body).toHaveProperty('tokensThisMonth');
          expect(res.body).toHaveProperty('averageTokensPerMessage');
          expect(res.body).toHaveProperty('mostUsedContext');
          expect(res.body).toHaveProperty('lastMessageAt');

          expect(typeof res.body.totalMessages).toBe('number');
          expect(typeof res.body.totalTokensUsed).toBe('number');
          expect(res.body.totalMessages).toBeGreaterThan(0);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/ai/stats').expect(401);
    });
  });
});
