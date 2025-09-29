/**
 * Email-related TypeScript interfaces and types for the Resend service
 */

export enum EmailTemplate {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email-verification',
  PASSWORD_RESET = 'password-reset',
  STUDY_REMINDER = 'study-reminder',
  TASK_DEADLINE = 'task-deadline',
  ACHIEVEMENT = 'achievement',
  WEEKLY_SUMMARY = 'weekly-summary',
  FOCUS_SESSION_SUMMARY = 'focus-session-summary',
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailTag {
  name: string;
  value: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: EmailTemplate;
  context?: EmailTemplateContext;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  tags?: EmailTag[];
  headers?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  addUnsubscribe?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

export interface BatchEmailOptions extends EmailOptions {
  delayMs?: number;
}

export interface EmailScheduleOptions extends EmailOptions {
  scheduledFor: Date;
  timezone?: string;
}

export interface EmailResponse {
  success: boolean;
  emailId?: string;
  error?: string;
  message: string;
  retryCount?: number;
}

export interface EmailTrackingData {
  emailId: string;
  to: string;
  subject: string;
  template?: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  complainedAt?: Date;
  unsubscribedAt?: Date;
  openCount: number;
  clickCount: number;
  status: EmailStatus;
  metadata?: Record<string, any>;
}

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed',
  FAILED = 'failed',
}

export interface UnsubscribeOptions {
  email: string;
  reason?: string;
  source?: 'email_link' | 'user_request' | 'bounce' | 'complaint';
}

export interface DomainVerificationStatus {
  domain: string;
  verified: boolean;
  status: string;
  records?: Array<{
    type: string;
    name: string;
    value: string;
    ttl?: number;
  }>;
  error?: string;
}

export interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplaints: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface RateLimitConfig {
  hourlyLimit: number;
  dailyLimit: number;
  burstLimit: number;
  burstWindowMs: number;
}

export interface EmailQueueJob {
  id: string;
  type: 'single' | 'batch' | 'scheduled';
  emailOptions: EmailOptions | BatchEmailOptions;
  priority: number;
  scheduledFor?: Date;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

// Template Context Interfaces
export interface EmailTemplateContext {
  [key: string]: any;
  appName?: string;
  supportEmail?: string;
  frontendUrl?: string;
  currentYear?: number;
}

export interface WelcomeEmailContext extends EmailTemplateContext {
  name: string;
  email: string;
  loginLink?: string;
  dashboardLink?: string;
  features?: string[];
  trialDays?: number;
}

export interface VerificationEmailContext extends EmailTemplateContext {
  name: string;
  verificationToken: string;
  verificationLink?: string;
  expiresIn?: string;
}

export interface PasswordResetContext extends EmailTemplateContext {
  name: string;
  resetToken: string;
  resetLink?: string;
  expiresIn?: string;
  requestedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface StudyReminderContext extends EmailTemplateContext {
  name: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration?: number;
  subject?: string;
  dashboardLink?: string;
  taskLink?: string;
  reminderType?: 'initial' | 'first_reminder' | 'final_reminder';
}

export interface TaskDeadlineContext extends EmailTemplateContext {
  name: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  timeUntilDue: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject?: string;
  taskLink?: string;
  dashboardLink?: string;
  isOverdue?: boolean;
  daysPastDue?: number;
}

export interface AchievementContext extends EmailTemplateContext {
  name: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon?: string;
  badgeUrl?: string;
  pointsEarned?: number;
  totalPoints?: number;
  level?: number;
  nextLevelPoints?: number;
  achievementDate: Date;
  dashboardLink?: string;
  achievementLink?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface WeeklySummaryContext extends EmailTemplateContext {
  name: string;
  weekStart?: string;
  weekEnd?: string;
  tasksCompleted: number;
  tasksCreated: number;
  studyHours: number;
  focusSessions: number;
  averageSessionDuration?: number;
  longestSession?: number;
  streakDays: number;
  pointsEarned: number;
  achievements?: Array<{
    title: string;
    description: string;
    earnedAt: Date;
  }>;
  topSubjects?: Array<{
    name: string;
    hoursStudied: number;
  }>;
  upcomingDeadlines?: Array<{
    title: string;
    dueDate: string;
    priority: string;
  }>;
  dashboardLink?: string;
  previousWeekComparison?: {
    tasksCompletedChange: number;
    studyHoursChange: number;
    streakChange: number;
  };
}

export interface FocusSessionContext extends EmailTemplateContext {
  name: string;
  sessionDuration: number;
  sessionType: 'pomodoro' | 'deep_work' | 'study_block' | 'custom';
  subject?: string;
  task?: string;
  completedAt: Date;
  breakDuration?: number;
  totalFocusTime?: number;
  sessionCount: number;
  pointsEarned?: number;
  achievements?: string[];
  nextSessionRecommendation?: string;
  dashboardLink?: string;
  productivityScore?: number;
  distractionCount?: number;
}

// Email Template Rendering
export interface TemplateRenderResult {
  html: string;
  text: string;
  subject?: string;
}

export interface TemplateVariables {
  [key: string]: any;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  category: 'transactional' | 'marketing' | 'notification';
  description?: string;
}

// Queue and Background Processing
export interface QueueOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface EmailJobData {
  emailOptions: EmailOptions;
  metadata?: Record<string, any>;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
}

// Webhook Events
export interface ResendWebhookEvent {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.complained'
    | 'email.bounced'
    | 'email.opened'
    | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    tags?: EmailTag[];
  };
}

// Error Types
export interface EmailError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export enum EmailErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_ERROR = 'TEMPLATE_RENDER_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_DOMAIN = 'INVALID_DOMAIN',
  BLACKLISTED_EMAIL = 'BLACKLISTED_EMAIL',
}

// Configuration
export interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  webhookSecret?: string;
  rateLimiting: RateLimitConfig;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    maxRetryDelay: number;
  };
  tracking: {
    enableOpenTracking: boolean;
    enableClickTracking: boolean;
    trackingDomain?: string;
  };
  templates: {
    templatePath: string;
    cacheTemplates: boolean;
    cacheTTL: number;
  };
  queue: {
    concurrency: number;
    batchSize: number;
    processInterval: number;
  };
}
