import { performanceMonitor } from '../performance/performance-monitor';
import { SentryUtils } from '../../../sentry.client.config';
import { errorRecoveryService, createErrorContext } from '../error-recovery/error-recovery.service';

export interface UserPathStep {
  name: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
  errors?: Error[];
}

export interface UserPath {
  id: string;
  name: string;
  userId?: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  steps: UserPathStep[];
  success: boolean;
  totalDuration?: number;
  metadata?: Record<string, any>;
}

export class UserPathMonitoring {
  private static instance: UserPathMonitoring;
  private activePaths: Map<string, UserPath> = new Map();
  private completedPaths: UserPath[] = [];
  private maxCompletedPaths = 100; // Keep last 100 completed paths in memory

  static getInstance(): UserPathMonitoring {
    if (!UserPathMonitoring.instance) {
      UserPathMonitoring.instance = new UserPathMonitoring();
    }
    return UserPathMonitoring.instance;
  }

  /**
   * Start monitoring a critical user path
   */
  startPath(pathName: string, userId?: string, metadata?: Record<string, any>): string {
    const pathId = this.generatePathId(pathName);
    const sessionId = this.getSessionId();

    const userPath: UserPath = {
      id: pathId,
      name: pathName,
      userId,
      sessionId,
      startTime: Date.now(),
      steps: [],
      success: false,
      metadata,
    };

    this.activePaths.set(pathId, userPath);

    // Track path start with Sentry
    SentryUtils.trackUserAction('user_path_start', {
      pathId,
      pathName,
      userId,
      sessionId,
      metadata,
    });

    // Start performance measurement
    performanceMonitor.startMeasure(`user_path_${pathName}`);

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
    error?: Error
  ): void {
    const userPath = this.activePaths.get(pathId);
    if (!userPath) {
      console.warn(`User path not found: ${pathId}`);
      return;
    }

    const step: UserPathStep = {
      name: stepName,
      timestamp: Date.now(),
      duration: Date.now() - (userPath.steps[userPath.steps.length - 1]?.timestamp || userPath.startTime),
      success,
      metadata,
      errors: error ? [error] : undefined,
    };

    userPath.steps.push(step);

    // Track step with Sentry
    SentryUtils.trackUserAction('user_path_step', {
      pathId,
      pathName: userPath.name,
      stepName,
      stepIndex: userPath.steps.length - 1,
      success,
      duration: step.duration,
      metadata,
      error: error?.message,
    });

    // Handle step errors
    if (!success && error) {
      this.handleStepError(userPath, step, error);
    }
  }

  /**
   * Complete a user path
   */
  completePath(pathId: string, success: boolean = true, metadata?: Record<string, any>): void {
    const userPath = this.activePaths.get(pathId);
    if (!userPath) {
      console.warn(`User path not found: ${pathId}`);
      return;
    }

    userPath.endTime = Date.now();
    userPath.success = success;
    userPath.totalDuration = userPath.endTime - userPath.startTime;

    if (metadata) {
      userPath.metadata = { ...userPath.metadata, ...metadata };
    }

    // End performance measurement
    const perfDuration = performanceMonitor.endMeasure(`user_path_${userPath.name}`);

    // Track path completion with Sentry
    SentryUtils.trackUserAction('user_path_complete', {
      pathId,
      pathName: userPath.name,
      userId: userPath.userId,
      success,
      duration: userPath.totalDuration,
      stepCount: userPath.steps.length,
      performanceDuration: perfDuration,
      metadata: userPath.metadata,
    });

    // Move to completed paths
    this.activePaths.delete(pathId);
    this.addCompletedPath(userPath);

    // Analyze path performance
    this.analyzePath(userPath);
  }

  /**
   * Abandon/cancel a user path
   */
  abandonPath(pathId: string, reason?: string): void {
    const userPath = this.activePaths.get(pathId);
    if (!userPath) {
      return;
    }

    userPath.endTime = Date.now();
    userPath.success = false;
    userPath.totalDuration = userPath.endTime - userPath.startTime;

    // Track path abandonment
    SentryUtils.trackUserAction('user_path_abandoned', {
      pathId,
      pathName: userPath.name,
      userId: userPath.userId,
      reason,
      duration: userPath.totalDuration,
      stepCount: userPath.steps.length,
      lastStep: userPath.steps[userPath.steps.length - 1]?.name,
    });

    this.activePaths.delete(pathId);
    this.addCompletedPath(userPath);
  }

