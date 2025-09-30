import { DatabaseTestHelper, TestDataFactory, DatabaseTestUtils } from './database.test-helper';
import { users, studyTasks, aiChats, studySessions } from '../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await DatabaseTestHelper.setupTestDatabase();
    await DatabaseTestUtils.waitForDatabase();
  });

  afterAll(async () => {
    await DatabaseTestHelper.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await DatabaseTestHelper.clearAllTables();
  });

  describe('Database Connection', () => {
    it('should connect to the test database', async () => {
      const db = DatabaseTestHelper.db;
      expect(db).toBeDefined();

      // Test basic query
      const result = await db.select().from(users).limit(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should verify all required tables exist', async () => {
      const tables = ['users', 'study_tasks', 'ai_chats', 'study_sessions'];

      for (const table of tables) {
        const exists = await DatabaseTestUtils.verifyTableExists(table);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Users Table Operations', () => {
    it('should create a user', async () => {
      const userData = TestDataFactory.user({
        email: 'create@example.com',
        name: 'Create User',
      });

      const user = await DatabaseTestHelper.createTestUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should find user by email', async () => {
      const userData = TestDataFactory.user({
        email: 'find@example.com',
        name: 'Find User',
      });

      await DatabaseTestHelper.createTestUser(userData);
      const foundUser = await DatabaseTestHelper.findUserByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.name).toBe(userData.name);
    });

    it('should enforce unique email constraint', async () => {
      const email = 'unique@example.com';

      await DatabaseTestHelper.createTestUser({ email });

      // Attempting to create another user with the same email should fail
      await expect(DatabaseTestHelper.createTestUser({ email })).rejects.toThrow();
    });

    it('should handle Google OAuth users', async () => {
      const googleUser = await DatabaseTestHelper.createTestUser({
        email: 'google@example.com',
        name: 'Google User',
        authProvider: 'google',
        googleId: 'google-123',
        passwordHash: null,
      });

      expect(googleUser.authProvider).toBe('google');
      expect(googleUser.googleId).toBe('google-123');
      expect(googleUser.passwordHash).toBeNull();
    });
  });

  describe('Study Tasks Table Operations', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await DatabaseTestHelper.createTestUser({
        email: 'tasks@example.com',
        name: 'Tasks User',
      });
    });

    it('should create a task', async () => {
      const taskData = TestDataFactory.task(testUser.id, {
        title: 'Test Task',
        subject: 'Mathematics',
        priority: 'high',
      });

      const task = await DatabaseTestHelper.createTestTask(testUser.id, taskData);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.userId).toBe(testUser.id);
      expect(task.title).toBe(taskData.title);
      expect(task.subject).toBe(taskData.subject);
      expect(task.priority).toBe(taskData.priority);
      expect(task.completed).toBe(false);
    });

    it('should find tasks by user ID', async () => {
      await DatabaseTestHelper.createTestTask(testUser.id, {
        title: 'Task 1',
        subject: 'Math',
      });

      await DatabaseTestHelper.createTestTask(testUser.id, {
        title: 'Task 2',
        subject: 'Science',
      });

      const tasks = await DatabaseTestHelper.findTasksByUserId(testUser.id);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].userId).toBe(testUser.id);
      expect(tasks[1].userId).toBe(testUser.id);
    });

    it('should update task completion status', async () => {
      const task = await DatabaseTestHelper.createTestTask(testUser.id, {
        title: 'Update Task',
        completed: false,
      });

      const db = DatabaseTestHelper.db;
      const [updatedTask] = await db
        .update(studyTasks)
        .set({ completed: true, updatedAt: new Date() })
        .where(eq(studyTasks.id, task.id))
        .returning();

      expect(updatedTask.completed).toBe(true);
      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
    });

    it('should delete task and cascade to study sessions', async () => {
      const task = await DatabaseTestHelper.createTestTask(testUser.id, {
        title: 'Delete Task',
      });

      const session = await DatabaseTestHelper.createTestStudySession(testUser.id, task.id, {
        durationMinutes: 60,
      });

      const db = DatabaseTestHelper.db;

      // Delete the task
      await db.delete(studyTasks).where(eq(studyTasks.id, task.id));

      // Check that the study session's taskId is set to null (due to ON DELETE SET NULL)
      const [updatedSession] = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, session.id));

      expect(updatedSession.taskId).toBeNull();
    });
  });

  describe('AI Chats Table Operations', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await DatabaseTestHelper.createTestUser({
        email: 'aichats@example.com',
        name: 'AI Chats User',
      });
    });

    it('should create an AI chat', async () => {
      const chatData = TestDataFactory.aiChat(testUser.id, {
        message: 'What is machine learning?',
        aiResponse: 'Machine learning is a subset of AI...',
        tokensUsed: 100,
      });

      const chat = await DatabaseTestHelper.createTestAIChat(testUser.id, chatData);

      expect(chat).toBeDefined();
      expect(chat.id).toBeDefined();
      expect(chat.userId).toBe(testUser.id);
      expect(chat.message).toBe(chatData.message);
      expect(chat.aiResponse).toBe(chatData.aiResponse);
      expect(chat.tokensUsed).toBe(chatData.tokensUsed);
      expect(chat.createdAt).toBeDefined();
    });

    it('should find chats by user ID ordered by creation date', async () => {
      await DatabaseTestHelper.createTestAIChat(testUser.id, {
        message: 'First message',
        createdAt: new Date('2024-01-01'),
      });

      await DatabaseTestHelper.createTestAIChat(testUser.id, {
        message: 'Second message',
        createdAt: new Date('2024-01-02'),
      });

      const db = DatabaseTestHelper.db;
      const chats = await db
        .select()
        .from(aiChats)
        .where(eq(aiChats.userId, testUser.id))
        .orderBy(desc(aiChats.createdAt));

      expect(chats).toHaveLength(2);
      expect(chats[0].message).toBe('Second message');
      expect(chats[1].message).toBe('First message');
    });

    it('should calculate total tokens used by user', async () => {
      await DatabaseTestHelper.createTestAIChat(testUser.id, {
        message: 'Chat 1',
        tokensUsed: 50,
      });

      await DatabaseTestHelper.createTestAIChat(testUser.id, {
        message: 'Chat 2',
        tokensUsed: 75,
      });

      const db = DatabaseTestHelper.db;
      const result = await db
        .select({
          totalTokens: db.sql`sum(${aiChats.tokensUsed})`,
        })
        .from(aiChats)
        .where(eq(aiChats.userId, testUser.id));

      expect(parseInt(result[0].totalTokens)).toBe(125);
    });
  });

  describe('Study Sessions Table Operations', () => {
    let testUser: any;
    let testTask: any;

    beforeEach(async () => {
      testUser = await DatabaseTestHelper.createTestUser({
        email: 'sessions@example.com',
        name: 'Sessions User',
      });

      testTask = await DatabaseTestHelper.createTestTask(testUser.id, {
        title: 'Session Task',
        subject: 'Physics',
      });
    });

    it('should create a study session', async () => {
      const sessionData = TestDataFactory.studySession(testUser.id, testTask.id, {
        durationMinutes: 45,
        date: new Date('2024-01-15'),
      });

      const session = await DatabaseTestHelper.createTestStudySession(
        testUser.id,
        testTask.id,
        sessionData,
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.taskId).toBe(testTask.id);
      expect(session.durationMinutes).toBe(sessionData.durationMinutes);
      expect(session.date).toEqual(sessionData.date);
    });

    it('should create session without associated task', async () => {
      const session = await DatabaseTestHelper.createTestStudySession(testUser.id, null, {
        durationMinutes: 30,
      });

      expect(session.taskId).toBeNull();
      expect(session.userId).toBe(testUser.id);
      expect(session.durationMinutes).toBe(30);
    });

    it('should calculate total study time for user', async () => {
      await DatabaseTestHelper.createTestStudySession(testUser.id, testTask.id, {
        durationMinutes: 30,
      });

      await DatabaseTestHelper.createTestStudySession(testUser.id, testTask.id, {
        durationMinutes: 45,
      });

      const db = DatabaseTestHelper.db;
      const result = await db
        .select({
          totalMinutes: db.sql`sum(${studySessions.durationMinutes})`,
        })
        .from(studySessions)
        .where(eq(studySessions.userId, testUser.id));

      expect(parseInt(result[0].totalMinutes)).toBe(75);
    });

    it('should find sessions by date range', async () => {
      const today = new Date('2024-01-15');
      const yesterday = new Date('2024-01-14');
      const tomorrow = new Date('2024-01-16');

      await DatabaseTestHelper.createTestStudySession(testUser.id, testTask.id, {
        date: yesterday,
        durationMinutes: 30,
      });

      await DatabaseTestHelper.createTestStudySession(testUser.id, testTask.id, {
        date: today,
        durationMinutes: 45,
      });

      await DatabaseTestHelper.createTestStudySession(testUser.id, testTask.id, {
        date: tomorrow,
        durationMinutes: 60,
      });

      const db = DatabaseTestHelper.db;
      const sessions = await db
        .select()
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, testUser.id),
            db.sql`${studySessions.date} >= ${yesterday}`,
            db.sql`${studySessions.date} <= ${today}`,
          ),
        );

      expect(sessions).toHaveLength(2);
      expect(sessions.some((s) => s.durationMinutes === 30)).toBe(true);
      expect(sessions.some((s) => s.durationMinutes === 45)).toBe(true);
    });
  });

  describe('Foreign Key Relationships', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await DatabaseTestHelper.createTestUser({
        email: 'relationships@example.com',
        name: 'Relationships User',
      });
    });

    it('should cascade delete user data when user is deleted', async () => {
      const task = await DatabaseTestHelper.createTestTask(testUser.id, {
        title: 'Cascade Task',
      });

      const chat = await DatabaseTestHelper.createTestAIChat(testUser.id, {
        message: 'Cascade Chat',
      });

      const session = await DatabaseTestHelper.createTestStudySession(testUser.id, task.id, {
        durationMinutes: 30,
      });

      const db = DatabaseTestHelper.db;

      // Delete the user
      await db.delete(users).where(eq(users.id, testUser.id));

      // Verify all related data is deleted
      const remainingTasks = await db
        .select()
        .from(studyTasks)
        .where(eq(studyTasks.userId, testUser.id));

      const remainingChats = await db.select().from(aiChats).where(eq(aiChats.userId, testUser.id));

      const remainingSessions = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.userId, testUser.id));

      expect(remainingTasks).toHaveLength(0);
      expect(remainingChats).toHaveLength(0);
      expect(remainingSessions).toHaveLength(0);
    });

    it('should prevent creating task with non-existent user', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      await expect(
        DatabaseTestHelper.createTestTask(nonExistentUserId, {
          title: 'Invalid Task',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce NOT NULL constraints', async () => {
      const db = DatabaseTestHelper.db;

      // Try to create user without required fields
      await expect(
        db.insert(users).values({
          email: null as any,
          name: 'Test User',
        }),
      ).rejects.toThrow();
    });

    it('should handle default values correctly', async () => {
      const user = await DatabaseTestHelper.createTestUser({
        email: 'defaults@example.com',
        name: 'Defaults User',
        // Don't specify authProvider, should default to 'local'
      });

      expect(user.authProvider).toBe('local');
      expect(user.emailVerified).toBe(false); // Default should be false
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should handle enum constraints', async () => {
      const user = await DatabaseTestHelper.createTestUser();

      // Valid priority
      const validTask = await DatabaseTestHelper.createTestTask(user.id, {
        priority: 'high',
      });
      expect(validTask.priority).toBe('high');

      // Invalid priority should fail
      await expect(
        DatabaseTestHelper.createTestTask(user.id, {
          priority: 'invalid' as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Performance and Indexing', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await DatabaseTestHelper.createTestUser({
        email: 'performance@example.com',
        name: 'Performance User',
      });
    });

    it('should efficiently query tasks by user ID', async () => {
      // Create multiple tasks
      for (let i = 0; i < 10; i++) {
        await DatabaseTestHelper.createTestTask(testUser.id, {
          title: `Task ${i}`,
          subject: `Subject ${i % 3}`,
        });
      }

      const startTime = Date.now();
      const tasks = await DatabaseTestHelper.findTasksByUserId(testUser.id);
      const queryTime = Date.now() - startTime;

      expect(tasks).toHaveLength(10);
      expect(queryTime).toBeLessThan(100); // Should be fast due to index
    });

    it('should efficiently query chats by creation date', async () => {
      // Create multiple chats
      for (let i = 0; i < 10; i++) {
        await DatabaseTestHelper.createTestAIChat(testUser.id, {
          message: `Message ${i}`,
          createdAt: new Date(Date.now() + i * 1000),
        });
      }

      const db = DatabaseTestHelper.db;
      const startTime = Date.now();

      const recentChats = await db
        .select()
        .from(aiChats)
        .where(eq(aiChats.userId, testUser.id))
        .orderBy(desc(aiChats.createdAt))
        .limit(5);

      const queryTime = Date.now() - startTime;

      expect(recentChats).toHaveLength(5);
      expect(queryTime).toBeLessThan(100); // Should be fast due to index
    });
  });
});
