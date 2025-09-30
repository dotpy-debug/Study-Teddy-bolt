import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  index,
  jsonb,
  varchar,
  uniqueIndex,
  decimal,
  real,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Enums
// ============================================
export const authProviderEnum = pgEnum('auth_provider', ['local', 'google']);
export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const goalTypeEnum = pgEnum('goal_type', ['daily', 'weekly', 'monthly', 'custom']);
export const goalStatusEnum = pgEnum('goal_status', ['active', 'completed', 'expired']);
export const calendarProviderEnum = pgEnum('calendar_provider', ['google', 'outlook', 'apple']);
export const syncStatusEnum = pgEnum('sync_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);
export const syncOperationEnum = pgEnum('sync_operation', ['create', 'update', 'delete', 'fetch']);
export const conflictResolutionEnum = pgEnum('conflict_resolution', [
  'local_wins',
  'remote_wins',
  'manual',
]);
export const eventStatusEnum = pgEnum('event_status', ['tentative', 'confirmed', 'cancelled']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'reminder',
  'achievement',
  'system',
  'ai_suggestion',
]);
export const notificationPriorityEnum = pgEnum('notification_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);
export const notificationChannelEnum = pgEnum('notification_channel', ['in_app', 'email', 'push']);
export const aiActionTypeEnum = pgEnum('ai_action_type', [
  'chat',
  'task_generation',
  'study_suggestion',
  'quiz',
  'explanation',
]);

// ============================================
// Users Table (Better Auth compatible)
// ============================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'), // Nullable for OAuth users
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    authProvider: authProviderEnum('auth_provider').default('local').notNull(),
    googleId: text('google_id').unique(),

    // Email verification
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerificationToken: text('email_verification_token'),
    emailVerifiedAt: timestamp('email_verified_at'),

    // Password reset
    resetPasswordToken: text('reset_password_token'),
    resetPasswordExpires: timestamp('reset_password_expires'),
    lastPasswordResetRequest: timestamp('last_password_reset_request'),

    // User preferences
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    locale: varchar('locale', { length: 10 }).default('en').notNull(),

    // Subscription/limits (for future expansion)
    planType: varchar('plan_type', { length: 50 }).default('free').notNull(),
    aiCreditsRemaining: integer('ai_credits_remaining').default(100).notNull(),
    aiCreditsResetAt: timestamp('ai_credits_reset_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    googleIdIdx: index('users_google_id_idx').on(table.googleId),
    authProviderIdx: index('users_auth_provider_idx').on(table.authProvider),
    resetPasswordTokenIdx: index('users_reset_password_token_idx').on(table.resetPasswordToken),
  }),
);

// ============================================
// Subjects Table
// ============================================
export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Basic info
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }).notNull(), // HEX color code
    icon: varchar('icon', { length: 50 }), // Icon name/identifier
    description: text('description'),

    // Resources and materials
    resources: jsonb('resources').$type<{
      links?: Array<{ title: string; url: string; description?: string }>;
      files?: Array<{
        name: string;
        url: string;
        size?: number;
        type?: string;
      }>;
      notes?: string;
    }>(),

    // Settings
    isArchived: boolean('is_archived').default(false).notNull(),

    // Study tracking
    totalStudyMinutes: integer('total_study_minutes').default(0).notNull(),
    lastStudiedAt: timestamp('last_studied_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('subjects_user_id_idx').on(table.userId),
    nameIdx: index('subjects_name_idx').on(table.name),
    archivedIdx: index('subjects_archived_idx').on(table.isArchived),
    // Unique constraint: subject name per user
    uniqueUserSubject: uniqueIndex('unique_user_subject').on(table.userId, table.name),
  }),
);

// ============================================
// Tasks Table
// ============================================
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),

    // Basic info
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // Status and priority
    status: taskStatusEnum('status').default('pending').notNull(),
    priority: taskPriorityEnum('priority').default('medium').notNull(),

    // Dates
    dueDate: timestamp('due_date'),
    completedAt: timestamp('completed_at'),

    // Time estimation
    estimatedMinutes: integer('estimated_minutes'),
    actualMinutes: integer('actual_minutes').default(0).notNull(),

    // Recurrence (for future implementation)
    isRecurring: boolean('is_recurring').default(false).notNull(),
    recurrencePattern: jsonb('recurrence_pattern').$type<{
      frequency?: 'daily' | 'weekly' | 'monthly';
      interval?: number;
      daysOfWeek?: number[];
      endDate?: string;
    }>(),

    // AI generated
    aiGenerated: boolean('ai_generated').default(false).notNull(),
    aiMetadata: jsonb('ai_metadata').$type<{
      model?: string;
      prompt?: string;
      confidence?: number;
    }>(),

    // Progress tracking
    progressPercentage: integer('progress_percentage').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('tasks_user_id_idx').on(table.userId),
    subjectIdIdx: index('tasks_subject_id_idx').on(table.subjectId),
    statusIdx: index('tasks_status_idx').on(table.status),
    dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
    priorityIdx: index('tasks_priority_idx').on(table.priority),
    createdAtIdx: index('tasks_created_at_idx').on(table.createdAt),
  }),
);

