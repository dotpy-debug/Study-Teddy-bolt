import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
  jsonb,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { subjects } from './subjects.schema';

export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'paused',
  'completed',
  'abandoned',
]);
export const sessionTypeEnum = pgEnum('session_type', ['pomodoro', 'free', 'goal_based']);

export const studySessions = pgTable(
  'study_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    title: text('title'),
    type: sessionTypeEnum('type').default('free').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    pausedDuration: integer('paused_duration').default(0), // in seconds
    totalDuration: integer('total_duration'), // in seconds
    breaksTaken: integer('breaks_taken').default(0),
    pomodorosCompleted: integer('pomodoros_completed').default(0),
    focusScore: numeric('focus_score', { precision: 3, scale: 2 }), // 0.00 to 1.00
    notes: text('notes'),
    goals: jsonb('goals').default([]).$type<string[]>(),
    distractions: integer('distractions').default(0),
    status: sessionStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('study_sessions_user_id_idx').on(table.userId),
    subjectIdIdx: index('study_sessions_subject_id_idx').on(table.subjectId),
    statusIdx: index('study_sessions_status_idx').on(table.status),
    startTimeIdx: index('study_sessions_start_time_idx').on(table.startTime),
  }),
);

export const sessionAnalytics = pgTable('session_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => studySessions.id, { onDelete: 'cascade' }),
  productivityScore: numeric('productivity_score', { precision: 3, scale: 2 }),
  averageFocusTime: integer('average_focus_time'), // in seconds
  peakFocusTime: text('peak_focus_time'), // time of day when most focused
  breakPattern: jsonb('break_pattern').default([]).$type<{ time: string; duration: number }[]>(),
  keyInsights: jsonb('key_insights').default([]).$type<string[]>(),
  recommendations: jsonb('recommendations').default([]).$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [studySessions.subjectId],
    references: [subjects.id],
  }),
  analytics: one(sessionAnalytics),
}));

export const sessionAnalyticsRelations = relations(sessionAnalytics, ({ one }) => ({
  session: one(studySessions, {
    fields: [sessionAnalytics.sessionId],
    references: [studySessions.id],
  }),
}));
