import { z } from 'zod';

// Common validation patterns
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
  );

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const dateSchema = z
  .string()
  .datetime('Invalid date format, expected ISO 8601')
  .or(z.date());

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .regex(
    /^[a-zA-Z\s\-\.\']+$/,
    'Name can only contain letters, spaces, hyphens, dots, and apostrophes',
  )
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL must not exceed 2048 characters');

export const textContentSchema = z
  .string()
  .min(1, 'Content is required')
  .max(10000, 'Content must not exceed 10,000 characters')
  .trim();

export const shortTextSchema = z
  .string()
  .min(1, 'Text is required')
  .max(255, 'Text must not exceed 255 characters')
  .trim();

export const paginationSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'Page must be at least 1'))
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit must not exceed 100'),
    )
    .optional()
    .default('20'),
  sortBy: z
    .string()
    .max(50, 'Sort field must not exceed 50 characters')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must not exceed 100 characters')
    .trim(),
  ...paginationSchema.shape,
});

// File upload validation
export const fileUploadSchema = z.object({
  originalname: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'File type is required'),
  size: z.number().int().min(1, 'File size must be greater than 0'),
  buffer: z.instanceof(Buffer),
});

// Allowed file types
export const allowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const allowedDocumentMimeTypes = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const allowedMimeTypes = [
  ...allowedImageMimeTypes,
  ...allowedDocumentMimeTypes,
];

// Security headers validation
export const securityHeadersSchema = z.object({
  'x-forwarded-for': z.string().optional(),
  'user-agent': z.string().max(1000, 'User agent too long').optional(),
  'x-real-ip': z.string().ip().optional(),
  'x-forwarded-proto': z.enum(['http', 'https']).optional(),
});

// Rate limit configuration
export const rateLimitConfigSchema = z.object({
  windowMs: z.number().int().positive(),
  max: z.number().int().positive(),
  message: z.string().optional(),
  standardHeaders: z.boolean().optional().default(true),
  legacyHeaders: z.boolean().optional().default(false),
});

// IP address validation
export const ipAddressSchema = z.string().ip('Invalid IP address format');

// Timezone validation
export const timezoneSchema = z
  .string()
  .regex(/^[A-Za-z_\/]+$/, 'Invalid timezone format')
  .max(50, 'Timezone must not exceed 50 characters');

// Language code validation (ISO 639-1)
export const languageCodeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code format')
  .max(5, 'Language code must not exceed 5 characters');

// Color hex validation
export const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format');

// JSON validation
export const jsonSchema = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON format' });
    return z.NEVER;
  }
});

// Base64 validation
export const base64Schema = z
  .string()
  .regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 format');

// Slug validation
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    'Slug can only contain lowercase letters, numbers, and hyphens',
  )
  .min(1, 'Slug is required')
  .max(100, 'Slug must not exceed 100 characters');

// Version validation
export const versionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (expected x.y.z)');

// Boolean string validation
export const booleanStringSchema = z
  .string()
  .transform((val) => val === 'true')
  .pipe(z.boolean());

// Coordinate validation
export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Currency validation
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Invalid currency code format')
  .length(3, 'Currency code must be exactly 3 characters');

// Priority levels
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

// Status enums
export const activeStatusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'suspended',
]);

// Content type validation
export const contentTypeSchema = z.enum([
  'text/plain',
  'text/html',
  'application/json',
  'application/xml',
  'multipart/form-data',
]);

// HTTP method validation
export const httpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);

// Time duration validation (in minutes)
export const durationSchema = z
  .number()
  .int()
  .min(1, 'Duration must be at least 1 minute')
  .max(1440, 'Duration must not exceed 24 hours');

// Age validation
export const ageSchema = z
  .number()
  .int()
  .min(13, 'Must be at least 13 years old')
  .max(120, 'Age must not exceed 120 years');

// Percentage validation
export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must not exceed 100');

// File size validation (in bytes)
export const fileSizeSchema = z
  .number()
  .int()
  .min(1, 'File size must be greater than 0')
  .max(10 * 1024 * 1024, 'File size must not exceed 10MB');

// Tag validation
export const tagSchema = z
  .string()
  .min(1, 'Tag is required')
  .max(30, 'Tag must not exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9\-_]+$/,
    'Tag can only contain letters, numbers, hyphens, and underscores',
  );

export const tagsArraySchema = z
  .array(tagSchema)
  .max(10, 'Cannot have more than 10 tags')
  .optional();

// Difficulty levels
export const difficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

// Study session types
export const studySessionTypeSchema = z.enum([
  'reading',
  'practice',
  'quiz',
  'flashcards',
  'video',
  'notes',
]);

// Notification types
export const notificationTypeSchema = z.enum([
  'info',
  'success',
  'warning',
  'error',
  'reminder',
  'achievement',
]);

// Export all schemas as a single object for easier imports
export const CommonSchemas = {
  email: emailSchema,
  password: passwordSchema,
  uuid: uuidSchema,
  date: dateSchema,
  name: nameSchema,
  phone: phoneSchema,
  url: urlSchema,
  textContent: textContentSchema,
  shortText: shortTextSchema,
  pagination: paginationSchema,
  search: searchSchema,
  fileUpload: fileUploadSchema,
  securityHeaders: securityHeadersSchema,
  rateLimitConfig: rateLimitConfigSchema,
  ipAddress: ipAddressSchema,
  timezone: timezoneSchema,
  languageCode: languageCodeSchema,
  hexColor: hexColorSchema,
  json: jsonSchema,
  base64: base64Schema,
  slug: slugSchema,
  version: versionSchema,
  booleanString: booleanStringSchema,
  coordinate: coordinateSchema,
  currencyCode: currencyCodeSchema,
  priority: prioritySchema,
  activeStatus: activeStatusSchema,
  contentType: contentTypeSchema,
  httpMethod: httpMethodSchema,
  duration: durationSchema,
  age: ageSchema,
  percentage: percentageSchema,
  fileSize: fileSizeSchema,
  tag: tagSchema,
  tagsArray: tagsArraySchema,
  difficulty: difficultySchema,
  studySessionType: studySessionTypeSchema,
  notificationType: notificationTypeSchema,
};