// ============================================
// Subtasks Table
// ============================================
export const subtasks = pgTable(
  'subtasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),

    // Basic info
    title: varchar('title', { length: 255 }).notNull(),
    completed: boolean('completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),

    // Order
    order: integer('order').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    taskIdIdx: index('subtasks_task_id_idx').on(table.taskId),
    orderIdx: index('subtasks_order_idx').on(table.order),
  }),
);

// ============================================
// Focus Sessions Table
// ============================================
export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }), // Nullable
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }), // Nullable

    // Session details
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    durationMinutes: integer('duration_minutes'),

    // Pomodoro tracking
    pomodoroCount: integer('pomodoro_count').default(0).notNull(),
    breakMinutes: integer('break_minutes').default(0).notNull(),

    // Session quality
    focusScore: integer('focus_score'), // 0-100, calculated based on interruptions
    notes: text('notes'),

    // Interruptions/pauses
    pauseCount: integer('pause_count').default(0).notNull(),
    totalPauseMinutes: integer('total_pause_minutes').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('focus_sessions_user_id_idx').on(table.userId),
    taskIdIdx: index('focus_sessions_task_id_idx').on(table.taskId),
    subjectIdIdx: index('focus_sessions_subject_id_idx').on(table.subjectId),
    startTimeIdx: index('focus_sessions_start_time_idx').on(table.startTime),
    createdAtIdx: index('focus_sessions_created_at_idx').on(table.createdAt),
  }),
);

// ============================================
// Focus Presets Table
// ============================================
export const focusPresets = pgTable(
  'focus_presets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Preset info
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Timer settings
    focusDurationMinutes: integer('focus_duration_minutes').notNull().default(25),
    shortBreakMinutes: integer('short_break_minutes').notNull().default(5),
    longBreakMinutes: integer('long_break_minutes').notNull().default(15),
    sessionsBeforeLongBreak: integer('sessions_before_long_break').notNull().default(4),

    // Audio/visual settings
    soundEnabled: boolean('sound_enabled').default(true).notNull(),
    soundVolume: integer('sound_volume').default(50).notNull(), // 0-100
    notificationEnabled: boolean('notification_enabled').default(true).notNull(),

    // Auto-start settings
    autoStartBreaks: boolean('auto_start_breaks').default(false).notNull(),
    autoStartFocus: boolean('auto_start_focus').default(false).notNull(),

    // Default preset
    isDefault: boolean('is_default').default(false).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('focus_presets_user_id_idx').on(table.userId),
    defaultIdx: index('focus_presets_default_idx').on(table.isDefault),
  }),
);

// ============================================
// Goals Table
// ============================================
export const goals = pgTable(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Goal info
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: goalTypeEnum('type').notNull(),
    status: goalStatusEnum('status').default('active').notNull(),

    // Target metrics
    targetValue: integer('target_value').notNull(), // e.g., 120 minutes, 5 tasks
    currentValue: integer('current_value').default(0).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(), // 'minutes', 'tasks', 'sessions'

    // Period
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),

    // Progress tracking
    progressPercentage: integer('progress_percentage').default(0).notNull(),
    lastProgressUpdate: timestamp('last_progress_update'),
    completedAt: timestamp('completed_at'),

    // Streak tracking (for daily goals)
    currentStreak: integer('current_streak').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    lastStreakDate: timestamp('last_streak_date'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('goals_user_id_idx').on(table.userId),
    statusIdx: index('goals_status_idx').on(table.status),
    typeIdx: index('goals_type_idx').on(table.type),
    endDateIdx: index('goals_end_date_idx').on(table.endDate),
  }),
);

// ============================================
// Calendar Accounts Table
// ============================================
export const calendarAccounts = pgTable(
  'calendar_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Account info
    provider: calendarProviderEnum('provider').notNull(),
    accountEmail: varchar('account_email', { length: 255 }).notNull(),
    accountName: varchar('account_name', { length: 255 }),

    // OAuth tokens
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),

    // Sync settings
    syncEnabled: boolean('sync_enabled').default(true).notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    syncError: text('sync_error'),

    // Calendar IDs for selective sync
    calendarIds: jsonb('calendar_ids').$type<string[]>(),

    // Settings
    isPrimary: boolean('is_primary').default(false).notNull(),
    colorMapping: jsonb('color_mapping').$type<Record<string, string>>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('calendar_accounts_user_id_idx').on(table.userId),
    providerIdx: index('calendar_accounts_provider_idx').on(table.provider),
    syncEnabledIdx: index('calendar_accounts_sync_enabled_idx').on(table.syncEnabled),
  }),
);

