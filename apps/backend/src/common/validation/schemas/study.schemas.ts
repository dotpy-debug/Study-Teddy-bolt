import { z } from 'zod';
import {
  uuidSchema,
  nameSchema,
  textContentSchema,
  shortTextSchema,
  dateSchema,
  durationSchema,
  difficultySchema,
  studySessionTypeSchema,
  tagsArraySchema,
  prioritySchema,
  percentageSchema,
  paginationSchema,
} from './common.schemas';

// Study session schema
export const studySessionSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  description: textContentSchema.optional(),
  subjectId: uuidSchema,
  type: studySessionTypeSchema,
  plannedDuration: durationSchema,
  startTime: dateSchema,
  endTime: dateSchema.optional(),
  actualDuration: z.number().int().min(0).optional(), // minutes
  status: z
    .enum(['planned', 'active', 'paused', 'completed', 'cancelled'])
    .default('planned'),
  notes: textContentSchema.optional(),
  tags: tagsArraySchema,
  difficulty: difficultySchema.optional(),
  location: shortTextSchema.optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int().min(1).max(30), // every N days/weeks/months
      daysOfWeek: z
        .array(
          z.enum([
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
          ]),
        )
        .optional(),
      endDate: dateSchema.optional(),
    })
    .optional(),
});

// Study task schema
export const studyTaskSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  description: textContentSchema.optional(),
  subjectId: uuidSchema,
  dueDate: dateSchema.optional(),
  priority: prioritySchema.default('medium'),
  estimatedDuration: durationSchema.optional(),
  actualDuration: z.number().int().min(0).optional(),
  status: z
    .enum(['todo', 'in_progress', 'completed', 'cancelled'])
    .default('todo'),
  completedAt: dateSchema.optional(),
  tags: tagsArraySchema,
  subtasks: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        title: nameSchema,
        completed: z.boolean().default(false),
        completedAt: dateSchema.optional(),
      }),
    )
    .optional(),
  attachments: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        filename: z.string().min(1).max(255),
        url: z.string().url(),
        fileType: z.string().min(1).max(50),
        fileSize: z.number().int().min(1),
        uploadedAt: dateSchema,
      }),
    )
    .optional(),
});

// Subject schema
export const subjectSchema = z.object({
  id: uuidSchema.optional(),
  name: nameSchema,
  description: textContentSchema.optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  icon: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  difficulty: difficultySchema.optional(),
  credits: z.number().int().min(0).max(20).optional(),
  semester: z.string().max(50).optional(),
  instructor: z.string().max(100).optional(),
  tags: tagsArraySchema,
  isActive: z.boolean().default(true),
  studyGoal: z
    .object({
      targetHours: z.number().min(0).optional(),
      targetGrade: z.string().max(10).optional(),
      deadline: dateSchema.optional(),
    })
    .optional(),
});

// Flashcard deck schema
export const flashcardDeckSchema = z.object({
  id: uuidSchema.optional(),
  name: nameSchema,
  description: textContentSchema.optional(),
  subjectId: uuidSchema.optional(),
  isPublic: z.boolean().default(false),
  tags: tagsArraySchema,
  difficulty: difficultySchema.optional(),
  language: z.string().max(10).optional(),
  studySettings: z
    .object({
      shuffleCards: z.boolean().default(true),
      showTimer: z.boolean().default(false),
      autoFlip: z.boolean().default(false),
      reviewMode: z
        .enum(['spaced_repetition', 'random', 'sequential'])
        .default('spaced_repetition'),
    })
    .optional(),
});

// Flashcard schema
export const flashcardSchema = z.object({
  id: uuidSchema.optional(),
  deckId: uuidSchema,
  front: textContentSchema,
  back: textContentSchema,
  explanation: textContentSchema.optional(),
  difficulty: difficultySchema.optional(),
  tags: tagsArraySchema,
  image: z.string().url().optional(),
  audio: z.string().url().optional(),
  lastReviewed: dateSchema.optional(),
  nextReview: dateSchema.optional(),
  interval: z.number().int().min(1).default(1), // days
  easeFactor: z.number().min(1.3).max(2.5).default(2.5),
  repetitions: z.number().int().min(0).default(0),
});

// Study progress schema
export const studyProgressSchema = z.object({
  subjectId: uuidSchema,
  date: dateSchema,
  studyTime: z.number().int().min(0), // minutes
  tasksCompleted: z.number().int().min(0),
  averageScore: percentageSchema.optional(),
  mood: z.enum(['excellent', 'good', 'neutral', 'poor', 'terrible']).optional(),
  notes: textContentSchema.optional(),
  goals: z
    .array(
      z.object({
        description: shortTextSchema,
        achieved: z.boolean(),
      }),
    )
    .optional(),
});