  /**
   * Handle step errors with recovery attempts
   */
  private async handleStepError(userPath: UserPath, step: UserPathStep, error: Error): Promise<void> {
    const context = createErrorContext(
      `user_path_${userPath.name}`,
      step.name,
      {
        pathId: userPath.id,
        stepIndex: userPath.steps.length - 1,
        userId: userPath.userId,
      }
    );

    try {
      const recovered = await errorRecoveryService.recoverFromError(error, context);

      if (recovered) {
        // Add recovery step
        this.addStep(userPath.id, `${step.name}_recovery`, true, {
          originalError: error.message,
          recoveryAttempted: true,
        });
      }
    } catch (recoveryError) {
      console.error('Error recovery failed:', recoveryError);
    }
  }

  /**
   * Analyze completed path for insights
   */
  private analyzePath(userPath: UserPath): void {
    const analysis = {
      pathName: userPath.name,
      totalDuration: userPath.totalDuration,
      stepCount: userPath.steps.length,
      success: userPath.success,
      averageStepDuration: userPath.totalDuration! / userPath.steps.length,
      slowestStep: this.findSlowestStep(userPath),
      errorSteps: userPath.steps.filter(step => !step.success),
    };

    // Check for performance issues
    if (userPath.totalDuration! > this.getPathThreshold(userPath.name)) {
      SentryUtils.trackUserAction('user_path_slow', {
        pathId: userPath.id,
        pathName: userPath.name,
        duration: userPath.totalDuration,
        threshold: this.getPathThreshold(userPath.name),
        analysis,
      });
    }

    // Check for error patterns
    if (analysis.errorSteps.length > 0) {
      SentryUtils.trackUserAction('user_path_errors', {
        pathId: userPath.id,
        pathName: userPath.name,
        errorCount: analysis.errorSteps.length,
        errorSteps: analysis.errorSteps.map(step => ({
          name: step.name,
          error: step.errors?.[0]?.message,
        })),
      });
    }

    // Track path metrics
    performanceMonitor.trackMetric({
      name: `user_path.${userPath.name}.completion_rate`,
      value: userPath.success ? 1 : 0,
      unit: 'boolean',
      tags: {
        path: userPath.name,
        success: userPath.success.toString(),
      },
    });

    performanceMonitor.trackMetric({
      name: `user_path.${userPath.name}.duration`,
      value: userPath.totalDuration!,
      unit: 'ms',
      tags: {
        path: userPath.name,
        success: userPath.success.toString(),
      },
    });
  }

  /**
   * Find the slowest step in a path
   */
  private findSlowestStep(userPath: UserPath): UserPathStep | null {
    return userPath.steps.reduce((slowest, current) => {
      if (!slowest || (current.duration && current.duration > (slowest.duration || 0))) {
        return current;
      }
      return slowest;
    }, null as UserPathStep | null);
  }

  /**
   * Get performance threshold for a path
   */
  private getPathThreshold(pathName: string): number {
    const thresholds: Record<string, number> = {
      'authentication_login': 5000,
      'authentication_signup': 10000,
      'task_creation': 3000,
      'study_session_start': 2000,
      'ai_interaction': 10000,
      'document_upload': 15000,
      'payment_checkout': 8000,
    };

    return thresholds[pathName] || 5000; // Default 5 seconds
  }

  /**
   * Add completed path to history
   */
  private addCompletedPath(userPath: UserPath): void {
    this.completedPaths.unshift(userPath);

    // Keep only the most recent paths
    if (this.completedPaths.length > this.maxCompletedPaths) {
      this.completedPaths = this.completedPaths.slice(0, this.maxCompletedPaths);
    }
  }

