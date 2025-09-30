import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

export const eventTypeEnum = pgEnum('event_type', [
  'page_view',
  'button_click',
  'form_submit',
  'session_start',
  'session_end',
  'achievement_unlock',
  'goal_complete',
  'error',
  'custom',
]);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionId: text('session_id'),
    eventType: eventTypeEnum('event_type').notNull(),
    eventName: text('event_name').notNull(),
    eventData: jsonb('event_data').default({}).$type<Record<string, any>>(),
    pageUrl: text('page_url'),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    deviceType: text('device_type'),
    browserName: text('browser_name'),
    osName: text('os_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
    eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
    createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
    sessionIdIdx: index('analytics_events_session_id_idx').on(table.sessionId),
  }),
);

export const userStats = pgTable(
  'user_stats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    totalStudyTime: integer('total_study_time').default(0).notNull(), // in seconds
    totalSessions: integer('total_sessions').default(0).notNull(),
    totalAssignmentsCompleted: integer('total_assignments_completed').default(0).notNull(),
    totalFlashcardsReviewed: integer('total_flashcards_reviewed').default(0).notNull(),
    totalPointsEarned: integer('total_points_earned').default(0).notNull(),
    averageFocusScore: numeric('average_focus_score', {
      precision: 3,
      scale: 2,
    }).default('0'),
    averageSessionDuration: integer('average_session_duration').default(0), // in seconds
    favoriteSubjectId: uuid('favorite_subject_id'),
    mostProductiveTime: text('most_productive_time'),
    weeklyStudyTime: jsonb('weekly_study_time').default([]).$type<number[]>(), // 7 elements for each day
    monthlyProgress: jsonb('monthly_progress').default({}).$type<Record<string, number>>(),
    lastCalculatedAt: timestamp('last_calculated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_stats_user_id_idx').on(table.userId),
  }),
);

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));