// Study analytics schema
export const studyAnalyticsSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']),
  startDate: dateSchema,
  endDate: dateSchema,
  metrics: z.array(
    z.enum([
      'study_time',
      'sessions_count',
      'tasks_completed',
      'average_score',
      'streak_count',
      'productivity_score',
      'subjects_covered',
    ]),
  ),
  groupBy: z.enum(['day', 'week', 'month', 'subject', 'task_type']).optional(),
});

// Quiz schema
export const quizSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  description: textContentSchema.optional(),
  subjectId: uuidSchema,
  timeLimit: durationSchema.optional(),
  questionCount: z.number().int().min(1).max(100),
  difficulty: difficultySchema,
  tags: tagsArraySchema,
  isPublic: z.boolean().default(false),
  allowRetakes: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(true),
  randomizeQuestions: z.boolean().default(true),
  passingScore: percentageSchema.optional(),
});

// Quiz question schema
export const quizQuestionSchema = z.object({
  id: uuidSchema.optional(),
  quizId: uuidSchema,
  question: textContentSchema,
  type: z.enum([
    'multiple_choice',
    'true_false',
    'short_answer',
    'essay',
    'matching',
  ]),
  options: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        text: textContentSchema,
        isCorrect: z.boolean(),
        explanation: textContentSchema.optional(),
      }),
    )
    .optional(),
  correctAnswer: textContentSchema.optional(),
  points: z.number().int().min(1).default(1),
  explanation: textContentSchema.optional(),
  image: z.string().url().optional(),
  order: z.number().int().min(0).optional(),
});

// Quiz attempt schema
export const quizAttemptSchema = z.object({
  quizId: uuidSchema,
  answers: z.array(
    z.object({
      questionId: uuidSchema,
      answer: z.union([z.string(), z.array(z.string())]),
      timeSpent: z.number().int().min(0).optional(), // seconds
    }),
  ),
  startedAt: dateSchema,
  completedAt: dateSchema.optional(),
});

// Study goal schema
export const studyGoalSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  description: textContentSchema.optional(),
  type: z.enum([
    'study_time',
    'tasks_completed',
    'grade_target',
    'skill_mastery',
    'custom',
  ]),
  target: z.object({
    value: z.number().min(0),
    unit: z.string().max(20),
    deadline: dateSchema.optional(),
  }),
  subjectId: uuidSchema.optional(),
  priority: prioritySchema.default('medium'),
  status: z
    .enum(['active', 'completed', 'paused', 'cancelled'])
    .default('active'),
  progress: percentageSchema.default(0),
  milestones: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        title: nameSchema,
        targetValue: z.number().min(0),
        completed: z.boolean().default(false),
        completedAt: dateSchema.optional(),
      }),
    )
    .optional(),
});

// Study plan schema
export const studyPlanSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  description: textContentSchema.optional(),
  startDate: dateSchema,
  endDate: dateSchema,
  subjects: z.array(uuidSchema).min(1, 'At least one subject is required'),
  goals: z.array(uuidSchema).optional(),
  schedule: z
    .array(
      z.object({
        dayOfWeek: z.enum([
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ]),
        startTime: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
        duration: durationSchema,
        subjectId: uuidSchema,
        type: studySessionTypeSchema,
      }),
    )
    .optional(),
  isTemplate: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Study note schema
export const studyNoteSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  content: textContentSchema,
  subjectId: uuidSchema,
  tags: tagsArraySchema,
  format: z.enum(['markdown', 'html', 'plain_text']).default('markdown'),
  isPublic: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        filename: z.string().min(1).max(255),
        url: z.string().url(),
        fileType: z.string().min(1).max(50),
      }),
    )
    .optional(),
  references: z
    .array(
      z.object({
        title: shortTextSchema,
        url: z.string().url(),
        type: z.enum(['book', 'article', 'video', 'website', 'other']),
      }),
    )
    .optional(),
});

// Study resource schema
export const studyResourceSchema = z.object({
  id: uuidSchema.optional(),
  title: nameSchema,
  description: textContentSchema.optional(),
  type: z.enum(['pdf', 'video', 'audio', 'link', 'book', 'article', 'other']),
  url: z.string().url(),
  subjectId: uuidSchema.optional(),
  tags: tagsArraySchema,
  difficulty: difficultySchema.optional(),
  estimatedTime: durationSchema.optional(),
  rating: z.number().min(1).max(5).optional(),
  isPublic: z.boolean().default(false),
  uploadedBy: uuidSchema.optional(),
});

// Export all study schemas
export const StudySchemas = {
  studySession: studySessionSchema,
  studyTask: studyTaskSchema,
  subject: subjectSchema,
  flashcardDeck: flashcardDeckSchema,
  flashcard: flashcardSchema,
  studyProgress: studyProgressSchema,
  studyAnalytics: studyAnalyticsSchema,
  quiz: quizSchema,
  quizQuestion: quizQuestionSchema,
  quizAttempt: quizAttemptSchema,
  studyGoal: studyGoalSchema,
  studyPlan: studyPlanSchema,
  studyNote: studyNoteSchema,
  studyResource: studyResourceSchema,
};
