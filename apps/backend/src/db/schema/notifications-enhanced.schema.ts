import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  jsonb,
  integer,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

export const notificationTypeEnum = pgEnum('notification_type', [
  'info',
  'success',
  'warning',
  'error',
  'reminder',
  'achievement',
]);

export const notificationCategoryEnum = pgEnum('notification_category', [
  'study',
  'task',
  'goal',
  'session',
  'system',
  'social',
  'reminder',
]);

export const notificationPriorityEnum = pgEnum('notification_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'read',
  'archived',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'push',
  'sms',
  'websocket',
]);

export const batchStatusEnum = pgEnum('batch_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const notificationsEnhanced = pgTable(
  'notifications_enhanced',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').default('info').notNull(),
    category: notificationCategoryEnum('category').default('system').notNull(),
    priority: notificationPriorityEnum('priority').default('medium').notNull(),
    status: notificationStatusEnum('status').default('pending').notNull(),
    channels: jsonb('channels').default(['in_app']).$type<string[]>(),
    isRead: boolean('is_read').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    metadata: jsonb('metadata').default({}).$type<{
      [key: string]: any;
      actionUrl?: string;
      actionText?: string;
      icon?: string;
      image?: string;
      sound?: string;
      badge?: string;
      data?: Record<string, any>;
    }>(),
    scheduledAt: timestamp('scheduled_at'),
    expiresAt: timestamp('expires_at'),
    readAt: timestamp('read_at'),
    archivedAt: timestamp('archived_at'),
    templateId: uuid('template_id'),
    templateVariables: jsonb('template_variables').$type<Record<string, any>>(),
    batchId: uuid('batch_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notifications_enhanced_user_id_idx').on(table.userId),
    typeIdx: index('notifications_enhanced_type_idx').on(table.type),
    categoryIdx: index('notifications_enhanced_category_idx').on(
      table.category,
    ),
    priorityIdx: index('notifications_enhanced_priority_idx').on(
      table.priority,
    ),
    statusIdx: index('notifications_enhanced_status_idx').on(table.status),
    isReadIdx: index('notifications_enhanced_is_read_idx').on(table.isRead),
    isArchivedIdx: index('notifications_enhanced_is_archived_idx').on(
      table.isArchived,
    ),
    scheduledAtIdx: index('notifications_enhanced_scheduled_at_idx').on(
      table.scheduledAt,
    ),
    expiresAtIdx: index('notifications_enhanced_expires_at_idx').on(
      table.expiresAt,
    ),
    createdAtIdx: index('notifications_enhanced_created_at_idx').on(
      table.createdAt,
    ),
    userReadIdx: index('notifications_enhanced_user_read_idx').on(
      table.userId,
      table.isRead,
    ),
    userCategoryIdx: index('notifications_enhanced_user_category_idx').on(
      table.userId,
      table.category,
    ),
    userPriorityIdx: index('notifications_enhanced_user_priority_idx').on(
      table.userId,
      table.priority,
    ),
    batchIdIdx: index('notifications_enhanced_batch_id_idx').on(table.batchId),
    templateIdIdx: index('notifications_enhanced_template_id_idx').on(
      table.templateId,
    ),
  }),
);

// Notification Templates
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull(),
    category: notificationCategoryEnum('category').notNull(),
    priority: notificationPriorityEnum('priority').default('medium').notNull(),
    channels: jsonb('channels').default(['in_app']).$type<string[]>(),
    metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
    variables: jsonb('variables').default([]).$type<string[]>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('notification_templates_name_idx').on(table.name),
    typeIdx: index('notification_templates_type_idx').on(table.type),
    categoryIdx: index('notification_templates_category_idx').on(
      table.category,
    ),
    isActiveIdx: index('notification_templates_is_active_idx').on(
      table.isActive,
    ),
  }),
);

// Notification Preferences
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    emailEnabled: boolean('email_enabled').default(true).notNull(),
    pushEnabled: boolean('push_enabled').default(true).notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
    smsEnabled: boolean('sms_enabled').default(false).notNull(),
    quietHoursEnabled: boolean('quiet_hours_enabled').default(false).notNull(),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }).default(
      '22:00',
    ),
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }).default('08:00'),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    categories: jsonb('categories').default({}).$type<
      Record<
        string,
        {
          enabled: boolean;
          channels: string[];
          priority: string;
        }
      >
    >(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notification_preferences_user_id_idx').on(table.userId),
  }),
);

