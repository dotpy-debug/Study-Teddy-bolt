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
  decimal,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { achievements } from './achievements.schema';
import { notifications } from './notifications.schema';

// Goal type enum
export const goalTypeEnum = pgEnum('goal_type', [
  'study_time',
  'tasks_completed',
  'sessions_count',
  'focus_score',
  'streak',
  'grade',
]);

// Goal category enum
export const goalCategoryEnum = pgEnum('goal_category', [
  'academic',
  'personal',
  'productivity',
  'health',
]);

// Goal timeframe enum
export const goalTimeframeEnum = pgEnum('goal_timeframe', [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

// Goal status enum
export const goalStatusEnum = pgEnum('goal_status', [
  'active',
  'paused',
  'completed',
  'cancelled',
  'overdue',
]);

// Goal priority enum
export const goalPriorityEnum = pgEnum('goal_priority', ['low', 'medium', 'high', 'critical']);

// Sharing type enum
export const goalSharingTypeEnum = pgEnum('goal_sharing_type', [
  'private',
  'friends',
  'public',
  'study_group',
]);

// Main goals table
export const goals = pgTable(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    type: goalTypeEnum('type').notNull(),
    category: goalCategoryEnum('category').notNull(),
    timeframe: goalTimeframeEnum('timeframe').notNull(),

    // Target and progress values
    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
    currentValue: decimal('current_value', { precision: 10, scale: 2 }).default('0').notNull(),
    unit: text('unit').notNull(), // 'hours', 'tasks', 'sessions', 'points', 'percentage'

    // Dates
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    customEndDate: date('custom_end_date'), // For custom timeframes

    // Status and priority
    status: goalStatusEnum('status').default('active').notNull(),
    priority: goalPriorityEnum('priority').default('medium').notNull(),

    // Completion tracking
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    progressPercentage: decimal('progress_percentage', {
      precision: 5,
      scale: 2,
    })
      .default('0')
      .notNull(),

    // Recurring goals
    isRecurring: boolean('is_recurring').default(false).notNull(),
    recurrencePattern: jsonb('recurrence_pattern').$type<{
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number; // Every N days/weeks/months/years
      daysOfWeek?: number[]; // For weekly goals [0-6, 0=Sunday]
      dayOfMonth?: number; // For monthly goals
      endRecurrence?: string; // Date or 'never'
      maxOccurrences?: number; // Max number of occurrences
    }>(),
    parentGoalId: uuid('parent_goal_id').references(() => goals.id), // For recurring goal instances

    // Sharing and collaboration
    sharingType: goalSharingTypeEnum('sharing_type').default('private').notNull(),
    isCollaborative: boolean('is_collaborative').default(false).notNull(),
    collaboratorIds: jsonb('collaborator_ids').$type<string[]>().default([]),

    // Templates and suggestions
    isTemplate: boolean('is_template').default(false).notNull(),
    templateId: uuid('template_id').references(() => goals.id), // Reference to template goal
    isAiSuggested: boolean('is_ai_suggested').default(false).notNull(),

    // Metadata
    tags: jsonb('tags').$type<string[]>().default([]),
    metadata: jsonb('metadata').$type<{
      estimatedDifficulty?: 'easy' | 'medium' | 'hard';
      relatedSubjects?: string[];
      motivationalMessage?: string;
      rewards?: string[];
      aiInsights?: {
        feasibilityScore: number;
        timeEstimate: string;
        tips: string[];
      };
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('goals_user_id_idx').on(table.userId),
    typeIdx: index('goals_type_idx').on(table.type),
    categoryIdx: index('goals_category_idx').on(table.category),
    timeframeIdx: index('goals_timeframe_idx').on(table.timeframe),
    statusIdx: index('goals_status_idx').on(table.status),
    completedIdx: index('goals_completed_idx').on(table.isCompleted),
    recurringIdx: index('goals_recurring_idx').on(table.isRecurring),
    templateIdx: index('goals_template_idx').on(table.isTemplate),
    sharingIdx: index('goals_sharing_idx').on(table.sharingType),
    priorityIdx: index('goals_priority_idx').on(table.priority),
    parentGoalIdx: index('goals_parent_goal_idx').on(table.parentGoalId),
    endDateIdx: index('goals_end_date_idx').on(table.endDate),
  }),
);

// Goal milestones table
export const goalMilestones = pgTable(
  'goal_milestones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
    order: integer('order').notNull(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    rewardPoints: integer('reward_points').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    goalIdIdx: index('goal_milestones_goal_id_idx').on(table.goalId),
    completedIdx: index('goal_milestones_completed_idx').on(table.isCompleted),
    orderIdx: index('goal_milestones_order_idx').on(table.order),
  }),
);

// Goal progress tracking table
export const goalProgress = pgTable(
  'goal_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    note: text('note'),
    source: text('source').default('manual').notNull(), // 'manual', 'automatic', 'ai'
    metadata: jsonb('metadata').$type<{
      sessionId?: string;
      taskId?: string;
      activityType?: string;
      confidence?: number; // For AI-tracked progress
    }>(),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    goalIdIdx: index('goal_progress_goal_id_idx').on(table.goalId),
    recordedAtIdx: index('goal_progress_recorded_at_idx').on(table.recordedAt),
    sourceIdx: index('goal_progress_source_idx').on(table.source),
  }),
);

