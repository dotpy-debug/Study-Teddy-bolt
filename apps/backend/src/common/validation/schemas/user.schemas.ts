import { z } from 'zod';
import {
  emailSchema,
  nameSchema,
  phoneSchema,
  uuidSchema,
  timezoneSchema,
  languageCodeSchema,
  urlSchema,
  tagsArraySchema,
  ageSchema,
  dateSchema,
} from './common.schemas';

// User profile update schema
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  dateOfBirth: dateSchema.optional(),
  timezone: timezoneSchema.optional(),
  language: languageCodeSchema.optional(),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  website: urlSchema.optional(),
  location: z
    .string()
    .max(100, 'Location must not exceed 100 characters')
    .optional(),
  avatar: urlSchema.optional(),
});

// User preferences schema
export const userPreferencesSchema = z.object({
  emailNotifications: z
    .object({
      studyReminders: z.boolean().default(true),
      achievementUpdates: z.boolean().default(true),
      weeklyProgress: z.boolean().default(true),
      taskDeadlines: z.boolean().default(true),
      systemUpdates: z.boolean().default(false),
      marketing: z.boolean().default(false),
    })
    .optional(),
  pushNotifications: z
    .object({
      studyReminders: z.boolean().default(true),
      achievementUpdates: z.boolean().default(true),
      taskDeadlines: z.boolean().default(true),
      breakReminders: z.boolean().default(true),
    })
    .optional(),
  studySettings: z
    .object({
      defaultStudyDuration: z.number().int().min(5).max(240).default(25), // minutes
      breakDuration: z.number().int().min(1).max(60).default(5), // minutes
      longBreakDuration: z.number().int().min(5).max(120).default(15), // minutes
      sessionsBeforeLongBreak: z.number().int().min(2).max(10).default(4),
      autoStartBreaks: z.boolean().default(false),
      autoStartSessions: z.boolean().default(false),
      soundEffects: z.boolean().default(true),
      backgroundMusic: z.boolean().default(false),
    })
    .optional(),
  privacy: z
    .object({
      profileVisibility: z
        .enum(['public', 'friends', 'private'])
        .default('private'),
      showProgress: z.boolean().default(false),
      showAchievements: z.boolean().default(false),
      allowFriendRequests: z.boolean().default(true),
    })
    .optional(),
  accessibility: z
    .object({
      highContrast: z.boolean().default(false),
      largeText: z.boolean().default(false),
      reduceMotion: z.boolean().default(false),
      screenReader: z.boolean().default(false),
    })
    .optional(),
});

// User education info schema
export const educationInfoSchema = z.object({
  educationLevel: z
    .enum([
      'high_school',
      'undergraduate',
      'graduate',
      'postgraduate',
      'professional',
      'other',
    ])
    .optional(),
  institution: z
    .string()
    .max(200, 'Institution name must not exceed 200 characters')
    .optional(),
  fieldOfStudy: z
    .string()
    .max(100, 'Field of study must not exceed 100 characters')
    .optional(),
  graduationYear: z.number().int().min(1950).max(2050).optional(),
  currentYear: z.number().int().min(1).max(10).optional(),
  studentId: z
    .string()
    .max(50, 'Student ID must not exceed 50 characters')
    .optional(),
});

// User goals schema
export const userGoalsSchema = z.object({
  goals: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        title: z.string().min(1, 'Goal title is required').max(100),
        description: z
          .string()
          .max(500, 'Description must not exceed 500 characters')
          .optional(),
        targetDate: dateSchema.optional(),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
        category: z
          .enum(['academic', 'skill', 'career', 'personal', 'other'])
          .default('academic'),
        progress: z.number().min(0).max(100).default(0),
        milestones: z
          .array(
            z.object({
              title: z.string().min(1).max(100),
              completed: z.boolean().default(false),
              completedAt: dateSchema.optional(),
            }),
          )
          .optional(),
      }),
    )
    .max(10, 'Cannot have more than 10 goals'),
});

// User achievements schema
export const userAchievementSchema = z.object({
  achievementId: uuidSchema,
  unlockedAt: dateSchema,
  progress: z.number().min(0).max(100).default(100),
});

// User statistics schema
export const userStatsSchema = z.object({
  totalStudyTime: z.number().int().min(0), // minutes
  totalSessions: z.number().int().min(0),
  currentStreak: z.number().int().min(0), // days
  longestStreak: z.number().int().min(0), // days
  averageSessionDuration: z.number().min(0), // minutes
  completedTasks: z.number().int().min(0),
  averageScore: z.number().min(0).max(100),
  subjectStats: z
    .record(
      z.string(),
      z.object({
        studyTime: z.number().int().min(0),
        sessions: z.number().int().min(0),
        averageScore: z.number().min(0).max(100),
        lastStudied: dateSchema.optional(),
      }),
    )
    .optional(),
});

