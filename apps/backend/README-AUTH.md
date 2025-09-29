# Study Teddy Authentication System

This is a complete authentication system for the Study Teddy backend using NestJS 11.1.6, following the exact specifications from the PRD and project documentation.

## 🚀 Features Implemented

### Authentication Methods
- ✅ Email/Password registration and login
- ✅ Google OAuth 2.0 authentication
- ✅ JWT access tokens (7-day expiration)
- ✅ Refresh token system (30-day expiration)
- ✅ Secure password hashing with bcrypt (salt rounds: 10)

### API Endpoints
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - User login
- ✅ `GET /api/auth/google` - Google OAuth initiation
- ✅ `GET /api/auth/google/callback` - Google OAuth callback
- ✅ `POST /api/auth/refresh` - Refresh JWT token
- ✅ `POST /api/auth/logout` - User logout
- ✅ `GET /api/auth/me` - Get current user profile
- ✅ `POST /api/auth/forgot-password` - Password reset request

### Security Features
- ✅ JWT token validation and proper error handling
- ✅ Refresh token rotation on each use
- ✅ Password strength validation (minimum 6 characters)
- ✅ Input validation with class-validator
- ✅ Global exception handling with detailed error messages
- ✅ Rate limiting ready endpoints
- ✅ CORS configuration for frontend integration

### Database Integration
- ✅ Drizzle ORM with PostgreSQL
- ✅ Optimized database schema with proper indexes
- ✅ Cascade delete relationships
- ✅ Connection pooling and health checks

### Developer Experience
- ✅ Complete Swagger/OpenAPI documentation
- ✅ TypeScript strict mode
- ✅ Environment variable validation
- ✅ Comprehensive error handling
- ✅ Structured logging
- ✅ Health check endpoint

## 🏗️ Architecture

### Module Structure
```
src/
├── modules/auth/
│   ├── auth.controller.ts       # API endpoints with Swagger docs
│   ├── auth.service.ts          # Authentication business logic
│   ├── auth.module.ts           # Module configuration
│   ├── dto/
│   │   └── auth.dto.ts          # Request/response DTOs
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    # JWT authentication guard
│   │   └── google-auth.guard.ts # Google OAuth guard
│   └── strategies/
│       ├── jwt.strategy.ts      # JWT validation strategy
│       └── google.strategy.ts   # Google OAuth strategy
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts # Extract current user
│   │   └── public.decorator.ts       # Mark endpoints as public
│   ├── filters/
│   │   └── http-exception.filter.ts  # Global error handling
│   ├── interceptors/
│   │   └── transform.interceptor.ts  # Response transformation
│   └── pipes/
│       ├── validation.pipe.ts        # Enhanced validation
│       └── parse-uuid.pipe.ts        # UUID validation
├── config/
│   ├── environment.config.ts    # Environment configuration
│   └── configuration.ts         # Configuration factory
└── db/
    ├── index.ts                 # Database connection
    └── schema.ts                # Database schema
```

### Security Implementation

#### JWT Strategy
- **Token Validation**: Comprehensive JWT token validation with proper error messages
- **User Verification**: Validates that users still exist in the database
- **Token Expiration**: 7-day access tokens with automatic cleanup
- **Secure Headers**: Proper JWT header extraction and validation

#### Refresh Token System
- **Secure Storage**: Refresh tokens are hashed before storage
- **Token Rotation**: New refresh token generated on each refresh
- **Expiration**: 30-day refresh token expiration
- **Revocation**: Tokens can be revoked on logout

#### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Validation**: Minimum 6 character requirement
- **Secure Comparison**: Timing-safe password comparison

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/studyteddy
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Database Schema
The authentication system uses the following database tables:

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  auth_provider auth_provider DEFAULT 'local' NOT NULL,
  google_id TEXT UNIQUE,
  refresh_token TEXT,
  refresh_token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## 📖 API Documentation

### Authentication Flow

#### 1. User Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "name": "John Doe",
      "avatarUrl": null
    }
  }
}
```

#### 2. User Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### 3. Google OAuth
```bash
GET /api/auth/google
# Redirects to Google OAuth consent screen
```

#### 4. Token Refresh
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 5. Get User Profile
```bash
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 6. Logout
```bash
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🛠️ Usage

### Starting the Server
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate database migrations
npm run db:generate

# Push migrations to database
npm run db:push

# Start development server
npm run start:dev
```

### API Documentation
Once the server is running, visit:
- **Swagger UI**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health

### Frontend Integration
Include the JWT token in all authenticated requests:
```javascript
const token = localStorage.getItem('access_token');
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🔒 Security Best Practices

### Implemented Security Measures
1. **Input Validation**: All inputs validated with class-validator
2. **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
3. **Password Security**: bcrypt hashing with proper salt rounds
4. **JWT Security**: Secure token generation and validation
5. **CORS Configuration**: Restricted to specified frontend domains
6. **Error Handling**: No sensitive information leaked in error messages
7. **Rate Limiting**: Ready for implementation with configurable limits

### Recommended Additional Security
1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit secrets to version control
3. **Rate Limiting**: Implement rate limiting for production
4. **Monitoring**: Add logging and monitoring for security events
5. **Database Security**: Use connection pooling and proper database permissions

## 🧪 Testing

### Manual Testing
1. **Registration**: Create new user account
2. **Login**: Authenticate with email/password
3. **Google OAuth**: Test Google authentication flow
4. **Token Management**: Test token refresh and logout
5. **Error Handling**: Test invalid credentials and malformed requests

### Integration with Frontend
The authentication system is ready for integration with:
- React/Next.js applications
- Mobile applications
- Third-party services

## 📝 Notes

- All endpoints follow RESTful conventions
- Response format is consistent across all endpoints
- Error messages are user-friendly and secure
- Database operations are optimized with proper indexing
- Code follows NestJS best practices and conventions
- TypeScript strict mode ensures type safety
- Comprehensive logging for debugging and monitoring

## 🚀 Production Deployment

The authentication system is production-ready with:
- Environment-specific configuration
- Database connection pooling
- Comprehensive error handling
- Security headers and CORS
- Health check endpoints
- Swagger documentation (disabled in production)
- Structured logging

For production deployment, ensure:
1. Set `NODE_ENV=production`
2. Use secure JWT secrets (32+ characters)
3. Configure proper CORS origins
4. Set up database with proper indexes
5. Enable rate limiting
6. Configure monitoring and logging