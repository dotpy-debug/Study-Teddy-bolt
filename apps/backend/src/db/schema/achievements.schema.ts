import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

export const achievementTypeEnum = pgEnum('achievement_type', [
  'streak',
  'study_time',
  'completion',
  'mastery',
  'social',
  'special',
]);

export const achievementRarityEnum = pgEnum('achievement_rarity', [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    icon: text('icon').notNull(),
    type: achievementTypeEnum('type').notNull(),
    rarity: achievementRarityEnum('rarity').default('common').notNull(),
    points: integer('points').default(10).notNull(),
    requirement: jsonb('requirement').notNull().$type<{
      type: string;
      value: number;
      condition?: string;
    }>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('achievements_type_idx').on(table.type),
    rarityIdx: index('achievements_rarity_idx').on(table.rarity),
    activeIdx: index('achievements_active_idx').on(table.isActive),
  }),
);

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
    progress: integer('progress').default(0).notNull(),
    maxProgress: integer('max_progress').default(100).notNull(),
  },
  (table) => ({
    userIdIdx: index('user_achievements_user_id_idx').on(table.userId),
    achievementIdIdx: index('user_achievements_achievement_id_idx').on(
      table.achievementId,
    ),
    userAchievementUnique: index('user_achievement_unique').on(
      table.userId,
      table.achievementId,
    ),
  }),
);

export const studyGoals = pgTable(
  'study_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    targetValue: integer('target_value').notNull(),
    currentValue: integer('current_value').default(0).notNull(),
    unit: text('unit').notNull(), // hours, sessions, cards, etc.
    deadline: timestamp('deadline'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('study_goals_user_id_idx').on(table.userId),
    completedIdx: index('study_goals_completed_idx').on(table.isCompleted),
    deadlineIdx: index('study_goals_deadline_idx').on(table.deadline),
  }),
);

export const studyStreaks = pgTable(
  'study_streaks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    currentStreak: integer('current_streak').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    lastStudyDate: timestamp('last_study_date'),
    startDate: timestamp('start_date').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('study_streaks_user_id_idx').on(table.userId),
    userIdUnique: index('study_streaks_user_id_unique').on(table.userId),
  }),
);

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [userAchievements.userId],
      references: [users.id],
    }),
    achievement: one(achievements, {
      fields: [userAchievements.achievementId],
      references: [achievements.id],
    }),
  }),
);

export const studyGoalsRelations = relations(studyGoals, ({ one }) => ({
  user: one(users, {
    fields: [studyGoals.userId],
    references: [users.id],
  }),
}));

export const studyStreaksRelations = relations(studyStreaks, ({ one }) => ({
  user: one(users, {
    fields: [studyStreaks.userId],
    references: [users.id],
  }),
}));
