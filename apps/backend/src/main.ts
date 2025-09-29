import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

// Initialize Sentry before importing other modules
import './sentry/sentry.init';

import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { SentryService } from './sentry/sentry.service';
import { UsersService } from './modules/users/users.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    // Security middleware for production
    if (isProduction) {
      app.use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https://api.openai.com'],
              fontSrc: ["'self'", 'https:', 'data:'],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          },
          crossOriginEmbedderPolicy: false,
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
          noSniff: true,
          xssFilter: true,
          referrerPolicy: { policy: 'same-origin' },
          permittedCrossDomainPolicies: false,
        }),
      );

      // HTTPS enforcement in production
      app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
          res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
          next();
        }
      });
    }

    // Compression middleware
    app.use(compression());

    // Get Sentry service instance
    const sentryService = app.get(SentryService);

    // Global exception filter
    app.useGlobalFilters(new SentryExceptionFilter(sentryService));

    // Global interceptors
    app.useGlobalInterceptors(
      new SentryInterceptor(), // Must be first for proper error tracking
      new TransformInterceptor(),
    );

    // Global validation pipe with enhanced error messages
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        validateCustomDecorators: true,
        forbidUnknownValues: true,
        disableErrorMessages: false,
        validationError: {
          target: false,
          value: false,
        },
        exceptionFactory: (errors) => {
          const messages: string[] = [];
          errors.forEach((error) => {
            const constraints = error.constraints || {};
            Object.values(constraints).forEach((message) => {
              if (typeof message === 'string') {
                messages.push(message);
              }
            });
          });

          return new BadRequestException({
            statusCode: 400,
            message: messages.length > 0 ? messages : 'Validation failed',
            error: 'Bad Request',
          });
        },
      }),
    );

    // CORS configuration
    const corsOrigins = isProduction
      ? [
          configService.get<string>('FRONTEND_URL'),
          configService.get<string>('CORS_ORIGIN'),
        ].filter(Boolean)
      : [
          configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
          'http://localhost:3000',
          'https://localhost:3000',
        ];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
      ],
      maxAge: isProduction ? 86400 : undefined, // Cache preflight for 24 hours in production
    });

    // Global API prefix
    const apiPrefix = configService.get<string>('API_PREFIX') || 'api';
    app.setGlobalPrefix(apiPrefix);

    // Swagger documentation setup (disabled in production by default)
    const enableSwagger =
      configService.get<string>('SWAGGER_ENABLED') === 'true' || !isProduction;
    if (enableSwagger) {
      const config = new DocumentBuilder()
        .setTitle('Study Teddy API')
        .setDescription(
          `
          The Study Teddy API provides authentication, task management, AI assistance, and dashboard features.

          ## Authentication
          This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
          \`Authorization: Bearer <your-jwt-token>\`

          ## Features
          - User registration and login (email/password)
          - Google OAuth 2.0 authentication
          - JWT token refresh
          - Password reset functionality
          - Study task management
          - AI-powered study assistance
          - Dashboard and analytics

          ## Rate Limiting
          - General endpoints: 100 requests per minute (configurable)
          - AI Chat: 10 requests per minute per user
          - AI Practice Questions: 5 requests per minute per user
          - AI Study Plans: 3 requests per minute per user
          - AI Heavy Operations: 2 requests per minute per user
          - AI Light Operations: 20 requests per minute per user
          - Burst protection: 10 requests per 10 seconds
          `,
        )
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token',
          },
          'JWT',
        )
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('Users', 'User profile management')
        .addTag('Tasks', 'Study task management')
        .addTag('AI', 'AI-powered study assistance')
        .addTag('Dashboard', 'Analytics and dashboard data')
        .addServer(
          `http://localhost:${configService.get<number>('PORT') || 3001}/${apiPrefix}`,
          'Development server',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
        customSiteTitle: 'Study Teddy API Documentation',
        customfavIcon: '/favicon.ico',
        customCssUrl: '/swagger-ui-custom.css',
      });

      logger.log(
        `Swagger documentation available at: http://localhost:${configService.get<number>('PORT') || 3001}/${apiPrefix}/docs`,
      );
    }

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, starting graceful shutdown...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('SIGINT received, starting graceful shutdown...');
      await app.close();
      process.exit(0);
    });

    // Health check endpoint
    app.getHttpServer().on('request', (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: configService.get<string>('NODE_ENV'),
          }),
        );
      }
    });

    // Dev-only: seed demo user if enabled and missing
    try {
      const isProduction =
        configService.get<string>('NODE_ENV') === 'production';
      const shouldSeedDemo =
        (configService.get<string>('SEED_DEMO_USER') || 'true') === 'true' &&
        !isProduction;

      if (shouldSeedDemo) {
        const usersService = app.get(UsersService);
        const demoEmail =
          configService.get<string>('DEMO_USER_EMAIL') || 'demo@studyteddy.dev';
        const demoPassword =
          configService.get<string>('DEMO_USER_PASSWORD') || 'DemoPass123!';
        const demoName =
          configService.get<string>('DEMO_USER_NAME') || 'Demo User';

        const existing = await usersService.findByEmail(demoEmail);
        if (!existing) {
          await usersService.createUser(demoEmail, demoPassword, demoName);
          logger.log(`Created demo user: ${demoEmail}`);
        } else {
          logger.log(`Demo user already exists: ${demoEmail}`);
        }
      }
    } catch (seedError) {
      logger.warn(`Demo user seeding skipped/failed: ${seedError}`);
    }

    const port = configService.get<number>('PORT') || 3001;
    await app.listen(port, '0.0.0.0');

    logger.log(
      `Study Teddy Backend is running on: http://localhost:${port}/${apiPrefix}`,
    );
    logger.log(`Environment: ${configService.get<string>('NODE_ENV')}`);
    logger.log(`Database: Managed by DrizzleService`);

    if (configService.get<string>('NODE_ENV') !== 'production') {
      logger.log(`Swagger Docs: http://localhost:${port}/${apiPrefix}/docs`);
    }
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
