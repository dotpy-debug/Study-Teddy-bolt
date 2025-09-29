# Better Auth Setup for Study Teddy

This document outlines the complete Better Auth implementation for the Study Teddy application, including email OTP authentication and OAuth providers (Google, Microsoft, GitHub).

## 🚀 Features Implemented

### Authentication Methods
- ✅ **Email & Password** - Traditional email/password authentication
- ✅ **Email OTP** - Passwordless authentication with one-time codes
- ✅ **Google OAuth** - Sign in with Google accounts
- ✅ **GitHub OAuth** - Sign in with GitHub accounts
- ✅ **Microsoft OAuth** - Sign in with Microsoft accounts

### Security Features
- ✅ **Session Management** - Secure JWT-based sessions
- ✅ **Email Verification** - Required email verification for new accounts
- ✅ **Protected Routes** - Middleware-based route protection
- ✅ **CSRF Protection** - Built-in CSRF protection
- ✅ **Rate Limiting** - Configurable rate limiting for auth endpoints

## 📁 File Structure

```
apps/frontend/
├── lib/
│   ├── auth.ts                 # Better Auth server configuration
│   ├── auth-client.ts          # Better Auth client configuration
│   └── db/
│       ├── index.ts           # Database connection
│       └── schema/
│           └── index.ts       # Auth schema exports
├── hooks/
│   └── use-auth.ts            # Authentication hooks
├── components/
│   ├── auth/
│   │   └── protected-route.tsx # Protected route wrapper
│   └── providers/
│       └── auth-provider.tsx   # Auth provider component
├── app/
│   ├── api/auth/[...all]/     # Auth API routes
│   └── (auth)/
│       ├── login/             # Login page with all auth methods
│       └── register/          # Registration page
├── middleware.ts              # Route protection middleware
└── .env.local                 # Environment configuration

apps/backend/
└── src/db/
    └── schema.ts              # Updated with Better Auth tables
```

## 🔧 Configuration

### Environment Variables

Copy the following to your `.env.local` file and replace with your actual values:

```env
# Better Auth Configuration
BETTER_AUTH_SECRET=your-better-auth-secret-change-this-in-production-use-long-random-string
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_URL=http://localhost:3000/api/auth

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/studyteddy

# OAuth Provider Configuration
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common

# Email Configuration (for OTP)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@studyteddy.local
```

### OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration
4. Add redirect URI: `http://localhost:3000/api/auth/callback/microsoft`

## 🗄️ Database Setup

### 1. Create Better Auth Tables

The Better Auth tables have been added to the backend schema. Run migrations:

```bash
cd apps/backend
bun run db:generate
bun run db:push
```

### 2. Database Schema

The following tables are created for Better Auth:

- `better_auth_user` - User accounts
- `better_auth_session` - User sessions
- `better_auth_account` - OAuth account linkings
- `better_auth_verification` - Email verification and OTP codes

## 🚀 Usage Examples

### Using Auth Hooks

```tsx
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    googleSignIn,
    githubSignIn,
    microsoftSignIn,
    sendEmailOTP,
    verifyEmailOTP
  } = useAuth();

  // Login with email/password
  const handleLogin = async () => {
    try {
      await login({ email, password });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // OAuth sign in
  const handleGoogleSignIn = async () => {
    await googleSignIn('/dashboard');
  };

  // Email OTP flow
  const handleOTPLogin = async () => {
    // Step 1: Send OTP
    await sendEmailOTP(email);

    // Step 2: Verify OTP
    await verifyEmailOTP(email, otp);
  };
}
```

### Protected Routes

```tsx
import ProtectedRoute from '@/components/auth/protected-route';

function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  );
}
```

### Using Auth Hook for Route Protection

```tsx
import { useRequireAuth } from '@/hooks/use-auth';

function DashboardPage() {
  useRequireAuth(); // Automatically redirects if not authenticated

  return <div>Dashboard content</div>;
}
```

## 🔄 Authentication Flow

### Email/Password Flow
1. User enters email and password
2. Better Auth validates credentials
3. Session created and stored
4. User redirected to dashboard

### Email OTP Flow
1. User enters email address
2. OTP sent to email (console log in development)
3. User enters 6-digit code
4. Better Auth validates OTP
5. Session created and user signed in

### OAuth Flow
1. User clicks OAuth provider button
2. Redirected to provider for authorization
3. Provider redirects back with authorization code
4. Better Auth exchanges code for tokens
5. Session created with provider account info

## 🛡️ Security Features

### Middleware Protection
- Automatic redirect for unauthenticated users on protected routes
- Automatic redirect for authenticated users on auth pages
- Session validation on every request

### CSRF Protection
- Built-in CSRF protection with Better Auth
- Secure cookie handling
- SameSite cookie attributes

### Rate Limiting
- Configurable rate limiting on auth endpoints
- Protection against brute force attacks

## 🔧 Development

### Testing Email OTP
In development mode, OTP codes are logged to the console instead of being sent via email. Check your terminal for the verification codes.

### Database Inspection
Use Drizzle Studio to inspect the database:

```bash
cd apps/backend
bun run db:studio
```

## 🚀 Production Deployment

### Environment Setup
1. Update `.env.production` with production values
2. Set strong `BETTER_AUTH_SECRET` (use a password generator)
3. Configure production SMTP settings for email delivery
4. Update OAuth redirect URIs to production domains

### Security Checklist
- [ ] Strong `BETTER_AUTH_SECRET` set
- [ ] HTTPS enabled
- [ ] Production OAuth redirect URIs configured
- [ ] SMTP/email service configured
- [ ] Database connection secured
- [ ] Rate limiting configured

## 📖 API Reference

### Authentication Endpoints

All endpoints are automatically handled by Better Auth:

- `POST /api/auth/sign-in/email` - Email/password sign in
- `POST /api/auth/sign-up/email` - Email/password registration
- `POST /api/auth/otp/email/send` - Send email OTP
- `POST /api/auth/otp/email/verify` - Verify email OTP
- `GET /api/auth/sign-in/google` - Google OAuth
- `GET /api/auth/sign-in/github` - GitHub OAuth
- `GET /api/auth/sign-in/microsoft` - Microsoft OAuth
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

## 🆘 Troubleshooting

### Common Issues

1. **OAuth not working**: Check redirect URIs match exactly
2. **Email OTP not sending**: Verify SMTP configuration
3. **Database errors**: Ensure migrations are run
4. **Session issues**: Check `BETTER_AUTH_SECRET` is set

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=better-auth:*
```

## 📚 Additional Resources

- [Better Auth Documentation](https://better-auth.com)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

---

This implementation provides a robust, secure, and user-friendly authentication system for the Study Teddy application with all the requested features from the PRD.