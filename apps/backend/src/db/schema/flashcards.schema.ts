import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { subjects } from './subjects.schema';

export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);

export const flashcardDecks = pgTable(
  'flashcard_decks',
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
    tags: jsonb('tags').default([]).$type<string[]>(),
    isPublic: boolean('is_public').default(false).notNull(),
    cardCount: integer('card_count').default(0).notNull(),
    imageUrl: text('image_url'),
    clonedFromId: uuid('cloned_from_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('flashcard_decks_user_id_idx').on(table.userId),
    subjectIdIdx: index('flashcard_decks_subject_id_idx').on(table.subjectId),
    publicIdx: index('flashcard_decks_public_idx').on(table.isPublic),
  }),
);

export const flashcards = pgTable(
  'flashcards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => flashcardDecks.id, { onDelete: 'cascade' }),
    front: text('front').notNull(),
    back: text('back').notNull(),
    hint: text('hint'),
    imageUrl: text('image_url'),
    audioUrl: text('audio_url'),
    difficulty: difficultyEnum('difficulty').default('medium').notNull(),
    tags: jsonb('tags').default([]).$type<string[]>(),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    deckIdIdx: index('flashcards_deck_id_idx').on(table.deckId),
    positionIdx: index('flashcards_position_idx').on(table.position),
  }),
);

export const flashcardReviews = pgTable(
  'flashcard_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    flashcardId: uuid('flashcard_id')
      .notNull()
      .references(() => flashcards.id, { onDelete: 'cascade' }),
    quality: integer('quality').notNull(), // 0-5 rating for spaced repetition
    reviewedAt: timestamp('reviewed_at').defaultNow().notNull(),
    nextReviewDate: timestamp('next_review_date').notNull(),
    easeFactor: numeric('ease_factor', { precision: 3, scale: 2 }).default('2.5').notNull(),
    interval: integer('interval').default(1).notNull(), // days until next review
    repetitions: integer('repetitions').default(0).notNull(),
    responseTime: integer('response_time'), // in milliseconds
  },
  (table) => ({
    userIdIdx: index('flashcard_reviews_user_id_idx').on(table.userId),
    flashcardIdIdx: index('flashcard_reviews_flashcard_id_idx').on(table.flashcardId),
    nextReviewIdx: index('flashcard_reviews_next_review_idx').on(table.nextReviewDate),
  }),
);

export const flashcardDecksRelations = relations(flashcardDecks, ({ one, many }) => ({
  user: one(users, {
    fields: [flashcardDecks.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [flashcardDecks.subjectId],
    references: [subjects.id],
  }),
  flashcards: many(flashcards),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  deck: one(flashcardDecks, {
    fields: [flashcards.deckId],
    references: [flashcardDecks.id],
  }),
  reviews: many(flashcardReviews),
}));

export const flashcardReviewsRelations = relations(flashcardReviews, ({ one }) => ({
  user: one(users, {
    fields: [flashcardReviews.userId],
    references: [users.id],
  }),
  flashcard: one(flashcards, {
    fields: [flashcardReviews.flashcardId],
    references: [flashcards.id],
  }),
}));
