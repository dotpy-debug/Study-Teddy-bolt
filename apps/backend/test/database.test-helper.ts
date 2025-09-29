import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../src/db/db.module';
import { DrizzleService } from '../src/db/drizzle.service';
import { users, studyTasks, aiChats, studySessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

export class DatabaseTestHelper {
  private static app: INestApplication;
  private static drizzleService: DrizzleService;

  static async setupTestDatabase(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DbModule,
      ],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();

    this.drizzleService = this.app.get<DrizzleService>(DrizzleService);
  }

  static async cleanupTestDatabase(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  static async clearAllTables(): Promise<void> {
    const db = this.drizzleService.db;

    // Delete in order to respect foreign key constraints
    await db.delete(studySessions);
    await db.delete(aiChats);
    await db.delete(studyTasks);
    await db.delete(users);
  }

  static async createTestUser(
    overrides: Partial<typeof users.$inferInsert> = {},
  ) {
    const db = this.drizzleService.db;

    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      passwordHash: '$2b$10$hashedpassword',
      authProvider: 'local' as const,
      emailVerified: true,
      ...overrides,
    };

    const [user] = await db.insert(users).values(defaultUser).returning();
    return user;
  }

  static async createTestTask(
    userId: string,
    overrides: Partial<typeof studyTasks.$inferInsert> = {},
  ) {
    const db = this.drizzleService.db;

    const defaultTask = {
      userId,
      title: 'Test Task',
      subject: 'Test Subject',
      description: 'Test Description',
      priority: 'medium' as const,
      completed: false,
      dueDate: new Date(),
      ...overrides,
    };

    const [task] = await db.insert(studyTasks).values(defaultTask).returning();
    return task;
  }

  static async createTestAIChat(
    userId: string,
    overrides: Partial<typeof aiChats.$inferInsert> = {},
  ) {
    const db = this.drizzleService.db;

    const defaultChat = {
      userId,
      actionType: 'chat' as const,
      prompt: 'Test message',
      response: 'Test AI response',
      model: 'gpt-4o-mini',
      promptTokens: 25,
      completionTokens: 25,
      totalTokens: 50,
      ...overrides,
    };

    const [chat] = await db.insert(aiChats).values(defaultChat).returning();
    return chat;
  }

  static async createTestStudySession(
    userId: string,
    taskId?: string,
    overrides: Partial<typeof studySessions.$inferInsert> = {},
  ) {
    const db = this.drizzleService.db;

    const defaultSession = {
      userId,
      taskId: taskId || null,
      durationMinutes: 30,
      startTime: new Date(),
      ...overrides,
    };

    const [session] = await db
      .insert(studySessions)
      .values(defaultSession)
      .returning();
    return session;
  }

  static async findUserByEmail(email: string) {
    const db = this.drizzleService.db;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  static async findTasksByUserId(userId: string) {
    const db = this.drizzleService.db;
    return await db
      .select()
      .from(studyTasks)
      .where(eq(studyTasks.userId, userId));
  }

  static async findChatsByUserId(userId: string) {
    const db = this.drizzleService.db;
    return await db.select().from(aiChats).where(eq(aiChats.userId, userId));
  }

  static async findSessionsByUserId(userId: string) {
    const db = this.drizzleService.db;
    return await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, userId));
  }

  static async seedTestData() {
    // Create a test user
    const user = await this.createTestUser({
      email: 'seed@example.com',
      name: 'Seed User',
    });

    // Create test tasks
    const task1 = await this.createTestTask(user.id, {
      title: 'Math Homework',
      subjectId: null, // Use subjectId instead of subject
      priority: 'high',
      status: 'pending', // Use status instead of completed
    });

    const task2 = await this.createTestTask(user.id, {
      title: 'Science Project',
      subjectId: null, // Use subjectId instead of subject
      priority: 'medium',
      status: 'completed', // Use status instead of completed
    });

    // Create test AI chats
    await this.createTestAIChat(user.id, {
      prompt: 'What is photosynthesis?',
      response: 'Photosynthesis is the process by which plants make food...',
      totalTokens: 75,
    });

    // Create test study sessions
    await this.createTestStudySession(user.id, task1.id, {
      durationMinutes: 45,
      startTime: new Date(),
    });

    return { user, tasks: [task1, task2] };
  }

  static get db() {
    return this.drizzleService.db;
  }
}

// Test data factories
export const TestDataFactory = {
  user: (overrides = {}) => ({
    email: `user-${Date.now()}@example.com`,
    name: 'Test User',
    passwordHash: '$2b$10$hashedpassword',
    authProvider: 'local' as const,
    emailVerified: true,
    ...overrides,
  }),

  task: (userId: string, overrides = {}) => ({
    userId,
    title: 'Test Task',
    subject: 'Test Subject',
    description: 'Test Description',
    priority: 'medium' as const,
    completed: false,
    dueDate: new Date(),
    ...overrides,
  }),

  aiChat: (userId: string, overrides = {}) => ({
    userId,
    message: 'Test message',
    aiResponse: 'Test AI response',
    tokensUsed: 50,
    ...overrides,
  }),

  studySession: (userId: string, taskId?: string, overrides = {}) => ({
    userId,
    taskId: taskId || null,
    durationMinutes: 30,
    date: new Date(),
    ...overrides,
  }),
};

// Database test utilities
export const DatabaseTestUtils = {
  async waitForDatabase(maxAttempts = 10, delay = 1000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await DatabaseTestHelper.db.select().from(users).limit(1);
        return;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Database not ready after ${maxAttempts} attempts`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  },

  async verifyTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await DatabaseTestHelper.db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      return result.rows[0]?.exists === true;
    } catch (error) {
      return false;
    }
  },

  async getTableRowCount(tableName: string): Promise<number> {
    try {
      const result = await DatabaseTestHelper.db.execute(
        `SELECT COUNT(*) FROM ${tableName}`,
      );
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      return 0;
    }
  },
};
