import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { db } from '../db/index';
import {
  betterAuthUser as user,
  betterAuthSession as session,
  betterAuthAccount as account,
  betterAuthVerification as verification,
} from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // In development, log to console
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Backend: Sending ${type} OTP ${otp} to ${email}`);
          return;
        }

        // In production, integrate with your email service
        // This should use the same email service as the frontend
        try {
          const nodemailer = await import('nodemailer');

          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: `Your ${type === 'sign-in' ? 'Sign In' : 'Verification'} Code`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Your Verification Code</h2>
                <p>Use this code to ${type === 'sign-in' ? 'sign in to' : 'verify your account with'} Study Teddy:</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                  <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
                </div>
                <p><strong>This code will expire in 5 minutes.</strong></p>
                <p>If you didn't request this code, you can safely ignore this email.</p>
              </div>
            `,
          });
        } catch (error) {
          console.error('Failed to send OTP email:', error);
          throw new Error('Failed to send verification email');
        }
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    cookiePrefix: 'studyteddy-auth',
    crossSubDomainCookies: {
      enabled: true, // Enable for backend API
    },
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Backend API
  ],
});

// Export auth client for session validation
export const { api } = auth;
