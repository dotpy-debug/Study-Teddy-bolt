import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../../modules/redis/redis.module';

// Security Services
import { SanitizationService } from './sanitization.service';
import { FileValidationService } from './file-validation.service';
import { AuthSecurityService } from './auth-security.service';
import { RBACService } from './rbac.service';
import { SessionSecurityService } from './session-security.service';
import { MFAService } from './mfa.service';
import { EncryptionService } from './encryption.service';
import { RateLimitingService } from './rate-limiting.service';
import { SecurityLoggerService } from './security-logger.service';
import { SecurityMonitoringService } from './security-monitoring.service';
import { FrontendSecurityService } from './frontend-security.service';

// Security Guards
import { SecurityGuard } from '../guards/security.guard';

// Security Middleware
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';
import { CORSSecurityMiddleware } from '../middleware/cors-security.middleware';
import { ComprehensiveSecurityMiddleware } from '../middleware/comprehensive-security.middleware';

@Global()
@Module({
  imports: [ConfigModule, RedisModule, ScheduleModule.forRoot()],
  providers: [
    // Core Security Services
    SanitizationService,
    FileValidationService,
    AuthSecurityService,
    RBACService,
    SessionSecurityService,
    MFAService,
    EncryptionService,
    RateLimitingService,
    SecurityLoggerService,
    SecurityMonitoringService,
    FrontendSecurityService,

    // Security Guards
    SecurityGuard,

    // Security Middleware
    SecurityHeadersMiddleware,
    CORSSecurityMiddleware,
    ComprehensiveSecurityMiddleware,
  ],
  exports: [
    // Export all security services for use in other modules
    SanitizationService,
    FileValidationService,
    AuthSecurityService,
    RBACService,
    SessionSecurityService,
    MFAService,
    EncryptionService,
    RateLimitingService,
    SecurityLoggerService,
    SecurityMonitoringService,
    FrontendSecurityService,

    // Export security guards
    SecurityGuard,

    // Export middleware for manual configuration
    SecurityHeadersMiddleware,
    CORSSecurityMiddleware,
    ComprehensiveSecurityMiddleware,
  ],
})
export class SecurityModule {
  /**
   * Configure security module with custom options
   */
  static forRoot(options?: {
    enableGlobalSecurity?: boolean;
    enableMonitoring?: boolean;
    enableMFA?: boolean;
    customRoles?: string[];
    customPermissions?: string[];
  }) {
    return {
      module: SecurityModule,
      providers: [
        {
          provide: 'SECURITY_OPTIONS',
          useValue: options || {},
        },
      ],
    };
  }

  /**
   * Configure security module for specific features
   */
  static forFeature(features: {
    enableRBAC?: boolean;
    enableMFA?: boolean;
    enableFileValidation?: boolean;
    enableRateLimiting?: boolean;
    enableEncryption?: boolean;
  }) {
    const providers = [];

    if (features.enableRBAC) {
      providers.push(RBACService, SecurityGuard);
    }

    if (features.enableMFA) {
      providers.push(MFAService);
    }

    if (features.enableFileValidation) {
      providers.push(FileValidationService);
    }

    if (features.enableRateLimiting) {
      providers.push(RateLimitingService);
    }

    if (features.enableEncryption) {
      providers.push(EncryptionService);
    }

    return {
      module: SecurityModule,
      providers,
      exports: providers,
    };
  }
}