  /**
   * Generate unique path ID
   */
  private generatePathId(pathName: string): string {
    return `${pathName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session ID
   */
  private getSessionId(): string {
    // Try to get session ID from various sources
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem('session_id') ||
             window.localStorage.getItem('session_id') ||
             `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get path statistics
   */
  getPathStats(): Record<string, any> {
    const activePathsArray = Array.from(this.activePaths.values());
    const allPaths = [...activePathsArray, ...this.completedPaths];

    const stats: Record<string, any> = {
      activePaths: activePathsArray.length,
      completedPaths: this.completedPaths.length,
      totalPaths: allPaths.length,
    };

    // Group by path name
    const pathGroups: Record<string, UserPath[]> = {};
    allPaths.forEach(path => {
      if (!pathGroups[path.name]) {
        pathGroups[path.name] = [];
      }
      pathGroups[path.name].push(path);
    });

    // Calculate stats per path type
    stats.pathTypes = Object.entries(pathGroups).map(([name, paths]) => {
      const completed = paths.filter(p => p.endTime);
      const successful = completed.filter(p => p.success);

      return {
        name,
        total: paths.length,
        completed: completed.length,
        successful: successful.length,
        successRate: completed.length > 0 ? successful.length / completed.length : 0,
        averageDuration: completed.length > 0 ?
          completed.reduce((sum, p) => sum + (p.totalDuration || 0), 0) / completed.length : 0,
      };
    });

    return stats;
  }

  /**
   * Get active paths
   */
  getActivePaths(): UserPath[] {
    return Array.from(this.activePaths.values());
  }

  /**
   * Get completed paths
   */
  getCompletedPaths(limit?: number): UserPath[] {
    return limit ? this.completedPaths.slice(0, limit) : this.completedPaths;
  }

  /**
   * Clear all monitoring data
   */
  clear(): void {
    this.activePaths.clear();
    this.completedPaths = [];
  }
}

// Export singleton instance
export const userPathMonitoring = UserPathMonitoring.getInstance();

// Pre-configured monitoring functions for common paths
export const AuthMonitoring = {
  startLogin: (metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('authentication_login', undefined, metadata),

  startSignup: (metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('authentication_signup', undefined, metadata),

  startPasswordReset: (metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('authentication_password_reset', undefined, metadata),

  addLoginStep: (pathId: string, step: string, success: boolean = true, metadata?: Record<string, any>, error?: Error) =>
    userPathMonitoring.addStep(pathId, step, success, metadata, error),

  completeAuth: (pathId: string, success: boolean = true, userId?: string) =>
    userPathMonitoring.completePath(pathId, success, { userId }),
};

export const TaskMonitoring = {
  startTaskCreation: (userId: string, metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('task_creation', userId, metadata),

  startTaskEdit: (userId: string, taskId: string, metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('task_edit', userId, { taskId, ...metadata }),

  addTaskStep: (pathId: string, step: string, success: boolean = true, metadata?: Record<string, any>, error?: Error) =>
    userPathMonitoring.addStep(pathId, step, success, metadata, error),

  completeTask: (pathId: string, success: boolean = true, taskId?: string) =>
    userPathMonitoring.completePath(pathId, success, { taskId }),
};

export const StudySessionMonitoring = {
  startSession: (userId: string, sessionType: string, metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('study_session_start', userId, { sessionType, ...metadata }),

  startFocusMode: (userId: string, metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('focus_mode_start', userId, metadata),

  addSessionStep: (pathId: string, step: string, success: boolean = true, metadata?: Record<string, any>, error?: Error) =>
    userPathMonitoring.addStep(pathId, step, success, metadata, error),

  completeSession: (pathId: string, success: boolean = true, sessionId?: string) =>
    userPathMonitoring.completePath(pathId, success, { sessionId }),
};

export const AIMonitoring = {
  startAIInteraction: (userId: string, interactionType: string, metadata?: Record<string, any>) =>
    userPathMonitoring.startPath('ai_interaction', userId, { interactionType, ...metadata }),

  addAIStep: (pathId: string, step: string, success: boolean = true, metadata?: Record<string, any>, error?: Error) =>
    userPathMonitoring.addStep(pathId, step, success, metadata, error),

  completeAI: (pathId: string, success: boolean = true, responseTime?: number) =>
    userPathMonitoring.completePath(pathId, success, { responseTime }),
};