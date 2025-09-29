import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('TasksController (e2e)', () => {
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
        name: 'Task Test User',
        email: 'tasktest@example.com',
        password: 'password123',
      });

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/tasks (POST)', () => {
    it('should create a new task', () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'This is a test task',
        subject: 'Mathematics',
        dueDate: new Date('2024-12-31').toISOString(),
        priority: 'high',
      };

      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe(createTaskDto.title);
          expect(res.body.description).toBe(createTaskDto.description);
          expect(res.body.subject).toBe(createTaskDto.subject);
          expect(res.body.priority).toBe(createTaskDto.priority);
          expect(res.body.completed).toBe(false);
          expect(res.body.userId).toBe(userId);
        });
    });

    it('should return 400 for invalid task data', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '', // Empty title should fail validation
        })
        .expect(400);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .send({
          title: 'Test Task',
          subject: 'Math',
        })
        .expect(401);
    });
  });

  describe('/tasks (GET)', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a test task
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Get Test Task',
          subject: 'Science',
          priority: 'medium',
        });
      taskId = response.body.id;
    });

    it('should get all tasks for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('title');
          expect(res.body[0]).toHaveProperty('userId', userId);
        });
    });

    it('should filter tasks by completion status', () => {
      return request(app.getHttpServer())
        .get('/tasks?completed=false')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((task: any) => {
            expect(task.completed).toBe(false);
          });
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/tasks').expect(401);
    });
  });

  describe('/tasks/:id (GET)', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Single Task Test',
          subject: 'History',
          priority: 'low',
        });
      taskId = response.body.id;
    });

    it('should get a specific task', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(taskId);
          expect(res.body.title).toBe('Single Task Test');
          expect(res.body.subject).toBe('History');
          expect(res.body.userId).toBe(userId);
        });
    });

    it('should return 404 for non-existent task', () => {
      return request(app.getHttpServer())
        .get('/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get(`/tasks/${taskId}`).expect(401);
    });
  });

  describe('/tasks/:id (PATCH)', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Update Test Task',
          subject: 'Physics',
          priority: 'medium',
        });
      taskId = response.body.id;
    });

    it('should update a task', () => {
      const updateData = {
        title: 'Updated Task Title',
        completed: true,
        priority: 'high',
      };

      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(taskId);
          expect(res.body.title).toBe(updateData.title);
          expect(res.body.completed).toBe(updateData.completed);
          expect(res.body.priority).toBe(updateData.priority);
          expect(res.body.subject).toBe('Physics'); // Should remain unchanged
        });
    });

    it('should return 404 for non-existent task', () => {
      return request(app.getHttpServer())
        .patch('/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .send({ title: 'Updated Title' })
        .expect(401);
    });
  });

  describe('/tasks/:id (DELETE)', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Delete Test Task',
          subject: 'Chemistry',
          priority: 'low',
        });
      taskId = response.body.id;
    });

    it('should delete a task', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 when trying to get deleted task', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent task', () => {
      return request(app.getHttpServer())
        .delete('/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .expect(401);
    });
  });

  describe('/tasks/today (GET)', () => {
    beforeEach(async () => {
      // Create a task due today
      const today = new Date();
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Today Task',
          subject: 'English',
          dueDate: today.toISOString(),
          priority: 'high',
        });

      // Create a task due tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Tomorrow Task',
          subject: 'Math',
          dueDate: tomorrow.toISOString(),
          priority: 'medium',
        });
    });

    it("should get only today's tasks", () => {
      return request(app.getHttpServer())
        .get('/tasks/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should contain the task due today
          const todayTask = res.body.find(
            (task: any) => task.title === 'Today Task',
          );
          expect(todayTask).toBeDefined();

          // Should not contain the task due tomorrow
          const tomorrowTask = res.body.find(
            (task: any) => task.title === 'Tomorrow Task',
          );
          expect(tomorrowTask).toBeUndefined();
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/tasks/today').expect(401);
    });
  });
});
