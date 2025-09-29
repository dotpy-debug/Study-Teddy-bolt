import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { studySessions } from './sessions.schema';
import { assignments } from './assignments.schema';
import { flashcardDecks } from './flashcards.schema';

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').default('#4F46E5'),
    icon: text('icon'),
    description: text('description'),
    targetGrade: text('target_grade'),
    weeklyHours: integer('weekly_hours').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('subjects_user_id_idx').on(table.userId),
    nameIdx: index('subjects_name_idx').on(table.name),
  }),
);

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
  }),
  studySessions: many(studySessions),
  assignments: many(assignments),
  flashcardDecks: many(flashcardDecks),
}));
