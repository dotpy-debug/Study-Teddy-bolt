import { faker } from '@faker-js/faker';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: 'student' | 'teacher' | 'admin';
  authProvider: 'local' | 'google';
  googleId?: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSubject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTask {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  completedAt?: Date;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockStudySession {
  id: string;
  userId: string;
  subjectId?: string;
  taskId?: string;
  durationMinutes: number;
  startTime: Date;
  endTime?: Date;
  notes?: string;
  mood: 'positive' | 'neutral' | 'negative';
  productivityRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAIChat {
  id: string;
  userId: string;
  actionType: 'chat' | 'study_plan' | 'quiz' | 'summary';
  prompt: string;
  response: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costInCents: number;
  createdAt: Date;
}

export interface MockFlashcardDeck {
  id: string;
  userId: string;
  subjectId?: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockFlashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAssignment {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'submitted';
  grade?: number;
  maxGrade?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test data factory for creating mock objects
 */
export class TestDataFactory {
  /**
   * Create a mock user
   */
  static createUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      passwordHash: '$2b$10$' + faker.string.alphanumeric(53), // Mock bcrypt hash
      role: 'student',
      authProvider: 'local',
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock subject
   */
  static createSubject(
    userId: string,
    overrides: Partial<MockSubject> = {},
  ): MockSubject {
    return {
      id: faker.string.uuid(),
      userId,
      name: faker.lorem.words(2),
      description: faker.lorem.sentence(),
      color: faker.color.human(),
      icon: faker.helpers.arrayElement(['📚', '🔬', '🎨', '💻', '🏃', '🎵']),
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock task
   */
  static createTask(
    userId: string,
    overrides: Partial<MockTask> = {},
  ): MockTask {
    return {
      id: faker.string.uuid(),
      userId,
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      status: 'pending',
      dueDate: faker.date.future(),
      estimatedDurationMinutes: faker.number.int({ min: 15, max: 240 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock study session
   */
  static createStudySession(
    userId: string,
    overrides: Partial<MockStudySession> = {},
  ): MockStudySession {
    const startTime = faker.date.recent();
    const durationMinutes = faker.number.int({ min: 15, max: 120 });

    return {
      id: faker.string.uuid(),
      userId,
      durationMinutes,
      startTime,
      endTime: new Date(startTime.getTime() + durationMinutes * 60000),
      notes: faker.lorem.sentence(),
      mood: faker.helpers.arrayElement(['positive', 'neutral', 'negative']),
      productivityRating: faker.number.int({ min: 1, max: 5 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock AI chat
   */
  static createAIChat(
    userId: string,
    overrides: Partial<MockAIChat> = {},
  ): MockAIChat {
    const promptTokens = faker.number.int({ min: 10, max: 100 });
    const completionTokens = faker.number.int({ min: 10, max: 150 });

    return {
      id: faker.string.uuid(),
      userId,
      actionType: 'chat',
      prompt: faker.lorem.sentence(),
      response: faker.lorem.paragraph(),
      model: 'gpt-4o-mini',
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costInCents: (promptTokens + completionTokens) * 0.001,
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock flashcard deck
   */
  static createFlashcardDeck(
    userId: string,
    overrides: Partial<MockFlashcardDeck> = {},
  ): MockFlashcardDeck {
    return {
      id: faker.string.uuid(),
      userId,
      name: faker.lorem.words(2),
      description: faker.lorem.sentence(),
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock flashcard
   */
  static createFlashcard(
    deckId: string,
    overrides: Partial<MockFlashcard> = {},
  ): MockFlashcard {
    return {
      id: faker.string.uuid(),
      deckId,
      front: faker.lorem.sentence(),
      back: faker.lorem.paragraph(),
      hint: faker.lorem.words(5),
      orderIndex: faker.number.int({ min: 0, max: 100 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock assignment
   */
  static createAssignment(
    userId: string,
    overrides: Partial<MockAssignment> = {},
  ): MockAssignment {
    return {
      id: faker.string.uuid(),
      userId,
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      dueDate: faker.date.future(),
      status: 'pending',
      maxGrade: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a mock notification
   */
  static createNotification(
    userId: string,
    overrides: Partial<MockNotification> = {},
  ): MockNotification {
    return {
      id: faker.string.uuid(),
      userId,
      title: faker.lorem.words(3),
      message: faker.lorem.sentence(),
      type: faker.helpers.arrayElement(['info', 'success', 'warning', 'error']),
      isRead: false,
      actionUrl: faker.internet.url(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a complete test dataset for a user
   */
  static createCompleteUserDataset(userOverrides: Partial<MockUser> = {}) {
    const user = this.createUser(userOverrides);

    // Create subjects
    const subjects = [
      this.createSubject(user.id, { name: 'Mathematics', color: '#3B82F6' }),
      this.createSubject(user.id, { name: 'Science', color: '#10B981' }),
      this.createSubject(user.id, { name: 'History', color: '#F59E0B' }),
    ];

    // Create tasks
    const tasks = [
      this.createTask(user.id, {
        subjectId: subjects[0].id,
        title: 'Complete algebra homework',
        priority: 'high',
        status: 'pending',
      }),
      this.createTask(user.id, {
        subjectId: subjects[1].id,
        title: 'Study for chemistry test',
        priority: 'medium',
        status: 'in_progress',
      }),
      this.createTask(user.id, {
        subjectId: subjects[2].id,
        title: 'Read history chapter',
        priority: 'low',
        status: 'completed',
        completedAt: new Date(),
      }),
    ];

    // Create study sessions
    const studySessions = [
      this.createStudySession(user.id, {
        subjectId: subjects[0].id,
        taskId: tasks[0].id,
        durationMinutes: 45,
        mood: 'positive',
      }),
      this.createStudySession(user.id, {
        subjectId: subjects[1].id,
        taskId: tasks[1].id,
        durationMinutes: 30,
        mood: 'neutral',
      }),
    ];

    // Create AI chats
    const aiChats = [
      this.createAIChat(user.id, {
        prompt: 'Help me understand quadratic equations',
        response: 'Quadratic equations are polynomial equations of degree 2...',
        actionType: 'chat',
      }),
      this.createAIChat(user.id, {
        prompt: 'Create a study plan for chemistry',
        response: "Here's a structured study plan for chemistry...",
        actionType: 'study_plan',
      }),
    ];

    // Create flashcard decks and cards
    const flashcardDecks = [
      this.createFlashcardDeck(user.id, {
        subjectId: subjects[0].id,
        name: 'Math Formulas',
      }),
      this.createFlashcardDeck(user.id, {
        subjectId: subjects[1].id,
        name: 'Chemistry Elements',
      }),
    ];

    const flashcards = [
      this.createFlashcard(flashcardDecks[0].id, {
        front: 'Quadratic formula',
        back: 'x = (-b ± √(b²-4ac)) / 2a',
      }),
      this.createFlashcard(flashcardDecks[1].id, {
        front: 'Symbol for Gold',
        back: 'Au',
      }),
    ];

    // Create assignments
    const assignments = [
      this.createAssignment(user.id, {
        subjectId: subjects[0].id,
        title: 'Math Problem Set 5',
        status: 'pending',
      }),
      this.createAssignment(user.id, {
        subjectId: subjects[1].id,
        title: 'Lab Report: Chemical Reactions',
        status: 'completed',
        grade: 95,
        maxGrade: 100,
      }),
    ];

    // Create notifications
    const notifications = [
      this.createNotification(user.id, {
        title: 'Assignment Due Soon',
        message: 'Your math assignment is due tomorrow',
        type: 'warning',
      }),
      this.createNotification(user.id, {
        title: 'Study Session Complete',
        message: 'Great job on completing your 45-minute study session!',
        type: 'success',
        isRead: true,
      }),
    ];

    return {
      user,
      subjects,
      tasks,
      studySessions,
      aiChats,
      flashcardDecks,
      flashcards,
      assignments,
      notifications,
    };
  }

  /**
   * Create minimal test data for basic tests
   */
  static createMinimalDataset() {
    const user = this.createUser();
    const subject = this.createSubject(user.id);
    const task = this.createTask(user.id, { subjectId: subject.id });

    return { user, subject, task };
  }
}
