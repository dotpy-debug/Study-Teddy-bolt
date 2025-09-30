import { pgTable, uuid, text, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profiles } from './profiles.schema';
import { subjects } from './subjects.schema';
import { studySessions } from './sessions.schema';
import { flashcardDecks } from './flashcards.schema';
import { assignments } from './assignments.schema';
import { userAchievements } from './achievements.schema';
// Import studyGoals and studyStreaks from achievements - handled in relations
import { notifications } from './notifications.schema';

export const authProviderEnum = pgEnum('auth_provider', ['local', 'google']);
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').default('student').notNull(),
    authProvider: authProviderEnum('auth_provider').default('local').notNull(),
    googleId: text('google_id').unique(),
    refreshToken: text('refresh_token'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    resetPasswordToken: text('reset_password_token'),
    resetPasswordExpires: timestamp('reset_password_expires'),
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerificationToken: text('email_verification_token'),
    lastLoginAt: timestamp('last_login_at'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    googleIdIdx: index('users_google_id_idx').on(table.googleId),
    roleIdx: index('users_role_idx').on(table.role),
    activeIdx: index('users_active_idx').on(table.isActive),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  subjects: many(subjects),
  studySessions: many(studySessions),
  flashcardDecks: many(flashcardDecks),
  assignments: many(assignments),
  userAchievements: many(userAchievements),
  // studyGoals: many(studyGoals), // Moved to achievements.schema.ts to avoid circular imports
  // studyStreaks: many(studyStreaks), // Moved to achievements.schema.ts to avoid circular imports
  notifications: many(notifications),
}));
