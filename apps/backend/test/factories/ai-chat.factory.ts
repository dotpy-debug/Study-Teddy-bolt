import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

export interface MockAIChat {
  id: string;
  userId: string;
  actionType:
    | 'chat'
    | 'study_plan'
    | 'practice_questions'
    | 'summary'
    | 'explanation';
  prompt: string;
  response: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costInCents?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AIChatFactory {
  static create(overrides?: Partial<MockAIChat>): MockAIChat {
    const promptTokens = faker.number.int({ min: 50, max: 500 });
    const completionTokens = faker.number.int({ min: 100, max: 800 });

    const baseChat: MockAIChat = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      actionType: faker.helpers.arrayElement([
        'chat',
        'study_plan',
        'practice_questions',
        'summary',
        'explanation',
      ]),
      prompt: faker.lorem.paragraph(),
      response: faker.lorem.paragraphs(3),
      model: faker.helpers.arrayElement([
        'gpt-4o-mini',
        'gpt-4o',
        'deepseek-chat',
        'deepseek-coder',
      ]),
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costInCents: faker.number
        .float({ min: 0.01, max: 5.0, fractionDigits: 2 })
        .toString(),
      metadata: {
        processingTime: faker.number.int({ min: 500, max: 5000 }),
        cacheHit: faker.datatype.boolean(),
        provider: faker.helpers.arrayElement(['openai', 'deepseek']),
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    return { ...baseChat, ...overrides };
  }

  static createMany(
    count: number,
    overrides?: Partial<MockAIChat>,
  ): MockAIChat[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createChatMessage(overrides?: Partial<MockAIChat>): MockAIChat {
    return this.create({
      actionType: 'chat',
      prompt: faker.lorem.sentence() + '?',
      response: faker.lorem.paragraphs(2),
      ...overrides,
    });
  }

  static createStudyPlan(overrides?: Partial<MockAIChat>): MockAIChat {
    return this.create({
      actionType: 'study_plan',
      prompt: `Create a study plan for ${faker.helpers.arrayElement([
        'Mathematics',
        'Physics',
        'Chemistry',
        'Biology',
        'History',
      ])} lasting ${faker.number.int({ min: 1, max: 12 })} weeks`,
      response: faker.lorem.paragraphs(5),
      promptTokens: faker.number.int({ min: 100, max: 300 }),
      completionTokens: faker.number.int({ min: 800, max: 1500 }),
      ...overrides,
    });
  }

  static createPracticeQuestions(overrides?: Partial<MockAIChat>): MockAIChat {
    const questionCount = faker.number.int({ min: 3, max: 10 });
    const subject = faker.helpers.arrayElement([
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'History',
    ]);

    return this.create({
      actionType: 'practice_questions',
      prompt: `Generate ${questionCount} practice questions for ${subject}`,
      response: Array.from(
        { length: questionCount },
        (_, i) => `${i + 1}. ${faker.lorem.sentence()}?`,
      ).join('\n'),
      metadata: {
        questionCount,
        subject,
        difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
      },
      ...overrides,
    });
  }

  static createExplanation(overrides?: Partial<MockAIChat>): MockAIChat {
    return this.create({
      actionType: 'explanation',
      prompt: `Explain ${faker.lorem.words(3)}`,
      response: faker.lorem.paragraphs(3),
      promptTokens: faker.number.int({ min: 20, max: 100 }),
      completionTokens: faker.number.int({ min: 200, max: 600 }),
      ...overrides,
    });
  }

  static createSummary(overrides?: Partial<MockAIChat>): MockAIChat {
    return this.create({
      actionType: 'summary',
      prompt: `Summarize this content: ${faker.lorem.paragraphs(3)}`,
      response: faker.lorem.paragraph(),
      promptTokens: faker.number.int({ min: 200, max: 800 }),
      completionTokens: faker.number.int({ min: 50, max: 200 }),
      ...overrides,
    });
  }

  static createHighTokenUsage(overrides?: Partial<MockAIChat>): MockAIChat {
    const promptTokens = faker.number.int({ min: 1000, max: 3000 });
    const completionTokens = faker.number.int({ min: 1500, max: 4000 });

    return this.create({
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costInCents: faker.number
        .float({ min: 10.0, max: 50.0, fractionDigits: 2 })
        .toString(),
      prompt: faker.lorem.paragraphs(10),
      response: faker.lorem.paragraphs(15),
      ...overrides,
    });
  }

  static createLowTokenUsage(overrides?: Partial<MockAIChat>): MockAIChat {
    const promptTokens = faker.number.int({ min: 10, max: 50 });
    const completionTokens = faker.number.int({ min: 20, max: 100 });

    return this.create({
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costInCents: faker.number
        .float({ min: 0.01, max: 0.5, fractionDigits: 2 })
        .toString(),
      prompt: faker.lorem.sentence(),
      response: faker.lorem.paragraph(),
      ...overrides,
    });
  }

  static createForUser(userId: string, count: number = 1): MockAIChat[] {
    return this.createMany(count, { userId });
  }

  static createRecentChats(userId: string, count: number = 5): MockAIChat[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        userId,
        createdAt: faker.date.recent({ days: i + 1 }),
        updatedAt: faker.date.recent({ days: i + 1 }),
      }),
    );
  }
}