// User activity schema
export const userActivitySchema = z.object({
  type: z.enum([
    'study_session',
    'task_completed',
    'achievement_unlocked',
    'goal_created',
    'goal_completed',
    'profile_updated',
    'friend_added',
    'streak_milestone',
  ]),
  description: z.string().max(200),
  metadata: z.record(z.any()).optional(),
  timestamp: dateSchema,
});

// User search schema
export const userSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  filters: z
    .object({
      educationLevel: z.array(z.string()).optional(),
      fieldOfStudy: z.array(z.string()).optional(),
      location: z.string().optional(),
      verifiedOnly: z.boolean().default(false),
    })
    .optional(),
  sort: z.enum(['relevance', 'activity', 'joined']).default('relevance'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// Friend request schema
export const friendRequestSchema = z.object({
  userId: uuidSchema,
  message: z
    .string()
    .max(200, 'Message must not exceed 200 characters')
    .optional(),
});

// Friend request response schema
export const friendRequestResponseSchema = z.object({
  requestId: uuidSchema,
  action: z.enum(['accept', 'decline']),
});

// Block user schema
export const blockUserSchema = z.object({
  userId: uuidSchema,
  reason: z
    .string()
    .max(200, 'Reason must not exceed 200 characters')
    .optional(),
});

// Report user schema
export const reportUserSchema = z.object({
  userId: uuidSchema,
  reason: z.enum([
    'spam',
    'harassment',
    'inappropriate_content',
    'fake_profile',
    'copyright_violation',
    'other',
  ]),
  description: z
    .string()
    .min(10, 'Please provide a detailed description')
    .max(500),
  evidence: z
    .array(urlSchema)
    .max(5, 'Cannot attach more than 5 evidence files')
    .optional(),
});

// User verification schema
export const userVerificationSchema = z.object({
  verificationType: z.enum(['student', 'educator', 'institution']),
  documents: z
    .array(
      z.object({
        type: z.enum([
          'student_id',
          'transcript',
          'enrollment_letter',
          'faculty_id',
          'other',
        ]),
        url: urlSchema,
        description: z.string().max(200).optional(),
      }),
    )
    .min(1, 'At least one document is required')
    .max(5),
  institutionEmail: emailSchema.optional(),
  additionalInfo: z.string().max(500).optional(),
});

// Account deletion request schema
export const accountDeletionRequestSchema = z.object({
  reason: z.enum([
    'no_longer_needed',
    'privacy_concerns',
    'switching_platforms',
    'technical_issues',
    'other',
  ]),
  feedback: z
    .string()
    .max(1000, 'Feedback must not exceed 1000 characters')
    .optional(),
  deleteData: z.boolean().refine((val) => val === true, {
    message: 'You must confirm data deletion',
  }),
  scheduledFor: dateSchema.optional(), // Allow scheduling deletion
});

// Data export request schema
export const dataExportRequestSchema = z.object({
  dataTypes: z
    .array(
      z.enum([
        'profile',
        'study_sessions',
        'tasks',
        'achievements',
        'goals',
        'notes',
        'flashcards',
        'progress',
        'friends',
        'messages',
      ]),
    )
    .min(1, 'Select at least one data type'),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  includeDeleted: z.boolean().default(false),
});

// Account recovery schema
export const accountRecoveryRequestSchema = z.object({
  email: emailSchema,
  recoveryMethod: z.enum([
    'backup_email',
    'security_questions',
    'phone',
    'manual_review',
  ]),
  verificationData: z.record(z.string()).optional(),
  reason: z.string().max(500, 'Reason must not exceed 500 characters'),
});

// User role assignment schema (admin only)
export const assignUserRoleSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['user', 'moderator', 'admin', 'educator', 'premium']),
  reason: z
    .string()
    .max(200, 'Reason must not exceed 200 characters')
    .optional(),
  expiresAt: dateSchema.optional(),
});

// Bulk user operation schema (admin only)
export const bulkUserOperationSchema = z.object({
  userIds: z
    .array(uuidSchema)
    .min(1, 'At least one user ID is required')
    .max(100),
  operation: z.enum(['suspend', 'unsuspend', 'verify', 'unverify', 'delete']),
  reason: z.string().max(200, 'Reason must not exceed 200 characters'),
  notifyUsers: z.boolean().default(true),
});

// Export all user schemas
export const UserSchemas = {
  updateProfile: updateProfileSchema,
  userPreferences: userPreferencesSchema,
  educationInfo: educationInfoSchema,
  userGoals: userGoalsSchema,
  userAchievement: userAchievementSchema,
  userStats: userStatsSchema,
  userActivity: userActivitySchema,
  userSearch: userSearchSchema,
  friendRequest: friendRequestSchema,
  friendRequestResponse: friendRequestResponseSchema,
  blockUser: blockUserSchema,
  reportUser: reportUserSchema,
  userVerification: userVerificationSchema,
  accountDeletionRequest: accountDeletionRequestSchema,
  dataExportRequest: dataExportRequestSchema,
  accountRecoveryRequest: accountRecoveryRequestSchema,
  assignUserRole: assignUserRoleSchema,
  bulkUserOperation: bulkUserOperationSchema,
};