// ============================================
// Google Calendar Tokens Table
// ============================================
export const googleCalendarTokens = pgTable(
  'google_calendar_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // OAuth tokens
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    tokenType: varchar('token_type', { length: 50 }).default('Bearer').notNull(),
    scope: text('scope').notNull(),

    // Token expiration
    expiresAt: timestamp('expires_at').notNull(),
    issuedAt: timestamp('issued_at').defaultNow().notNull(),

    // Google profile info
    googleEmail: varchar('google_email', { length: 255 }).notNull(),
    googleName: varchar('google_name', { length: 255 }),

    // Sync settings
    syncEnabled: boolean('sync_enabled').default(true).notNull(),
    lastTokenRefresh: timestamp('last_token_refresh'),
    tokenRefreshCount: integer('token_refresh_count').default(0).notNull(),

    // Error tracking
    lastError: text('last_error'),
    errorCount: integer('error_count').default(0).notNull(),
    lastErrorAt: timestamp('last_error_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('google_calendar_tokens_user_id_idx').on(table.userId),
    googleEmailIdx: index('google_calendar_tokens_google_email_idx').on(table.googleEmail),
    expiresAtIdx: index('google_calendar_tokens_expires_at_idx').on(table.expiresAt),
    syncEnabledIdx: index('google_calendar_tokens_sync_enabled_idx').on(table.syncEnabled),
    uniqueUserGoogle: uniqueIndex('unique_user_google_token').on(table.userId, table.googleEmail),
  }),
);

// ============================================
// Calendar Events Table
// ============================================
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calendarAccountId: uuid('calendar_account_id').references(() => calendarAccounts.id, {
      onDelete: 'cascade',
    }),

    // Event details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 500 }),

    // Time details
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    isAllDay: boolean('is_all_day').default(false).notNull(),
    timezone: varchar('timezone', { length: 100 }),

    // Event status
    status: eventStatusEnum('status').default('confirmed').notNull(),
    visibility: varchar('visibility', { length: 50 }).default('default'),

    // Google Calendar specific fields
    googleEventId: varchar('google_event_id', { length: 255 }),
    googleCalendarId: varchar('google_calendar_id', { length: 255 }),
    googleHtmlLink: text('google_html_link'),
    googleHangoutLink: text('google_hangout_link'),
    googleICalUID: varchar('google_ical_uid', { length: 255 }),
    googleSequence: integer('google_sequence').default(0),
    googleEtag: varchar('google_etag', { length: 255 }),

    // Recurrence
    isRecurring: boolean('is_recurring').default(false).notNull(),
    recurrenceRule: text('recurrence_rule'), // RRULE format
    recurrenceExceptions: jsonb('recurrence_exceptions').$type<string[]>(), // Array of exception dates
    originalEventId: uuid('original_event_id'),

    // Attendees
    attendees: jsonb('attendees').$type<
      Array<{
        email: string;
        displayName?: string;
        responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
        organizer?: boolean;
        self?: boolean;
      }>
    >(),

    // Reminders
    useDefaultReminders: boolean('use_default_reminders').default(true).notNull(),
    overrideReminders: jsonb('override_reminders').$type<
      Array<{
        method: 'email' | 'popup';
        minutes: number;
      }>
    >(),

    // Study Teddy specific
    taskId: uuid('task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    isStudyBlock: boolean('is_study_block').default(false).notNull(),
    studyDuration: integer('study_duration'), // Planned study duration in minutes
    actualStudyDuration: integer('actual_study_duration'), // Actual time spent studying

    // Sync metadata
    lastSyncAt: timestamp('last_sync_at'),
    syncHash: varchar('sync_hash', { length: 64 }), // Hash of event data for change detection
    locallyModified: boolean('locally_modified').default(false).notNull(),
    conflictDetected: boolean('conflict_detected').default(false).notNull(),
    conflictData: jsonb('conflict_data').$type<{
      localVersion?: any;
      remoteVersion?: any;
      conflictType?: string;
      resolvedAt?: string;
      resolution?: string;
    }>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'), // Soft delete for sync purposes
  },
  (table) => ({
    userIdIdx: index('calendar_events_user_id_idx').on(table.userId),
    calendarAccountIdIdx: index('calendar_events_calendar_account_id_idx').on(
      table.calendarAccountId,
    ),
    googleEventIdIdx: index('calendar_events_google_event_id_idx').on(table.googleEventId),
    googleCalendarIdIdx: index('calendar_events_google_calendar_id_idx').on(table.googleCalendarId),
    startTimeIdx: index('calendar_events_start_time_idx').on(table.startTime),
    endTimeIdx: index('calendar_events_end_time_idx').on(table.endTime),
    taskIdIdx: index('calendar_events_task_id_idx').on(table.taskId),
    subjectIdIdx: index('calendar_events_subject_id_idx').on(table.subjectId),
    isStudyBlockIdx: index('calendar_events_is_study_block_idx').on(table.isStudyBlock),
    lastSyncAtIdx: index('calendar_events_last_sync_at_idx').on(table.lastSyncAt),
    deletedAtIdx: index('calendar_events_deleted_at_idx').on(table.deletedAt),
    conflictDetectedIdx: index('calendar_events_conflict_detected_idx').on(table.conflictDetected),
    uniqueGoogleEvent: uniqueIndex('unique_google_event').on(
      table.googleEventId,
      table.googleCalendarId,
    ),
  }),
);