// Goal templates table
export const goalTemplates = pgTable(
  'goal_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    type: goalTypeEnum('type').notNull(),
    category: goalCategoryEnum('category').notNull(),
    defaultTimeframe: goalTimeframeEnum('default_timeframe').notNull(),
    defaultTargetValue: decimal('default_target_value', {
      precision: 10,
      scale: 2,
    }).notNull(),
    unit: text('unit').notNull(),
    difficulty: text('difficulty').notNull(), // 'easy', 'medium', 'hard'

    // Template configuration
    isPublic: boolean('is_public').default(true).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    rating: decimal('rating', { precision: 3, scale: 2 }).default('0').notNull(),

    // Template metadata
    tags: jsonb('tags').$type<string[]>().default([]),
    milestones: jsonb('milestones')
      .$type<
        Array<{
          title: string;
          description?: string;
          targetPercentage: number;
          order: number;
        }>
      >()
      .default([]),

    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('goal_templates_type_idx').on(table.type),
    categoryIdx: index('goal_templates_category_idx').on(table.category),
    publicIdx: index('goal_templates_public_idx').on(table.isPublic),
    usageIdx: index('goal_templates_usage_idx').on(table.usageCount),
    ratingIdx: index('goal_templates_rating_idx').on(table.rating),
    createdByIdx: index('goal_templates_created_by_idx').on(table.createdBy),
  }),
);

// Goal sharing table for collaborative goals
export const goalSharing = pgTable(
  'goal_sharing',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    sharedWithUserId: uuid('shared_with_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sharedByUserId: uuid('shared_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(), // 'view', 'comment', 'edit'
    status: text('status').default('pending').notNull(), // 'pending', 'accepted', 'declined'
    inviteMessage: text('invite_message'),
    respondedAt: timestamp('responded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    goalIdIdx: index('goal_sharing_goal_id_idx').on(table.goalId),
    sharedWithIdx: index('goal_sharing_shared_with_idx').on(table.sharedWithUserId),
    sharedByIdx: index('goal_sharing_shared_by_idx').on(table.sharedByUserId),
    statusIdx: index('goal_sharing_status_idx').on(table.status),
    goalUserUnique: index('goal_sharing_goal_user_unique').on(table.goalId, table.sharedWithUserId),
  }),
);

// Goal comments table for collaboration
export const goalComments = pgTable(
  'goal_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    parentCommentId: uuid('parent_comment_id').references(() => goalComments.id),
    isEdited: boolean('is_edited').default(false).notNull(),
    editedAt: timestamp('edited_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    goalIdIdx: index('goal_comments_goal_id_idx').on(table.goalId),
    userIdIdx: index('goal_comments_user_id_idx').on(table.userId),
    parentCommentIdx: index('goal_comments_parent_idx').on(table.parentCommentId),
    createdAtIdx: index('goal_comments_created_at_idx').on(table.createdAt),
  }),
);

// Goal reminders table
export const goalReminders = pgTable(
  'goal_reminders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'deadline', 'milestone', 'progress_check', 'motivation'
    title: text('title').notNull(),
    message: text('message'),
    scheduledFor: timestamp('scheduled_for').notNull(),
    isRecurring: boolean('is_recurring').default(false).notNull(),
    recurrencePattern: jsonb('recurrence_pattern').$type<{
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      daysOfWeek?: number[];
    }>(),
    isSent: boolean('is_sent').default(false).notNull(),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    goalIdIdx: index('goal_reminders_goal_id_idx').on(table.goalId),
    scheduledIdx: index('goal_reminders_scheduled_idx').on(table.scheduledFor),
    sentIdx: index('goal_reminders_sent_idx').on(table.isSent),
    typeIdx: index('goal_reminders_type_idx').on(table.type),
  }),
);

// Relations
export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  parentGoal: one(goals, {
    fields: [goals.parentGoalId],
    references: [goals.id],
  }),
  childGoals: many(goals),
  template: one(goals, {
    fields: [goals.templateId],
    references: [goals.id],
  }),
  milestones: many(goalMilestones),
  progress: many(goalProgress),
  sharing: many(goalSharing),
  comments: many(goalComments),
  reminders: many(goalReminders),
}));

export const goalMilestonesRelations = relations(goalMilestones, ({ one }) => ({
  goal: one(goals, {
    fields: [goalMilestones.goalId],
    references: [goals.id],
  }),
}));

export const goalProgressRelations = relations(goalProgress, ({ one }) => ({
  goal: one(goals, {
    fields: [goalProgress.goalId],
    references: [goals.id],
  }),
}));

export const goalTemplatesRelations = relations(goalTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [goalTemplates.createdBy],
    references: [users.id],
  }),
  goals: many(goals),
}));

export const goalSharingRelations = relations(goalSharing, ({ one }) => ({
  goal: one(goals, {
    fields: [goalSharing.goalId],
    references: [goals.id],
  }),
  sharedWithUser: one(users, {
    fields: [goalSharing.sharedWithUserId],
    references: [users.id],
  }),
  sharedByUser: one(users, {
    fields: [goalSharing.sharedByUserId],
    references: [users.id],
  }),
}));

export const goalCommentsRelations = relations(goalComments, ({ one, many }) => ({
  goal: one(goals, {
    fields: [goalComments.goalId],
    references: [goals.id],
  }),
  user: one(users, {
    fields: [goalComments.userId],
    references: [users.id],
  }),
  parentComment: one(goalComments, {
    fields: [goalComments.parentCommentId],
    references: [goalComments.id],
  }),
  replies: many(goalComments),
}));

export const goalRemindersRelations = relations(goalReminders, ({ one }) => ({
  goal: one(goals, {
    fields: [goalReminders.goalId],
    references: [goals.id],
  }),
}));
