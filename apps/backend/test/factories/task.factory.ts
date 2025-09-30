import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

export interface MockTask {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  completedAt?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  progressPercentage: number;
  aiGenerated: boolean;
  aiMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSubject {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TaskFactory {
  static create(overrides?: Partial<MockTask>): MockTask {
    const baseTask: MockTask = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      subjectId: faker.string.uuid(),
      title: faker.company.buzzPhrase(),
      description: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      dueDate: faker.date.future(),
      estimatedMinutes: faker.number.int({ min: 30, max: 240 }),
      progressPercentage: faker.number.int({ min: 0, max: 100 }),
      aiGenerated: faker.datatype.boolean(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    const task = { ...baseTask, ...overrides };

    // Set completedAt if status is completed
    if (task.status === 'completed' && !task.completedAt) {
      task.completedAt = faker.date.recent();
      task.progressPercentage = 100;
    }

    // Set actualMinutes if task is completed
    if (task.status === 'completed' && !task.actualMinutes) {
      task.actualMinutes = faker.number.int({
        min: task.estimatedMinutes ? task.estimatedMinutes * 0.7 : 30,
        max: task.estimatedMinutes ? task.estimatedMinutes * 1.3 : 180,
      });
    }

    return task;
  }

  static createMany(count: number, overrides?: Partial<MockTask>): MockTask[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createPending(overrides?: Partial<MockTask>): MockTask {
    return this.create({
      status: 'pending',
      progressPercentage: 0,
      completedAt: undefined,
      actualMinutes: undefined,
      ...overrides,
    });
  }

  static createInProgress(overrides?: Partial<MockTask>): MockTask {
    return this.create({
      status: 'in_progress',
      progressPercentage: faker.number.int({ min: 1, max: 99 }),
      completedAt: undefined,
      actualMinutes: undefined,
      ...overrides,
    });
  }

  static createCompleted(overrides?: Partial<MockTask>): MockTask {
    return this.create({
      status: 'completed',
      progressPercentage: 100,
      completedAt: faker.date.recent(),
      actualMinutes: faker.number.int({ min: 30, max: 180 }),
      ...overrides,
    });
  }

  static createOverdue(overrides?: Partial<MockTask>): MockTask {
    return this.create({
      status: 'pending',
      dueDate: faker.date.past(),
      progressPercentage: 0,
      ...overrides,
    });
  }

  static createAIGenerated(overrides?: Partial<MockTask>): MockTask {
    return this.create({
      aiGenerated: true,
      aiMetadata: {
        originalPrompt: faker.lorem.sentence(),
        confidence: faker.number.float({ min: 0.7, max: 1.0 }),
        generatedAt: faker.date.recent().toISOString(),
      },
      ...overrides,
    });
  }

  static createDueToday(overrides?: Partial<MockTask>): MockTask {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setHours(23, 59, 59, 999); // End of today

    return this.create({
      dueDate,
      status: faker.helpers.arrayElement(['pending', 'in_progress']),
      ...overrides,
    });
  }
}

@Injectable()
export class SubjectFactory {
  static create(overrides?: Partial<MockSubject>): MockSubject {
    const baseSubject: MockSubject = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      name: faker.helpers.arrayElement([
        'Mathematics',
        'Physics',
        'Chemistry',
        'Biology',
        'History',
        'Literature',
        'Computer Science',
        'Economics',
        'Psychology',
        'Philosophy',
      ]),
      color: faker.color.hex(),
      icon: faker.helpers.arrayElement([
        'book',
        'calculator',
        'flask',
        'globe',
        'computer',
        'brain',
        'star',
      ]),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    return { ...baseSubject, ...overrides };
  }

  static createMany(count: number, overrides?: Partial<MockSubject>): MockSubject[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