// ============================================
// Calendar Sync Logs Table
// ============================================
export const calendarSyncLogs = pgTable(
  'calendar_sync_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calendarAccountId: uuid('calendar_account_id').references(() => calendarAccounts.id, {
      onDelete: 'cascade',
    }),

    // Sync details
    syncId: uuid('sync_id').notNull(), // Groups related log entries
    operation: syncOperationEnum('operation').notNull(),
    status: syncStatusEnum('status').notNull(),

    // Timing
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),

    // Sync scope
    syncType: varchar('sync_type', { length: 50 }).notNull(), // 'full', 'incremental', 'single_event'
    calendarIds: jsonb('calendar_ids').$type<string[]>(), // Which calendars were synced
    syncToken: varchar('sync_token', { length: 500 }), // Google's sync token for incremental sync
    nextSyncToken: varchar('next_sync_token', { length: 500 }), // Token for next sync

    // Results
    eventsProcessed: integer('events_processed').default(0).notNull(),
    eventsCreated: integer('events_created').default(0).notNull(),
    eventsUpdated: integer('events_updated').default(0).notNull(),
    eventsDeleted: integer('events_deleted').default(0).notNull(),
    conflictsDetected: integer('conflicts_detected').default(0).notNull(),
    errorsEncountered: integer('errors_encountered').default(0).notNull(),

    // Error details
    errorMessage: text('error_message'),
    errorCode: varchar('error_code', { length: 100 }),
    errorDetails: jsonb('error_details').$type<{
      stack?: string;
      requestId?: string;
      retryAttempt?: number;
      lastHttpStatus?: number;
    }>(),

    // Progress tracking
    progressPercentage: integer('progress_percentage').default(0).notNull(),
    currentStep: varchar('current_step', { length: 100 }),

    // Metadata
    metadata: jsonb('metadata').$type<{
      triggerSource?: 'manual' | 'scheduled' | 'webhook' | 'initial';
      batchSize?: number;
      retryCount?: number;
      webhookId?: string;
    }>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('calendar_sync_logs_user_id_idx').on(table.userId),
    calendarAccountIdIdx: index('calendar_sync_logs_calendar_account_id_idx').on(
      table.calendarAccountId,
    ),
    syncIdIdx: index('calendar_sync_logs_sync_id_idx').on(table.syncId),
    statusIdx: index('calendar_sync_logs_status_idx').on(table.status),
    operationIdx: index('calendar_sync_logs_operation_idx').on(table.operation),
    startedAtIdx: index('calendar_sync_logs_started_at_idx').on(table.startedAt),
    syncTypeIdx: index('calendar_sync_logs_sync_type_idx').on(table.syncType),
    createdAtIdx: index('calendar_sync_logs_created_at_idx').on(table.createdAt),
  }),
);

