import { pgTable, uuid, text, timestamp, integer, pgEnum, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { subjects } from './subjects.schema';

export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'todo',
  'in_progress',
  'review',
  'completed',
  'overdue',
]);

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    instructions: text('instructions'),
    dueDate: timestamp('due_date').notNull(),
    priority: priorityEnum('priority').default('medium').notNull(),
    status: assignmentStatusEnum('status').default('todo').notNull(),
    estimatedTime: integer('estimated_time'), // in minutes
    actualTime: integer('actual_time'), // in minutes
    grade: text('grade'),
    feedback: text('feedback'),
    completedAt: timestamp('completed_at'),
    tags: jsonb('tags').default([]).$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('assignments_user_id_idx').on(table.userId),
    subjectIdIdx: index('assignments_subject_id_idx').on(table.subjectId),
    dueDateIdx: index('assignments_due_date_idx').on(table.dueDate),
    statusIdx: index('assignments_status_idx').on(table.status),
    priorityIdx: index('assignments_priority_idx').on(table.priority),
  }),
);

export const assignmentAttachments = pgTable(
  'assignment_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size').notNull(), // in bytes
    mimeType: text('mime_type').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  },
  (table) => ({
    assignmentIdIdx: index('assignment_attachments_assignment_id_idx').on(table.assignmentId),
  }),
);

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  user: one(users, {
    fields: [assignments.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [assignments.subjectId],
    references: [subjects.id],
  }),
  attachments: many(assignmentAttachments),
}));

export const assignmentAttachmentsRelations = relations(assignmentAttachments, ({ one }) => ({
  assignment: one(assignments, {
    fields: [assignmentAttachments.assignmentId],
    references: [assignments.id],
  }),
}));
