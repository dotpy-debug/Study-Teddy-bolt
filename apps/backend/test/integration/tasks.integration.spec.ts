import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { TasksModule } from '../../src/modules/tasks/tasks.module';
import { DrizzleService } from '../../src/db/drizzle.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { TaskFactory, SubjectFactory } from '../factories/task.factory';
import { UserFactory } from '../factories/user.factory';
import { TestModuleHelper } from '../helpers/test-module.helper';

describe('Tasks Integration Tests', () => {
  let app: INestApplication;
  let drizzleService: jest.Mocked<DrizzleService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser = UserFactory.create();
  const validToken = 'valid-jwt-token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TasksModule],
      providers: [
        {
          provide: DrizzleService,
          useValue: TestModuleHelper.createMockDrizzleService(),
        },
        {
          provide: CacheService,
          useValue: TestModuleHelper.createMockCacheService(),
        },
        {
          provide: ConfigService,
          useValue: TestModuleHelper.createMockConfigService(),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    drizzleService = moduleFixture.get(DrizzleService);
    cacheService = moduleFixture.get(CacheService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /tasks', () => {
    it('should return user tasks', async () => {
      const mockTasks = TaskFactory.createMany(3, { userId: mockUser.id });
      const mockSubject = SubjectFactory.create({ userId: mockUser.id });

      const tasksWithSubjects = mockTasks.map((task) => ({
        ...task,
        subject: mockSubject,
      }));

      // Mock database query
      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockResolvedValue(tasksWithSubjects);

      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        status: expect.any(String),
        priority: expect.any(String),
        subject: {
          id: expect.any(String),
          name: expect.any(String),
        },
      });
    });

    it('should filter tasks by status', async () => {
      const pendingTasks = TaskFactory.createMany(2, {
        userId: mockUser.id,
        status: 'pending',
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockResolvedValue(pendingTasks);

      const response = await request(app.getHttpServer())
        .get('/tasks?status=pending')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      response.body.forEach((task) => {
        expect(task.status).toBe('pending');
      });
    });

    it('should filter tasks by priority', async () => {
      const highPriorityTasks = TaskFactory.createMany(1, {
        userId: mockUser.id,
        priority: 'high',
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockResolvedValue(highPriorityTasks);

      const response = await request(app.getHttpServer())
        .get('/tasks?priority=high')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].priority).toBe('high');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/tasks')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /tasks/today', () => {
    it('should return tasks due today', async () => {
      const todayTasks = TaskFactory.createMany(2, {
        userId: mockUser.id,
        dueDate: new Date(),
        status: 'pending',
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockResolvedValue(todayTasks);

      const response = await request(app.getHttpServer())
        .get('/tasks/today')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      response.body.forEach((task) => {
        expect(['pending', 'in_progress']).toContain(task.status);
      });
    });

    it('should handle timezone parameter', async () => {
      const todayTasks = TaskFactory.createMany(1, { userId: mockUser.id });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockResolvedValue(todayTasks);

      await request(app.getHttpServer())
        .get('/tasks/today?timezone=America/New_York')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('POST /tasks', () => {
    const createTaskDto = {
      title: 'New Task',
      description: 'Task description',
      subjectId: 'subject-123',
      dueDate: new Date().toISOString(),
      priority: 'medium',
      estimatedMinutes: 60,
    };

    it('should create a new task', async () => {
      const mockTask = TaskFactory.create({
        userId: mockUser.id,
        ...createTaskDto,
      });

      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockTask]);

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send(createTaskDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        id: mockTask.id,
        title: createTaskDto.title,
        description: createTaskDto.description,
        priority: createTaskDto.priority,
        status: 'pending',
      });

      expect(drizzleService.db.insert).toHaveBeenCalled();
      expect(cacheService.delPattern).toHaveBeenCalledWith(
        `dashboard_stats:${mockUser.id}`,
      );
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        // title is missing
        description: 'Task without title',
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle AI-generated tasks', async () => {
      const aiTaskDto = {
        ...createTaskDto,
        aiGenerated: true,
        aiMetadata: {
          confidence: 0.95,
          originalPrompt: 'Create a math task',
        },
      };

      const mockAITask = TaskFactory.createAIGenerated({
        userId: mockUser.id,
        ...aiTaskDto,
      });

      TestModuleHelper.chainDatabaseMethods(drizzleService, [mockAITask]);

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send(aiTaskDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.aiGenerated).toBe(true);
      expect(response.body.aiMetadata).toEqual(aiTaskDto.aiMetadata);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return task by ID', async () => {
      const taskId = 'task-123';
      const mockTask = TaskFactory.create({ id: taskId, userId: mockUser.id });
      const mockSubject = SubjectFactory.create({ userId: mockUser.id });

      const taskWithSubject = {
        ...mockTask,
        subject: mockSubject,
      };

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockResolvedValue([taskWithSubject]);

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: taskId,
        title: mockTask.title,
        subject: {
          id: mockSubject.id,
          name: mockSubject.name,
        },
      });
    });

    it('should return 404 for non-existent task', async () => {
      const taskId = 'non-existent-task';

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT /tasks/:id', () => {
    const taskId = 'task-123';
    const updateDto = {
      title: 'Updated Task',
      status: 'completed',
      progressPercentage: 100,
    };

    it('should update task successfully', async () => {
      const updatedTask = TaskFactory.create({
        id: taskId,
        userId: mockUser.id,
        ...updateDto,
        completedAt: new Date(),
      });

      TestModuleHelper.chainDatabaseMethods(drizzleService, [updatedTask]);

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: taskId,
        title: updateDto.title,
        status: updateDto.status,
        progressPercentage: updateDto.progressPercentage,
      });

      expect(drizzleService.db.update).toHaveBeenCalled();
      expect(cacheService.delPattern).toHaveBeenCalled();
    });

    it('should return 404 for non-existent task', async () => {
      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: [],
      });

      await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should validate update data', async () => {
      const invalidDto = {
        status: 'invalid-status',
        priority: 'invalid-priority',
      };

      await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /tasks/:id', () => {
    const taskId = 'task-123';

    it('should delete task successfully', async () => {
      const mockTask = TaskFactory.create({ id: taskId, userId: mockUser.id });

      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: [mockTask],
      });

      const response = await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Task deleted successfully');
      expect(drizzleService.db.delete).toHaveBeenCalled();
      expect(cacheService.delPattern).toHaveBeenCalled();
    });

    it('should return 404 for non-existent task', async () => {
      TestModuleHelper.setupDatabaseMocks(drizzleService, {
        returning: [],
      });

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /tasks/:id/toggle', () => {
    const taskId = 'task-123';

    it('should toggle task from pending to completed', async () => {
      const pendingTask = TaskFactory.createPending({
        id: taskId,
        userId: mockUser.id,
      });
      const completedTask = TaskFactory.createCompleted({
        id: taskId,
        userId: mockUser.id,
      });

      // Mock finding current task
      drizzleService.db.select.mockReturnValueOnce(drizzleService.db);
      drizzleService.db.from.mockReturnValueOnce(drizzleService.db);
      drizzleService.db.where.mockReturnValueOnce(drizzleService.db);
      drizzleService.db.limit.mockResolvedValueOnce([pendingTask]);

      // Mock updating task
      TestModuleHelper.chainDatabaseMethods(drizzleService, [completedTask]);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/toggle`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('completed');
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.progressPercentage).toBe(100);
    });

    it('should toggle task from completed to pending', async () => {
      const completedTask = TaskFactory.createCompleted({
        id: taskId,
        userId: mockUser.id,
      });
      const pendingTask = TaskFactory.createPending({
        id: taskId,
        userId: mockUser.id,
      });

      // Mock finding current task
      drizzleService.db.select.mockReturnValueOnce(drizzleService.db);
      drizzleService.db.from.mockReturnValueOnce(drizzleService.db);
      drizzleService.db.where.mockReturnValueOnce(drizzleService.db);
      drizzleService.db.limit.mockResolvedValueOnce([completedTask]);

      // Mock updating task
      TestModuleHelper.chainDatabaseMethods(drizzleService, [pendingTask]);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/toggle`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('pending');
      expect(response.body.completedAt).toBeNull();
    });
  });

  describe('PATCH /tasks/:id/progress', () => {
    const taskId = 'task-123';

    it('should update task progress', async () => {
      const progressDto = { progressPercentage: 75 };
      const updatedTask = TaskFactory.create({
        id: taskId,
        userId: mockUser.id,
        progressPercentage: 75,
      });

      TestModuleHelper.chainDatabaseMethods(drizzleService, [updatedTask]);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/progress`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(progressDto)
        .expect(HttpStatus.OK);

      expect(response.body.progressPercentage).toBe(75);
    });

    it('should mark task as completed when progress reaches 100%', async () => {
      const progressDto = { progressPercentage: 100 };
      const completedTask = TaskFactory.createCompleted({
        id: taskId,
        userId: mockUser.id,
        progressPercentage: 100,
      });

      TestModuleHelper.chainDatabaseMethods(drizzleService, [completedTask]);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/progress`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(progressDto)
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('completed');
      expect(response.body.progressPercentage).toBe(100);
    });

    it('should validate progress percentage', async () => {
      const invalidDto = { progressPercentage: 150 }; // > 100

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/progress`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Batch Operations', () => {
    describe('POST /tasks/batch/update', () => {
      it('should update multiple tasks', async () => {
        const batchUpdateDto = {
          taskIds: ['task-1', 'task-2', 'task-3'],
          updateData: { status: 'completed' },
        };

        const updatedTasks = batchUpdateDto.taskIds.map((id) =>
          TaskFactory.createCompleted({ id, userId: mockUser.id }),
        );

        // Mock successful updates
        jest
          .spyOn(app.get('TasksService'), 'batchUpdateTasks')
          .mockResolvedValue({
            updated: 3,
            tasks: updatedTasks,
          });

        const response = await request(app.getHttpServer())
          .post('/tasks/batch/update')
          .set('Authorization', `Bearer ${validToken}`)
          .send(batchUpdateDto)
          .expect(HttpStatus.OK);

        expect(response.body.updated).toBe(3);
        expect(response.body.tasks).toHaveLength(3);
      });
    });

    describe('POST /tasks/batch/delete', () => {
      it('should delete multiple tasks', async () => {
        const batchDeleteDto = {
          taskIds: ['task-1', 'task-2'],
        };

        // Mock successful deletions
        jest
          .spyOn(app.get('TasksService'), 'batchDeleteTasks')
          .mockResolvedValue({
            deleted: 2,
            taskIds: batchDeleteDto.taskIds,
          });

        const response = await request(app.getHttpServer())
          .post('/tasks/batch/delete')
          .set('Authorization', `Bearer ${validToken}`)
          .send(batchDeleteDto)
          .expect(HttpStatus.OK);

        expect(response.body.deleted).toBe(2);
        expect(response.body.taskIds).toEqual(batchDeleteDto.taskIds);
      });
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter tasks with multiple criteria', async () => {
      const filteredTasks = TaskFactory.createMany(2, {
        userId: mockUser.id,
        status: 'pending',
        priority: 'high',
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockReturnValue(drizzleService.db);
      drizzleService.db.offset.mockResolvedValue(filteredTasks);

      const response = await request(app.getHttpServer())
        .get('/tasks/filter')
        .query({
          status: ['pending'],
          priority: ['high'],
          limit: 10,
          offset: 0,
        })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should search tasks by text', async () => {
      const searchTerm = 'mathematics';
      const searchResults = TaskFactory.createMany(1, {
        userId: mockUser.id,
        title: 'Mathematics homework',
      });

      drizzleService.db.select.mockReturnValue(drizzleService.db);
      drizzleService.db.from.mockReturnValue(drizzleService.db);
      drizzleService.db.leftJoin.mockReturnValue(drizzleService.db);
      drizzleService.db.where.mockReturnValue(drizzleService.db);
      drizzleService.db.orderBy.mockReturnValue(drizzleService.db);
      drizzleService.db.limit.mockReturnValue(drizzleService.db);
      drizzleService.db.offset.mockResolvedValue(searchResults);

      const response = await request(app.getHttpServer())
        .get('/tasks/filter')
        .query({ searchTerm })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].title).toContain('Mathematics');
    });
  });
});
