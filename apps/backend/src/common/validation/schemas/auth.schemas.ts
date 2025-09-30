import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema, uuidSchema } from './common.schemas';

// User registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: 'You must accept the privacy policy',
  }),
  captchaToken: z.string().min(1, 'Captcha verification is required').optional(),
});

// User login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  captchaToken: z.string().min(1, 'Captcha verification is required').optional(),
});

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().min(1, 'Captcha verification is required').optional(),
});

// Password reset schema
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// Token refresh schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Resend email verification schema
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Two-factor authentication setup schema
export const setupTwoFactorSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// Two-factor authentication verify schema
export const verifyTwoFactorSchema = z.object({
  token: z.string().regex(/^\d{6}$/, 'Token must be a 6-digit number'),
  backupCode: z.string().optional(),
});

// Two-factor authentication disable schema
export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  token: z
    .string()
    .regex(/^\d{6}$/, 'Token must be a 6-digit number')
    .optional(),
});

// OAuth callback schema
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  redirectUri: z.string().url('Invalid redirect URI').optional(),
});

// OAuth state schema
export const oauthStateSchema = z.object({
  provider: z.enum(['google', 'github', 'microsoft']),
  redirectUri: z.string().url('Invalid redirect URI').optional(),
  timestamp: z.number().int().positive(),
  nonce: z.string().min(1, 'Nonce is required'),
});

// Session management schema
export const revokeSessionSchema = z.object({
  sessionId: uuidSchema,
});

// Device trust schema
export const trustDeviceSchema = z.object({
  deviceFingerprint: z.string().min(1, 'Device fingerprint is required'),
  deviceName: z.string().min(1, 'Device name is required').max(100),
  trusted: z.boolean(),
});

// Account deletion schema
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmDeletion: z.literal('DELETE', {
    errorMap: () => ({
      message: 'You must type "DELETE" to confirm account deletion',
    }),
  }),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

// Login attempt schema (for security logging)
export const loginAttemptSchema = z.object({
  email: emailSchema,
  success: z.boolean(),
  ipAddress: z.string().ip('Invalid IP address'),
  userAgent: z.string().max(1000, 'User agent too long'),
  timestamp: z.date(),
  failureReason: z.string().optional(),
});

// Security question schemas
export const securityQuestionSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(200),
  answer: z.string().min(2, 'Answer must be at least 2 characters').max(100),
});

export const securityQuestionsSchema = z.object({
  questions: z
    .array(securityQuestionSchema)
    .min(3, 'Must provide at least 3 security questions')
    .max(5),
});

export const answerSecurityQuestionsSchema = z.object({
  answers: z.array(z.string().min(1, 'Answer is required')).min(3),
});

// Account recovery schema
export const accountRecoverySchema = z.object({
  email: emailSchema,
  recoveryMethod: z.enum(['email', 'sms', 'security_questions']),
  securityAnswers: z.array(z.string()).optional(),
});

// Backup codes schema
export const generateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const useBackupCodeSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{8}$/, 'Backup code must be 8 characters long'),
});

// Login with magic link schema
export const magicLinkSchema = z.object({
  email: emailSchema,
  redirectUri: z.string().url('Invalid redirect URI').optional(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Magic link token is required'),
  signature: z.string().min(1, 'Signature is required'),
});

// Biometric authentication schema
export const biometricAuthSchema = z.object({
  publicKey: z.string().min(1, 'Public key is required'),
  signature: z.string().min(1, 'Signature is required'),
  challenge: z.string().min(1, 'Challenge is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
});

// Session extension schema
export const extendSessionSchema = z.object({
  extendBy: z.number().int().min(1).max(24), // hours
});

// API key generation schema
export const generateApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresIn: z.number().int().min(1).max(365).optional(), // days
});

// API key revocation schema
export const revokeApiKeySchema = z.object({
  keyId: uuidSchema,
});

// Export all auth schemas
export const AuthSchemas = {
  register: registerSchema,
  login: loginSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  refreshToken: refreshTokenSchema,
  verifyEmail: verifyEmailSchema,
  resendVerification: resendVerificationSchema,
  setupTwoFactor: setupTwoFactorSchema,
  verifyTwoFactor: verifyTwoFactorSchema,
  disableTwoFactor: disableTwoFactorSchema,
  oauthCallback: oauthCallbackSchema,
  oauthState: oauthStateSchema,
  revokeSession: revokeSessionSchema,
  trustDevice: trustDeviceSchema,
  deleteAccount: deleteAccountSchema,
  loginAttempt: loginAttemptSchema,
  securityQuestion: securityQuestionSchema,
  securityQuestions: securityQuestionsSchema,
  answerSecurityQuestions: answerSecurityQuestionsSchema,
  accountRecovery: accountRecoverySchema,
  generateBackupCodes: generateBackupCodesSchema,
  useBackupCode: useBackupCodeSchema,
  magicLink: magicLinkSchema,
  verifyMagicLink: verifyMagicLinkSchema,
  biometricAuth: biometricAuthSchema,
  extendSession: extendSessionSchema,
  generateApiKey: generateApiKeySchema,
  revokeApiKey: revokeApiKeySchema,
};