// ============================================
// Calendar Mappings Table
// ============================================
export const calendarMappings = pgTable(
  'calendar_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calendarAccountId: uuid('calendar_account_id')
      .notNull()
      .references(() => calendarAccounts.id, { onDelete: 'cascade' }),

    // Google Calendar details
    googleCalendarId: varchar('google_calendar_id', { length: 255 }).notNull(),
    googleCalendarName: varchar('google_calendar_name', {
      length: 255,
    }).notNull(),
    googleCalendarDescription: text('google_calendar_description'),
    googleCalendarTimezone: varchar('google_calendar_timezone', {
      length: 100,
    }),
    googleCalendarColorId: varchar('google_calendar_color_id', { length: 50 }),
    googleCalendarBackgroundColor: varchar('google_calendar_background_color', {
      length: 7,
    }),
    googleCalendarForegroundColor: varchar('google_calendar_foreground_color', {
      length: 7,
    }),

    // Access and permissions
    googleAccessRole: varchar('google_access_role', { length: 50 }), // 'owner', 'reader', 'writer', 'freeBusyReader'
    isPrimary: boolean('is_primary').default(false).notNull(),
    isSelected: boolean('is_selected').default(false).notNull(), // Whether to include in default queries

    // Sync preferences
    syncEnabled: boolean('sync_enabled').default(true).notNull(),
    syncDirection: varchar('sync_direction', { length: 50 }).default('bidirectional').notNull(), // 'read_only', 'write_only', 'bidirectional'

    // Study Teddy mappings
    defaultSubjectId: uuid('default_subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    autoCreateTasks: boolean('auto_create_tasks').default(false).notNull(),
    studyBlockDetection: boolean('study_block_detection').default(true).notNull(),

    // Conflict resolution preferences
    conflictResolution: conflictResolutionEnum('conflict_resolution').default('manual').notNull(),

    // Custom mappings
    eventTitleMappings: jsonb('event_title_mappings').$type<
      Array<{
        pattern: string; // Regex pattern
        subjectId?: string;
        autoCreateTask?: boolean;
      }>
    >(),

    colorMappings: jsonb('color_mappings').$type<
      Array<{
        googleColorId: string;
        subjectId?: string;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
      }>
    >(),

    // Sync metadata
    lastSyncAt: timestamp('last_sync_at'),
    lastSyncToken: varchar('last_sync_token', { length: 500 }),
    nextPageToken: varchar('next_page_token', { length: 500 }),

    // Error tracking
    lastError: text('last_error'),
    errorCount: integer('error_count').default(0).notNull(),
    lastErrorAt: timestamp('last_error_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('calendar_mappings_user_id_idx').on(table.userId),
    calendarAccountIdIdx: index('calendar_mappings_calendar_account_id_idx').on(
      table.calendarAccountId,
    ),
    googleCalendarIdIdx: index('calendar_mappings_google_calendar_id_idx').on(
      table.googleCalendarId,
    ),
    syncEnabledIdx: index('calendar_mappings_sync_enabled_idx').on(table.syncEnabled),
    isPrimaryIdx: index('calendar_mappings_is_primary_idx').on(table.isPrimary),
    isSelectedIdx: index('calendar_mappings_is_selected_idx').on(table.isSelected),
    defaultSubjectIdIdx: index('calendar_mappings_default_subject_id_idx').on(
      table.defaultSubjectId,
    ),
    lastSyncAtIdx: index('calendar_mappings_last_sync_at_idx').on(table.lastSyncAt),
    uniqueUserCalendar: uniqueIndex('unique_user_calendar_mapping').on(
      table.userId,
      table.googleCalendarId,
    ),
  }),
);

// Calendar Tokens Table (Unified token storage)
export const calendarTokens = pgTable(
  'calendar_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: calendarProviderEnum('provider').default('google').notNull(),

    // Token data
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('calendar_tokens_user_id_idx').on(table.userId),
    providerIdx: index('calendar_tokens_provider_idx').on(table.provider),
    expiryDateIdx: index('calendar_tokens_expiry_date_idx').on(table.expiryDate),
    uniqueUserProvider: uniqueIndex('unique_user_provider_token').on(table.userId, table.provider),
  }),
);

// Calendar Notifications Table (Webhook/Watch channel settings)
export const calendarNotifications = pgTable(
  'calendar_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: varchar('channel_id', { length: 255 }).notNull().unique(),
    resourceId: varchar('resource_id', { length: 255 }).notNull(),
    calendarId: varchar('calendar_id', { length: 255 }).notNull(),
    webhookUrl: text('webhook_url').notNull(),
    expiration: timestamp('expiration', { withTimezone: true }).notNull(),
    active: boolean('active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('calendar_notifications_user_id_idx').on(table.userId),
    channelIdIdx: index('calendar_notifications_channel_id_idx').on(table.channelId),
    calendarIdIdx: index('calendar_notifications_calendar_id_idx').on(table.calendarId),
    activeIdx: index('calendar_notifications_active_idx').on(table.active),
    expirationIdx: index('calendar_notifications_expiration_idx').on(table.expiration),
  }),
);

// ============================================
// Notifications Table
// ============================================
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Notification content
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    priority: notificationPriorityEnum('priority').default('medium').notNull(),

    // Status
    read: boolean('read').default(false).notNull(),
    readAt: timestamp('read_at'),
    dismissed: boolean('dismissed').default(false).notNull(),
    dismissedAt: timestamp('dismissed_at'),

    // Related entities
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'cascade' }),

    // Action
    actionUrl: varchar('action_url', { length: 500 }),
    actionLabel: varchar('action_label', { length: 100 }),

    // Delivery
    channel: notificationChannelEnum('channel').default('in_app').notNull(),
    emailSent: boolean('email_sent').default(false).notNull(),
    pushSent: boolean('push_sent').default(false).notNull(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    // Scheduling
    scheduledFor: timestamp('scheduled_for'),
    sentAt: timestamp('sent_at'),
    expiresAt: timestamp('expires_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    readIdx: index('notifications_read_idx').on(table.read),
    typeIdx: index('notifications_type_idx').on(table.type),
    scheduledForIdx: index('notifications_scheduled_for_idx').on(table.scheduledFor),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  }),
);

