import { Injectable, Logger } from '@nestjs/common';
import { SentryService } from '../../sentry/sentry.service';
import { MetricsProvider } from '../providers/metrics.provider';

export interface BackendUserPathStep {
  name: string;
  timestamp: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
  error?: string;
  dbQueries?: number;
  externalCalls?: number;
}

export interface BackendUserPath {
  id: string;
  name: string;
  userId?: string;
  requestId?: string;
  startTime: number;
  endTime?: number;
  steps: BackendUserPathStep[];
  success: boolean;
  totalDuration?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class UserPathMonitoringService {
  private readonly logger = new Logger(UserPathMonitoringService.name);
  private activePaths: Map<string, BackendUserPath> = new Map();
  private pathTemplates: Map<string, PathTemplate> = new Map();

  constructor(
    private readonly sentryService: SentryService,
    private readonly metricsProvider: MetricsProvider,
  ) {
    this.initializePathTemplates();
  }

  /**
   * Start monitoring a critical user path
   */
  startPath(
    pathName: string,
    userId?: string,
    requestId?: string,
    metadata?: Record<string, any>,
  ): string {
    const pathId = this.generatePathId(pathName, requestId);

    const userPath: BackendUserPath = {
      id: pathId,
      name: pathName,
      userId,
      requestId,
      startTime: Date.now(),
      steps: [],
      success: false,
      metadata,
    };

    this.activePaths.set(pathId, userPath);

    // Track path start
    this.sentryService.trackMetric({
      name: `user_path.${pathName}.started`,
      value: 1,
      tags: {
        path: pathName,
        userId: userId || 'anonymous',
      },
    });

    this.logger.debug(`Started user path: ${pathName} (${pathId})`);
    return pathId;
  }

  /**
   * Add a step to an active path
   */
  addStep(
    pathId: string,
    stepName: string,
    success: boolean = true,
    metadata?: Record<string, any>,
    error?: Error,
  ): void {
    const userPath = this.activePaths.get(pathId);
    if (!userPath) {
      this.logger.warn(`User path not found: ${pathId}`);
      return;
    }

    const previousStep = userPath.steps[userPath.steps.length - 1];
    const stepStartTime = previousStep
      ? previousStep.timestamp + previousStep.duration
      : userPath.startTime;
    const duration = Date.now() - stepStartTime;

    const step: BackendUserPathStep = {
      name: stepName,
      timestamp: Date.now(),
      duration,
      success,
      metadata,
      error: error?.message,
    };

    userPath.steps.push(step);

    // Track step completion
    this.sentryService.trackMetric({
      name: `user_path.${userPath.name}.step.${stepName}`,
      value: duration,
      tags: {
        path: userPath.name,
        step: stepName,
        success: success.toString(),
        userId: userPath.userId || 'anonymous',
      },
    });

    // Log step details
    if (!success && error) {
      this.logger.error(
        `Step failed in path ${userPath.name}: ${stepName}`,
        error,
      );
      this.handleStepError(userPath, step, error);
    } else {
      this.logger.debug(
        `Step completed in path ${userPath.name}: ${stepName} (${duration}ms)`,
      );
    }

    // Check for step performance issues
    this.analyzeStepPerformance(userPath, step);
  }

  /**
   * Complete a user path
   */
  completePath(
    pathId: string,
    success: boolean = true,
    metadata?: Record<string, any>,
  ): void {
    const userPath = this.activePaths.get(pathId);
    if (!userPath) {
      this.logger.warn(`User path not found: ${pathId}`);
      return;
    }

    userPath.endTime = Date.now();
    userPath.success = success;
    userPath.totalDuration = userPath.endTime - userPath.startTime;

    if (metadata) {
      userPath.metadata = { ...userPath.metadata, ...metadata };
    }

    // Track path completion
    this.sentryService.trackMetric({
      name: `user_path.${userPath.name}.completed`,
      value: 1,
      tags: {
        path: userPath.name,
        success: success.toString(),
        userId: userPath.userId || 'anonymous',
      },
    });

    this.sentryService.trackMetric({
      name: `user_path.${userPath.name}.duration`,
      value: userPath.totalDuration,
      tags: {
        path: userPath.name,
        success: success.toString(),
        userId: userPath.userId || 'anonymous',
      },
    });

    // Analyze completed path
    this.analyzeCompletedPath(userPath);

    // Remove from active paths
    this.activePaths.delete(pathId);

    this.logger.log(
      `Completed user path: ${userPath.name} (${userPath.totalDuration}ms, success: ${success})`,
    );
  }

  /**
   * Abandon/fail a user path
   */
  abandonPath(pathId: string, reason?: string, error?: Error): void {
    const userPath = this.activePaths.get(pathId);
    if (!userPath) {
      return;
    }

    userPath.endTime = Date.now();
    userPath.success = false;
    userPath.totalDuration = userPath.endTime - userPath.startTime;

    // Track path abandonment
    this.sentryService.trackMetric({
      name: `user_path.${userPath.name}.abandoned`,
      value: 1,
      tags: {
        path: userPath.name,
        reason: reason || 'unknown',
        userId: userPath.userId || 'anonymous',
      },
    });

    // Log abandonment
    this.logger.warn(
      `Abandoned user path: ${userPath.name} (${userPath.totalDuration}ms, reason: ${reason})`,
    );

    if (error) {
      this.sentryService.captureException(error, {
        user_path: {
          pathId: userPath.id,
          pathName: userPath.name,
          userId: userPath.userId,
          reason,
          stepCount: userPath.steps.length,
          duration: userPath.totalDuration,
        },
      });
    }

    this.activePaths.delete(pathId);
  }

  /**
   * Handle step errors
   */
  private handleStepError(
    userPath: BackendUserPath,
    step: BackendUserPathStep,
    error: Error,
  ): void {
    // Track step error
    this.sentryService.captureException(error, {
      user_path_step: {
        pathId: userPath.id,
        pathName: userPath.name,
        stepName: step.name,
        stepIndex: userPath.steps.length - 1,
        userId: userPath.userId,
        metadata: step.metadata,
      },
    });

    // Check if this is a critical step
    const template = this.pathTemplates.get(userPath.name);
    if (template?.criticalSteps?.includes(step.name)) {
      this.logger.error(
        `Critical step failed in path ${userPath.name}: ${step.name}`,
      );

      // Send immediate alert for critical step failures
      this.sentryService.captureMessage(
        `Critical user path step failed: ${userPath.name}.${step.name}`,
        'error',
      );
    }
  }

  /**
   * Analyze step performance
   */
  private analyzeStepPerformance(
    userPath: BackendUserPath,
    step: BackendUserPathStep,
  ): void {
    const template = this.pathTemplates.get(userPath.name);
    const expectedDuration = template?.stepThresholds?.[step.name];

    if (expectedDuration && step.duration > expectedDuration) {
      this.logger.warn(
        `Slow step in path ${userPath.name}: ${step.name} took ${step.duration}ms (expected < ${expectedDuration}ms)`,
      );

      this.sentryService.trackMetric({
        name: `user_path.${userPath.name}.step.slow`,
        value: 1,
        tags: {
          path: userPath.name,
          step: step.name,
          userId: userPath.userId || 'anonymous',
        },
      });
    }
  }

  /**
   * Analyze completed path
   */
  private analyzeCompletedPath(userPath: BackendUserPath): void {
    const template = this.pathTemplates.get(userPath.name);
    const expectedDuration = template?.totalThreshold;

    if (expectedDuration && userPath.totalDuration! > expectedDuration) {
      this.logger.warn(
        `Slow user path: ${userPath.name} took ${userPath.totalDuration}ms (expected < ${expectedDuration}ms)`,
      );

      this.sentryService.captureMessage(
        `Slow user path detected: ${userPath.name}`,
        'warning',
      );
    }

    // Calculate step distribution
    const stepDurations = userPath.steps.reduce(
      (acc, step) => {
        acc[step.name] = (acc[step.name] || 0) + step.duration;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Track step distribution
    Object.entries(stepDurations).forEach(([stepName, duration]) => {
      this.sentryService.trackMetric({
        name: `user_path.${userPath.name}.step_distribution.${stepName}`,
        value: (duration / userPath.totalDuration!) * 100,
        tags: {
          path: userPath.name,
          step: stepName,
          userId: userPath.userId || 'anonymous',
        },
      });
    });

    // Check for error patterns
    const errorSteps = userPath.steps.filter((step) => !step.success);
    if (errorSteps.length > 0) {
      this.sentryService.trackMetric({
        name: `user_path.${userPath.name}.error_steps`,
        value: errorSteps.length,
        tags: {
          path: userPath.name,
          userId: userPath.userId || 'anonymous',
        },
      });
    }
  }

  /**
   * Initialize path templates with expected performance thresholds
   */
  private initializePathTemplates(): void {
    // Authentication paths
    this.pathTemplates.set('authentication_login', {
      totalThreshold: 3000,
      stepThresholds: {
        validate_credentials: 500,
        check_user_status: 200,
        generate_tokens: 300,
        update_last_login: 200,
      },
      criticalSteps: ['validate_credentials', 'generate_tokens'],
    });

    this.pathTemplates.set('authentication_signup', {
      totalThreshold: 5000,
      stepThresholds: {
        validate_input: 200,
        check_email_exists: 300,
        hash_password: 1000,
        create_user: 800,
        send_verification_email: 2000,
      },
      criticalSteps: ['create_user', 'hash_password'],
    });

    // Task management paths
    this.pathTemplates.set('task_creation', {
      totalThreshold: 2000,
      stepThresholds: {
        validate_task_data: 200,
        create_task_record: 500,
        process_ai_suggestions: 1000,
        send_notifications: 300,
      },
      criticalSteps: ['create_task_record'],
    });

    this.pathTemplates.set('task_update', {
      totalThreshold: 1500,
      stepThresholds: {
        validate_permissions: 200,
        update_task_record: 400,
        recalculate_progress: 300,
        send_notifications: 300,
      },
      criticalSteps: ['update_task_record'],
    });

    // Study session paths
    this.pathTemplates.set('study_session_start', {
      totalThreshold: 2500,
      stepThresholds: {
        validate_session_data: 200,
        create_session_record: 400,
        load_study_materials: 800,
        initialize_ai_context: 1000,
      },
      criticalSteps: ['create_session_record'],
    });

    // AI interaction paths
    this.pathTemplates.set('ai_chat_request', {
      totalThreshold: 15000,
      stepThresholds: {
        validate_request: 200,
        prepare_context: 500,
        call_ai_service: 12000,
        process_response: 500,
        save_interaction: 300,
      },
      criticalSteps: ['call_ai_service'],
    });

    this.pathTemplates.set('ai_study_plan_generation', {
      totalThreshold: 20000,
      stepThresholds: {
        analyze_user_data: 1000,
        prepare_ai_prompt: 500,
        call_ai_service: 15000,
        process_study_plan: 2000,
        save_study_plan: 500,
      },
      criticalSteps: ['call_ai_service', 'save_study_plan'],
    });

    // File upload paths
    this.pathTemplates.set('document_upload', {
      totalThreshold: 30000,
      stepThresholds: {
        validate_file: 500,
        upload_to_storage: 20000,
        extract_content: 8000,
        save_metadata: 500,
      },
      criticalSteps: ['upload_to_storage', 'save_metadata'],
    });

    this.logger.log(
      `Initialized ${this.pathTemplates.size} user path templates`,
    );
  }

  /**
   * Generate unique path ID
   */
  private generatePathId(pathName: string, requestId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return requestId
      ? `${pathName}_${requestId}_${timestamp}`
      : `${pathName}_${timestamp}_${random}`;
  }

  /**
   * Get active paths
   */
  getActivePaths(): BackendUserPath[] {
    return Array.from(this.activePaths.values());
  }

  /**
   * Get path statistics
   */
  getPathStats(): Record<string, any> {
    const activePaths = Array.from(this.activePaths.values());

    const stats = {
      totalActivePaths: activePaths.length,
      pathsByType: {} as Record<string, number>,
      longestRunningPath: null as BackendUserPath | null,
    };

    // Group by path type
    activePaths.forEach((path) => {
      stats.pathsByType[path.name] = (stats.pathsByType[path.name] || 0) + 1;

      // Find longest running path
      if (
        !stats.longestRunningPath ||
        Date.now() - path.startTime >
          Date.now() - stats.longestRunningPath.startTime
      ) {
        stats.longestRunningPath = path;
      }
    });

    return stats;
  }

  /**
   * Clean up old active paths (paths that have been running too long)
   */
  cleanupStalePaths(): void {
    const now = Date.now();
    const maxPathDuration = 5 * 60 * 1000; // 5 minutes

    for (const [pathId, path] of this.activePaths.entries()) {
      if (now - path.startTime > maxPathDuration) {
        this.logger.warn(`Cleaning up stale path: ${path.name} (${pathId})`);
        this.abandonPath(pathId, 'stale_path_cleanup');
      }
    }
  }
}

interface PathTemplate {
  totalThreshold: number;
  stepThresholds: Record<string, number>;
  criticalSteps: string[];
}

/**
 * Decorator for automatic user path monitoring
 */
export function MonitorUserPath(pathName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const userPathService = this
        .userPathMonitoringService as UserPathMonitoringService;

      if (!userPathService) {
        return await originalMethod.apply(this, args);
      }

      // Extract user ID and request ID from context if available
      const userId = this.getCurrentUserId?.() || args[0]?.userId;
      const requestId = this.getRequestId?.() || this.request?.id;

      const pathId = userPathService.startPath(pathName, userId, requestId);

      try {
        const result = await originalMethod.apply(this, args);
        userPathService.completePath(pathId, true);
        return result;
      } catch (error) {
        userPathService.abandonPath(pathId, 'method_error', error);
        throw error;
      }
    };

    return descriptor;
  };
}
