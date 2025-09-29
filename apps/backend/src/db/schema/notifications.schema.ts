import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

export const notificationTypeEnum = pgEnum('notification_type', [
  'info',
  'warning',
  'error',
  'success',
  'achievement',
  'reminder',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').default('info').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    metadata: jsonb('metadata').default({}).$type<{
      [key: string]: any;
      actionUrl?: string;
      actionText?: string;
      icon?: string;
      priority?: 'low' | 'medium' | 'high';
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    typeIdx: index('notifications_type_idx').on(table.type),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
    userReadIdx: index('notifications_user_read_idx').on(
      table.userId,
      table.isRead,
    ),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