// ============================================
// AI Usage Log Table
// ============================================
export const aiUsageLog = pgTable(
  'ai_usage_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Action details
    actionType: aiActionTypeEnum('action_type').notNull(),

    // Request/Response
    prompt: text('prompt').notNull(),
    response: text('response').notNull(),

    // Related entities
    taskId: uuid('task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),

    // Model details
    model: varchar('model', { length: 50 }).notNull(),
    temperature: real('temperature'),
    maxTokens: integer('max_tokens'),

    // Usage metrics
    promptTokens: integer('prompt_tokens').notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),

    // Cost tracking
    costInCents: decimal('cost_in_cents', { precision: 10, scale: 4 }),

    // Performance
    responseTimeMs: integer('response_time_ms'),

    // Quality tracking
    userRating: integer('user_rating'), // 1-5 stars
    userFeedback: text('user_feedback'),

    // Error handling
    error: text('error'),
    retryCount: integer('retry_count').default(0).notNull(),

    // Metadata
    metadata: jsonb('metadata').$type<{
      sessionId?: string;
      context?: any;
      features?: string[];
    }>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('ai_usage_log_user_id_idx').on(table.userId),
    actionTypeIdx: index('ai_usage_log_action_type_idx').on(table.actionType),
    taskIdIdx: index('ai_usage_log_task_id_idx').on(table.taskId),
    createdAtIdx: index('ai_usage_log_created_at_idx').on(table.createdAt),
    modelIdx: index('ai_usage_log_model_idx').on(table.model),
  }),
);

// ============================================
// Better Auth Tables
// ============================================

// Better Auth User table (separate from application users table)
export const betterAuthUser = pgTable('better_auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Better Auth Session table
export const betterAuthSession = pgTable('better_auth_session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').unique().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
});

// Better Auth Account table
export const betterAuthAccount = pgTable(
  'better_auth_account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.providerId, table.accountId],
    }),
  }),
);

// Better Auth Verification table
export const betterAuthVerification = pgTable('better_auth_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

// ============================================
// Legacy Refresh Tokens Table (keeping for backward compatibility)
// ============================================
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),

    // Device tracking
    deviceId: varchar('device_id', { length: 255 }),
    deviceName: varchar('device_name', { length: 255 }),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible

    // Security
    revokedAt: timestamp('revoked_at'),
    revokedReason: varchar('revoked_reason', { length: 255 }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => ({
    tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
    revokedAtIdx: index('refresh_tokens_revoked_at_idx').on(table.revokedAt),
  }),
);

// ============================================
// Notification Preferences Table
// ============================================
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Channel preferences
    emailEnabled: boolean('email_enabled').default(true).notNull(),
    pushEnabled: boolean('push_enabled').default(true).notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),

    // Email notification type preferences
    emailWelcomeEnabled: boolean('email_welcome_enabled').default(true).notNull(),
    emailVerificationEnabled: boolean('email_verification_enabled').default(true).notNull(),
    emailPasswordResetEnabled: boolean('email_password_reset_enabled').default(true).notNull(),
    emailTaskRemindersEnabled: boolean('email_task_reminders_enabled').default(true).notNull(),
    emailWeeklyDigestEnabled: boolean('email_weekly_digest_enabled').default(true).notNull(),
    emailFocusSessionAlertsEnabled: boolean('email_focus_session_alerts_enabled')
      .default(true)
      .notNull(),
    emailAchievementsEnabled: boolean('email_achievements_enabled').default(true).notNull(),

    // Notification type preferences (in-app)
    taskReminders: boolean('task_reminders').default(true).notNull(),
    goalReminders: boolean('goal_reminders').default(true).notNull(),
    achievements: boolean('achievements').default(true).notNull(),
    aiSuggestions: boolean('ai_suggestions').default(true).notNull(),
    systemAlerts: boolean('system_alerts').default(true).notNull(),

    // Timing preferences
    reminderLeadTimeMinutes: integer('reminder_lead_time_minutes').default(15).notNull(),
    dailySummaryEnabled: boolean('daily_summary_enabled').default(true).notNull(),
    dailySummaryTime: varchar('daily_summary_time', { length: 5 }).default('08:00'), // HH:MM format
    weeklyDigestEnabled: boolean('weekly_digest_enabled').default(true).notNull(),
    weeklyDigestDay: integer('weekly_digest_day').default(1).notNull(), // 1 = Monday
    weeklyDigestTime: varchar('weekly_digest_time', { length: 5 }).default('08:00'), // HH:MM format

    // Quiet hours
    quietHoursEnabled: boolean('quiet_hours_enabled').default(true).notNull(),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }).default('22:00'), // HH:MM format
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }).default('08:00'), // HH:MM format
    quietHoursTimezone: varchar('quiet_hours_timezone', { length: 50 }).default('UTC').notNull(),

    // Frequency settings
    reminderFrequency: varchar('reminder_frequency', { length: 20 }).default('immediate').notNull(), // immediate, daily, weekly
    digestFrequency: varchar('digest_frequency', { length: 20 }).default('weekly').notNull(), // daily, weekly, monthly

    // Sound preferences
    soundEnabled: boolean('sound_enabled').default(true).notNull(),
    soundVolume: integer('sound_volume').default(50).notNull(), // 0-100

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notification_preferences_user_id_idx').on(table.userId),
  }),
);