// Push Subscriptions
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
    endpointIdx: index('push_subscriptions_endpoint_idx').on(table.endpoint),
    isActiveIdx: index('push_subscriptions_is_active_idx').on(table.isActive),
  }),
);

// Notification Deliveries
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notificationsEnhanced.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    status: notificationStatusEnum('status').default('pending').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    lastAttemptAt: timestamp('last_attempt_at'),
    deliveredAt: timestamp('delivered_at'),
    failureReason: text('failure_reason'),
    externalId: text('external_id'),
    metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    notificationIdIdx: index('notification_deliveries_notification_id_idx').on(
      table.notificationId,
    ),
    channelIdx: index('notification_deliveries_channel_idx').on(table.channel),
    statusIdx: index('notification_deliveries_status_idx').on(table.status),
    deliveredAtIdx: index('notification_deliveries_delivered_at_idx').on(
      table.deliveredAt,
    ),
  }),
);

// Scheduled Notifications
export const scheduledNotifications = pgTable(
  'scheduled_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => notificationTemplates.id),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull(),
    category: notificationCategoryEnum('category').notNull(),
    priority: notificationPriorityEnum('priority').default('medium').notNull(),
    channels: jsonb('channels').default(['in_app']).$type<string[]>(),
    metadata: jsonb('metadata').default({}).$type<Record<string, any>>(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    recurring: jsonb('recurring').$type<{
      interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
      daysOfWeek?: number[];
      dayOfMonth?: number;
      endDate?: string;
      maxOccurrences?: number;
    }>(),
    isActive: boolean('is_active').default(true).notNull(),
    lastExecutedAt: timestamp('last_executed_at'),
    executionCount: integer('execution_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('scheduled_notifications_user_id_idx').on(table.userId),
    scheduledAtIdx: index('scheduled_notifications_scheduled_at_idx').on(
      table.scheduledAt,
    ),
    isActiveIdx: index('scheduled_notifications_is_active_idx').on(
      table.isActive,
    ),
    templateIdIdx: index('scheduled_notifications_template_id_idx').on(
      table.templateId,
    ),
  }),
);

// Notification Batches
export const notificationBatches = pgTable(
  'notification_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    templateId: uuid('template_id').references(() => notificationTemplates.id),
    userIds: jsonb('user_ids').notNull().$type<string[]>(),
    status: batchStatusEnum('status').default('pending').notNull(),
    totalCount: integer('total_count').default(0).notNull(),
    successCount: integer('success_count').default(0).notNull(),
    failureCount: integer('failure_count').default(0).notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('notification_batches_status_idx').on(table.status),
    createdByIdx: index('notification_batches_created_by_idx').on(
      table.createdBy,
    ),
    templateIdIdx: index('notification_batches_template_id_idx').on(
      table.templateId,
    ),
  }),
);

// Relations
export const notificationsEnhancedRelations = relations(
  notificationsEnhanced,
  ({ one, many }) => ({
    user: one(users, {
      fields: [notificationsEnhanced.userId],
      references: [users.id],
    }),
    template: one(notificationTemplates, {
      fields: [notificationsEnhanced.templateId],
      references: [notificationTemplates.id],
    }),
    batch: one(notificationBatches, {
      fields: [notificationsEnhanced.batchId],
      references: [notificationBatches.id],
    }),
    deliveries: many(notificationDeliveries),
  }),
);

export const notificationTemplatesRelations = relations(
  notificationTemplates,
  ({ many }) => ({
    notifications: many(notificationsEnhanced),
    scheduledNotifications: many(scheduledNotifications),
    batches: many(notificationBatches),
  }),
);

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  }),
);

export const notificationDeliveriesRelations = relations(
  notificationDeliveries,
  ({ one }) => ({
    notification: one(notificationsEnhanced, {
      fields: [notificationDeliveries.notificationId],
      references: [notificationsEnhanced.id],
    }),
  }),
);

export const scheduledNotificationsRelations = relations(
  scheduledNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [scheduledNotifications.userId],
      references: [users.id],
    }),
    template: one(notificationTemplates, {
      fields: [scheduledNotifications.templateId],
      references: [notificationTemplates.id],
    }),
  }),
);

export const notificationBatchesRelations = relations(
  notificationBatches,
  ({ one, many }) => ({
    template: one(notificationTemplates, {
      fields: [notificationBatches.templateId],
      references: [notificationTemplates.id],
    }),
    createdBy: one(users, {
      fields: [notificationBatches.createdBy],
      references: [users.id],
    }),
    notifications: many(notificationsEnhanced),
  }),
);
