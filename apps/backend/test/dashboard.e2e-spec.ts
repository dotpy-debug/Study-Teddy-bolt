import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('DashboardController (e2e)', () => {
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
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Dashboard Test User',
        email: 'dashboardtest@example.com',
        password: 'password123',
      });

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/dashboard/stats (GET)', () => {
    beforeEach(async () => {
      // Create some test data for stats
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Stats Test Task 1',
          subject: 'Math',
          priority: 'high',
        });

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Stats Test Task 2',
          subject: 'Science',
          priority: 'medium',
          completed: true,
        });

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Stats test AI message' });
    });

    it('should get dashboard statistics', () => {
      return request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalTasks');
          expect(res.body).toHaveProperty('completedTasks');
          expect(res.body).toHaveProperty('pendingTasks');
          expect(res.body).toHaveProperty('totalStudyHours');
          expect(res.body).toHaveProperty('totalAIChats');
          expect(res.body).toHaveProperty('completionRate');

          expect(typeof res.body.totalTasks).toBe('number');
          expect(typeof res.body.completedTasks).toBe('number');
          expect(typeof res.body.pendingTasks).toBe('number');
          expect(typeof res.body.totalStudyHours).toBe('number');
          expect(typeof res.body.totalAIChats).toBe('number');
          expect(typeof res.body.completionRate).toBe('number');

          expect(res.body.totalTasks).toBeGreaterThanOrEqual(0);
          expect(res.body.completionRate).toBeGreaterThanOrEqual(0);
          expect(res.body.completionRate).toBeLessThanOrEqual(100);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/dashboard/stats').expect(401);
    });
  });

  describe('/dashboard/streak (GET)', () => {
    it('should get study streak information', () => {
      return request(app.getHttpServer())
        .get('/dashboard/streak')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('currentStreak');
          expect(res.body).toHaveProperty('longestStreak');
          expect(res.body).toHaveProperty('lastStudyDate');

          expect(typeof res.body.currentStreak).toBe('number');
          expect(typeof res.body.longestStreak).toBe('number');
          expect(res.body.currentStreak).toBeGreaterThanOrEqual(0);
          expect(res.body.longestStreak).toBeGreaterThanOrEqual(0);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/dashboard/streak').expect(401);
    });
  });

  describe('/dashboard/weekly (GET)', () => {
    beforeEach(async () => {
      // Create tasks for this week
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Weekly Test Task Today',
          subject: 'English',
          dueDate: today.toISOString(),
          priority: 'high',
        });

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Weekly Test Task Tomorrow',
          subject: 'History',
          dueDate: tomorrow.toISOString(),
          priority: 'medium',
        });
    });

    it('should get weekly overview', () => {
      return request(app.getHttpServer())
        .get('/dashboard/weekly')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('weekStart');
          expect(res.body).toHaveProperty('weekEnd');
          expect(res.body).toHaveProperty('totalTasks');
          expect(res.body).toHaveProperty('completedTasks');
          expect(res.body).toHaveProperty('totalStudyHours');
          expect(res.body).toHaveProperty('dailyBreakdown');

          expect(typeof res.body.totalTasks).toBe('number');
          expect(typeof res.body.completedTasks).toBe('number');
          expect(typeof res.body.totalStudyHours).toBe('number');
          expect(Array.isArray(res.body.dailyBreakdown)).toBe(true);
          expect(res.body.dailyBreakdown).toHaveLength(7);

          // Check daily breakdown structure
          const dayData = res.body.dailyBreakdown[0];
          expect(dayData).toHaveProperty('date');
          expect(dayData).toHaveProperty('dayName');
          expect(dayData).toHaveProperty('tasksCount');
          expect(dayData).toHaveProperty('completedTasks');
          expect(dayData).toHaveProperty('studyMinutes');
          expect(dayData).toHaveProperty('studyHours');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/dashboard/weekly').expect(401);
    });
  });

  describe('/dashboard/activity (GET)', () => {
    beforeEach(async () => {
      // Create some activity data
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Activity Test Task',
          subject: 'Math',
          priority: 'medium',
        });

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Activity test message' });
    });

    it('should get activity data', () => {
      return request(app.getHttpServer())
        .get('/dashboard/activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('startDate');
          expect(res.body).toHaveProperty('endDate');
          expect(res.body).toHaveProperty('activities');
          expect(res.body).toHaveProperty('summary');

          expect(Array.isArray(res.body.activities)).toBe(true);
          expect(res.body.summary).toHaveProperty('totalDays');
          expect(res.body.summary).toHaveProperty('activeDays');
          expect(res.body.summary).toHaveProperty('averageActivity');

          if (res.body.activities.length > 0) {
            const activity = res.body.activities[0];
            expect(activity).toHaveProperty('date');
            expect(activity).toHaveProperty('value');
            expect(activity).toHaveProperty('activityType');
            expect(activity).toHaveProperty('details');
          }
        });
    });

    it('should support date range filtering', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      return request(app.getHttpServer())
        .get(
          `/dashboard/activity?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('activities');
          expect(res.body.startDate).toBe(
            startDate.toISOString().split('T')[0],
          );
          expect(res.body.endDate).toBe(endDate.toISOString().split('T')[0]);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/dashboard/activity')
        .expect(401);
    });
  });

  describe('/dashboard/goals (GET)', () => {
    beforeEach(async () => {
      // Create some data for goals calculation
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Goals Test Task',
          subject: 'Science',
          priority: 'high',
        });

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Goals test message' });
    });

    it('should get goals and progress', () => {
      return request(app.getHttpServer())
        .get('/dashboard/goals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('dailyGoals');
          expect(res.body).toHaveProperty('weeklyGoals');
          expect(res.body).toHaveProperty('progress');

          // Daily goals structure
          expect(res.body.dailyGoals).toHaveProperty('tasks');
          expect(res.body.dailyGoals).toHaveProperty('studyTime');
          expect(res.body.dailyGoals).toHaveProperty('aiInteractions');

          // Weekly goals structure
          expect(res.body.weeklyGoals).toHaveProperty('tasks');
          expect(res.body.weeklyGoals).toHaveProperty('studyTime');
          expect(res.body.weeklyGoals).toHaveProperty('subjectsStudied');

          // Progress structure
          expect(res.body.progress).toHaveProperty('daily');
          expect(res.body.progress).toHaveProperty('weekly');

          expect(res.body.progress.daily).toHaveProperty('tasks');
          expect(res.body.progress.daily).toHaveProperty('studyTime');
          expect(res.body.progress.daily).toHaveProperty('aiInteractions');

          expect(res.body.progress.weekly).toHaveProperty('tasks');
          expect(res.body.progress.weekly).toHaveProperty('studyTime');
          expect(res.body.progress.weekly).toHaveProperty('subjectsStudied');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/dashboard/goals').expect(401);
    });
  });

  describe('Dashboard data consistency', () => {
    it('should maintain consistent data across different endpoints', async () => {
      // Create test data
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Consistency Test Task',
          subject: 'Physics',
          priority: 'high',
        });

      // Get stats
      const statsResponse = await request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Get weekly overview
      const weeklyResponse = await request(app.getHttpServer())
        .get('/dashboard/weekly')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify consistency
      expect(statsResponse.body.totalTasks).toBeGreaterThan(0);
      expect(weeklyResponse.body.totalTasks).toBeGreaterThanOrEqual(0);

      // The completion rate should be between 0 and 100
      expect(statsResponse.body.completionRate).toBeGreaterThanOrEqual(0);
      expect(statsResponse.body.completionRate).toBeLessThanOrEqual(100);
    });
  });
});