// ============================================
// Email Delivery Log Table
// ============================================
export const emailDeliveryStatusEnum = pgEnum('email_delivery_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'complained',
]);
export const emailTypeEnum = pgEnum('email_type', [
  'welcome',
  'verification',
  'password_reset',
  'task_reminder',
  'weekly_digest',
  'focus_session_alert',
  'achievement',
]);

export const emailDeliveryLog = pgTable(
  'email_delivery_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Email details
    emailType: emailTypeEnum('email_type').notNull(),
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),

    // Delivery tracking
    status: emailDeliveryStatusEnum('status').default('pending').notNull(),
    resendId: varchar('resend_id', { length: 100 }), // Resend email ID

    // Related entities
    taskId: uuid('task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    notificationId: uuid('notification_id').references(() => notifications.id, {
      onDelete: 'set null',
    }),

    // Content metadata
    templateUsed: varchar('template_used', { length: 100 }),
    templateData: jsonb('template_data').$type<Record<string, any>>(),

    // Delivery details
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    failedAt: timestamp('failed_at'),
    errorMessage: text('error_message'),

    // Engagement tracking
    openedAt: timestamp('opened_at'),
    clickedAt: timestamp('clicked_at'),
    unsubscribedAt: timestamp('unsubscribed_at'),

    // Retry logic
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    nextRetryAt: timestamp('next_retry_at'),

    // Queue metadata
    queuedAt: timestamp('queued_at').defaultNow().notNull(),
    priority: integer('priority').default(50).notNull(), // 0-100, higher = more priority

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('email_delivery_log_user_id_idx').on(table.userId),
    statusIdx: index('email_delivery_log_status_idx').on(table.status),
    emailTypeIdx: index('email_delivery_log_email_type_idx').on(table.emailType),
    resendIdIdx: index('email_delivery_log_resend_id_idx').on(table.resendId),
    nextRetryAtIdx: index('email_delivery_log_next_retry_at_idx').on(table.nextRetryAt),
    createdAtIdx: index('email_delivery_log_created_at_idx').on(table.createdAt),
  }),
);

// ============================================
// Relations
// ============================================

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  subjects: many(subjects),
  tasks: many(tasks),
  focusSessions: many(focusSessions),
  focusPresets: many(focusPresets),
  goals: many(goals),
  calendarAccounts: many(calendarAccounts),
  googleCalendarTokens: many(googleCalendarTokens),
  calendarEvents: many(calendarEvents),
  calendarSyncLogs: many(calendarSyncLogs),
  calendarMappings: many(calendarMappings),
  notifications: many(notifications),
  aiUsageLogs: many(aiUsageLog),
  refreshTokens: many(refreshTokens),
  notificationPreferences: one(notificationPreferences),
  emailDeliveryLogs: many(emailDeliveryLog),
}));

// Subject relations
export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  focusSessions: many(focusSessions),
  aiUsageLogs: many(aiUsageLog),
}));

// Task relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [tasks.subjectId],
    references: [subjects.id],
  }),
  subtasks: many(subtasks),
  focusSessions: many(focusSessions),
  notifications: many(notifications),
  aiUsageLogs: many(aiUsageLog),
}));

// Subtask relations
export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, {
    fields: [subtasks.taskId],
    references: [tasks.id],
  }),
}));

// Focus session relations
export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  user: one(users, {
    fields: [focusSessions.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [focusSessions.taskId],
    references: [tasks.id],
  }),
  subject: one(subjects, {
    fields: [focusSessions.subjectId],
    references: [subjects.id],
  }),
}));

// Focus preset relations
export const focusPresetsRelations = relations(focusPresets, ({ one }) => ({
  user: one(users, {
    fields: [focusPresets.userId],
    references: [users.id],
  }),
}));

// Goal relations
export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  notifications: many(notifications),
}));

// Calendar account relations
export const calendarAccountsRelations = relations(calendarAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarAccounts.userId],
    references: [users.id],
  }),
  calendarEvents: many(calendarEvents),
  calendarMappings: many(calendarMappings),
  calendarSyncLogs: many(calendarSyncLogs),
}));

// Google Calendar tokens relations
export const googleCalendarTokensRelations = relations(googleCalendarTokens, ({ one }) => ({
  user: one(users, {
    fields: [googleCalendarTokens.userId],
    references: [users.id],
  }),
}));

