import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  bio: text('bio'),
  gradeLevel: text('grade_level'),
  school: text('school'),
  timezone: text('timezone').default('UTC'),
  preferredStudyTime: text('preferred_study_time'), // morning, afternoon, evening, night
  studyGoalHoursPerDay: integer('study_goal_hours_per_day').default(2),
  subjects: jsonb('subjects').default([]).$type<string[]>(),
  interests: jsonb('interests').default([]).$type<string[]>(),
  learningStyle: text('learning_style'), // visual, auditory, kinesthetic, reading
  notifications: jsonb('notifications')
    .default({
      email: true,
      push: true,
      reminders: true,
      achievements: true,
    })
    .$type<{
      email: boolean;
      push: boolean;
      reminders: boolean;
      achievements: boolean;
    }>(),
  preferences: jsonb('preferences')
    .default({
      darkMode: false,
      soundEnabled: true,
      pomodoroLength: 25,
      breakLength: 5,
      longBreakLength: 15,
      sessionsBeforeLongBreak: 4,
    })
    .$type<{
      darkMode: boolean;
      soundEnabled: boolean;
      pomodoroLength: number;
      breakLength: number;
      longBreakLength: number;
      sessionsBeforeLongBreak: number;
    }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));
