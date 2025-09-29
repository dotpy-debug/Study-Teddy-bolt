import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { SessionStatus } from '../../src/modules/focus-sessions/dto/focus-session-query.dto';

export interface MockFocusSession {
  id: string;
  userId: string;
  taskId?: string;
  subjectId?: string;
  type: 'pomodoro' | 'custom' | 'deep_work' | 'break';
  status: SessionStatus;
  title?: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  scheduledDuration: number; // in minutes
  actualDuration?: number; // in minutes
  breakDuration?: number; // in minutes
  productivityRating?: number; // 1-5
  focusRating?: number; // 1-5
  distractionCount?: number;
  notes?: string;
  taskProgress?: number; // percentage
  goals?: string[];
  distractionBlocking: boolean;
  backgroundSound: boolean;
  soundType?: string;
  calendarEventId?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FocusSessionFactory {
  static create(overrides?: Partial<MockFocusSession>): MockFocusSession {
    const baseSession: MockFocusSession = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      taskId: faker.string.uuid(),
      subjectId: faker.string.uuid(),
      type: faker.helpers.arrayElement([
        'pomodoro',
        'custom',
        'deep_work',
        'break',
      ]),
      status: faker.helpers.arrayElement([
        SessionStatus.SCHEDULED,
        SessionStatus.ACTIVE,
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
      ]),
      title: faker.company.buzzPhrase(),
      description: faker.lorem.sentence(),
      startTime: faker.date.recent(),
      scheduledDuration: faker.helpers.arrayElement([25, 45, 60, 90, 120]),
      breakDuration: faker.helpers.arrayElement([5, 10, 15, 20]),
      productivityRating: faker.number.int({ min: 1, max: 5 }),
      focusRating: faker.number.int({ min: 1, max: 5 }),
      distractionCount: faker.number.int({ min: 0, max: 10 }),
      notes: faker.lorem.paragraph(),
      taskProgress: faker.number.int({ min: 0, max: 100 }),
      goals: faker.helpers.arrayElements(
        [
          'Complete math homework',
          'Study for exam',
          'Read chapter 5',
          'Practice coding',
          'Review notes',
        ],
        { min: 1, max: 3 },
      ),
      distractionBlocking: faker.datatype.boolean(),
      backgroundSound: faker.datatype.boolean(),
      soundType: faker.helpers.arrayElement([
        'rain',
        'forest',
        'white_noise',
        'classical',
      ]),
      calendarEventId: faker.string.uuid(),
      recurrence: faker.helpers.arrayElement([
        'none',
        'daily',
        'weekly',
        'monthly',
      ]),
      reminderMinutes: faker.helpers.arrayElement([5, 10, 15, 30]),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    const session = { ...baseSession, ...overrides };

    // Set endTime and actualDuration if status is completed
    if (session.status === SessionStatus.COMPLETED && !session.endTime) {
      session.endTime = new Date(
        session.startTime.getTime() + session.scheduledDuration * 60 * 1000,
      );
      session.actualDuration = faker.number.int({
        min: session.scheduledDuration * 0.8,
        max: session.scheduledDuration * 1.2,
      });
    }

    // Remove certain fields for scheduled sessions
    if (session.status === SessionStatus.SCHEDULED) {
      session.endTime = undefined;
      session.actualDuration = undefined;
      session.productivityRating = undefined;
      session.focusRating = undefined;
      session.distractionCount = undefined;
      session.taskProgress = undefined;
      session.notes = undefined;
    }

    return session;
  }

  static createMany(
    count: number,
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createActive(overrides?: Partial<MockFocusSession>): MockFocusSession {
    return this.create({
      status: SessionStatus.ACTIVE,
      startTime: faker.date.recent({ days: 0.1 }), // Started recently
      endTime: undefined,
      actualDuration: undefined,
      productivityRating: undefined,
      focusRating: undefined,
      distractionCount: undefined,
      taskProgress: undefined,
      notes: undefined,
      ...overrides,
    });
  }

  static createScheduled(
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession {
    return this.create({
      status: SessionStatus.SCHEDULED,
      startTime: faker.date.future(),
      endTime: undefined,
      actualDuration: undefined,
      productivityRating: undefined,
      focusRating: undefined,
      distractionCount: undefined,
      taskProgress: undefined,
      notes: undefined,
      ...overrides,
    });
  }

  static createCompleted(
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession {
    const startTime = faker.date.past();
    const scheduledDuration = faker.helpers.arrayElement([25, 45, 60, 90]);
    const actualDuration = faker.number.int({
      min: scheduledDuration * 0.8,
      max: scheduledDuration * 1.2,
    });

    return this.create({
      status: SessionStatus.COMPLETED,
      startTime,
      endTime: new Date(startTime.getTime() + actualDuration * 60 * 1000),
      scheduledDuration,
      actualDuration,
      productivityRating: faker.number.int({ min: 1, max: 5 }),
      focusRating: faker.number.int({ min: 1, max: 5 }),
      distractionCount: faker.number.int({ min: 0, max: 10 }),
      taskProgress: faker.number.int({ min: 10, max: 100 }),
      notes: faker.lorem.sentence(),
      ...overrides,
    });
  }

  static createCancelled(
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession {
    return this.create({
      status: SessionStatus.CANCELLED,
      endTime: undefined,
      actualDuration: undefined,
      productivityRating: undefined,
      focusRating: undefined,
      distractionCount: undefined,
      taskProgress: undefined,
      notes: 'Session was cancelled',
      ...overrides,
    });
  }

  static createPomodoro(
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession {
    return this.create({
      type: 'pomodoro',
      scheduledDuration: 25,
      breakDuration: 5,
      ...overrides,
    });
  }

  static createDeepWork(
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession {
    return this.create({
      type: 'deep_work',
      scheduledDuration: faker.helpers.arrayElement([90, 120, 180]),
      breakDuration: faker.helpers.arrayElement([15, 20, 30]),
      distractionBlocking: true,
      ...overrides,
    });
  }

  static createWithRecurrence(
    overrides?: Partial<MockFocusSession>,
  ): MockFocusSession {
    return this.create({
      status: SessionStatus.SCHEDULED,
      recurrence: faker.helpers.arrayElement(['daily', 'weekly', 'monthly']),
      reminderMinutes: faker.helpers.arrayElement([10, 15, 30]),
      ...overrides,
    });
  }
}