// Calendar events relations
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  calendarAccount: one(calendarAccounts, {
    fields: [calendarEvents.calendarAccountId],
    references: [calendarAccounts.id],
  }),
  task: one(tasks, {
    fields: [calendarEvents.taskId],
    references: [tasks.id],
  }),
  subject: one(subjects, {
    fields: [calendarEvents.subjectId],
    references: [subjects.id],
  }),
  originalEvent: one(calendarEvents, {
    fields: [calendarEvents.originalEventId],
    references: [calendarEvents.id],
  }),
}));

// Calendar sync logs relations
export const calendarSyncLogsRelations = relations(calendarSyncLogs, ({ one }) => ({
  user: one(users, {
    fields: [calendarSyncLogs.userId],
    references: [users.id],
  }),
  calendarAccount: one(calendarAccounts, {
    fields: [calendarSyncLogs.calendarAccountId],
    references: [calendarAccounts.id],
  }),
}));

// Calendar mappings relations
export const calendarMappingsRelations = relations(calendarMappings, ({ one }) => ({
  user: one(users, {
    fields: [calendarMappings.userId],
    references: [users.id],
  }),
  calendarAccount: one(calendarAccounts, {
    fields: [calendarMappings.calendarAccountId],
    references: [calendarAccounts.id],
  }),
  defaultSubject: one(subjects, {
    fields: [calendarMappings.defaultSubjectId],
    references: [subjects.id],
  }),
}));

// Calendar tokens relations
export const calendarTokensRelations = relations(calendarTokens, ({ one }) => ({
  user: one(users, {
    fields: [calendarTokens.userId],
    references: [users.id],
  }),
}));

// Calendar notifications relations
export const calendarNotificationsRelations = relations(calendarNotifications, ({ one }) => ({
  user: one(users, {
    fields: [calendarNotifications.userId],
    references: [users.id],
  }),
}));

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [notifications.taskId],
    references: [tasks.id],
  }),
  goal: one(goals, {
    fields: [notifications.goalId],
    references: [goals.id],
  }),
}));

// AI usage log relations
export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLog.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [aiUsageLog.taskId],
    references: [tasks.id],
  }),
  subject: one(subjects, {
    fields: [aiUsageLog.subjectId],
    references: [subjects.id],
  }),
}));

// Refresh token relations
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// Notification preferences relations
export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// Email delivery log relations
export const emailDeliveryLogRelations = relations(emailDeliveryLog, ({ one }) => ({
  user: one(users, {
    fields: [emailDeliveryLog.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [emailDeliveryLog.taskId],
    references: [tasks.id],
  }),
  notification: one(notifications, {
    fields: [emailDeliveryLog.notificationId],
    references: [notifications.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

// User types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Subject types
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

// Task types
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// Subtask types
export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;

// Focus session types
export type FocusSession = typeof focusSessions.$inferSelect;
export type NewFocusSession = typeof focusSessions.$inferInsert;

// Focus preset types
export type FocusPreset = typeof focusPresets.$inferSelect;
export type NewFocusPreset = typeof focusPresets.$inferInsert;

// Goal types
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

// Calendar account types
export type CalendarAccount = typeof calendarAccounts.$inferSelect;
export type NewCalendarAccount = typeof calendarAccounts.$inferInsert;

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// AI usage log types
export type AIUsageLog = typeof aiUsageLog.$inferSelect;
export type NewAIUsageLog = typeof aiUsageLog.$inferInsert;

// Refresh token types
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

// Notification preference types
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

// Email delivery log types
export type EmailDeliveryLog = typeof emailDeliveryLog.$inferSelect;
export type NewEmailDeliveryLog = typeof emailDeliveryLog.$inferInsert;

// Google Calendar tokens types
export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type NewGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert;

// Calendar events types
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

// Calendar sync logs types
export type CalendarSyncLog = typeof calendarSyncLogs.$inferSelect;
export type NewCalendarSyncLog = typeof calendarSyncLogs.$inferInsert;

// Calendar mappings types
export type CalendarMapping = typeof calendarMappings.$inferSelect;
export type NewCalendarMapping = typeof calendarMappings.$inferInsert;

// Calendar tokens types
export type CalendarToken = typeof calendarTokens.$inferSelect;
export type NewCalendarToken = typeof calendarTokens.$inferInsert;

// Calendar notifications types
export type CalendarNotification = typeof calendarNotifications.$inferSelect;
export type NewCalendarNotification = typeof calendarNotifications.$inferInsert;

// ============================================
// Table Aliases for Legacy Compatibility
// ============================================

// Export aiUsageLog as aiChats for backward compatibility
export const aiChats = aiUsageLog;

// Export tasks as studyTasks for backward compatibility
export const studyTasks = tasks;

// Export focusSessions as studySessions for backward compatibility
export const studySessions = focusSessions;
