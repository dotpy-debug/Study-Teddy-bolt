import { Injectable, Logger } from '@nestjs/common';
import { SentryService } from '../../sentry/sentry.service';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing - requests are rejected
  HALF_OPEN = 'HALF_OPEN', // Testing - allowing some requests through
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time to wait before trying half-open (ms)
  monitoringPeriod: number; // Period to monitor failures (ms)
  volumeThreshold: number; // Minimum requests before considering failure rate
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChangeTime: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitBreakerInstance> = new Map();

  constructor(private readonly sentryService: SentryService) {}

  /**
   * Create or get a circuit breaker
   */
  getCircuit(config: CircuitBreakerConfig): CircuitBreakerInstance {
    let circuit = this.circuits.get(config.name);

    if (!circuit) {
      circuit = new CircuitBreakerInstance(config, this.sentryService, this.logger);
      this.circuits.set(config.name, circuit);
      this.logger.log(`Created circuit breaker: ${config.name}`);
    }

    return circuit;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const config = this.getDefaultConfig(circuitName);
    const circuit = this.getCircuit(config);

    return circuit.execute(operation, fallback);
  }

  /**
   * Get stats for all circuits
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, circuit] of this.circuits) {
      stats[name] = circuit.getStats();
    }

    return stats;
  }

  /**
   * Reset a circuit breaker
   */
  resetCircuit(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.reset();
      this.logger.log(`Reset circuit breaker: ${name}`);
    }
  }

  /**
   * Force open a circuit breaker
   */
  forceOpen(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.forceOpen();
      this.logger.warn(`Forced open circuit breaker: ${name}`);
    }
  }

  /**
   * Force close a circuit breaker
   */
  forceClose(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.forceClose();
      this.logger.log(`Forced close circuit breaker: ${name}`);
    }
  }

  private getDefaultConfig(name: string): CircuitBreakerConfig {
    return {
      name,
      failureThreshold: 5, // Open after 5 failures
      successThreshold: 3, // Close after 3 successes in half-open
      timeout: 60000, // Wait 1 minute before half-open
      monitoringPeriod: 300000, // Monitor failures over 5 minutes
      volumeThreshold: 10, // Need at least 10 requests
    };
  }
}

class CircuitBreakerInstance {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private stateChangeTime: number = Date.now();
  private recentRequests: Array<{ timestamp: number; success: boolean }> = [];

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly sentryService: SentryService,
    private readonly logger: Logger,
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    this.cleanOldRequests();

    // Check if circuit should allow the request
    if (!this.allowRequest()) {
      this.trackMetric('circuit_breaker.request_rejected', 1);

      if (fallback) {
        this.logger.debug(`Circuit ${this.config.name} is open, executing fallback`);
        return fallback();
      } else {
        const error = new Error(`Circuit breaker ${this.config.name} is OPEN`);
        this.sentryService.captureException(error, {
          circuit_breaker: {
            name: this.config.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
          },
        });
        throw error;
      }
    }

    try {
      this.trackMetric('circuit_breaker.request_allowed', 1);
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request should be allowed
   */
  private allowRequest(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if timeout has passed
        if (now - this.stateChangeTime >= this.config.timeout) {
          this.setState(CircuitState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.addRequest(true);

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.setState(CircuitState.CLOSED);
          this.reset();
        }
        break;

      case CircuitState.CLOSED:
        this.reset();
        break;
    }

    this.trackMetric('circuit_breaker.success', 1);
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;
    this.addRequest(false);

    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.shouldOpen()) {
        this.setState(CircuitState.OPEN);
      }
    }

    this.trackMetric('circuit_breaker.failure', 1);
  }

  /**
   * Check if circuit should open based on failure rate
   */
  private shouldOpen(): boolean {
    const recentRequests = this.getRecentRequests();

    if (recentRequests.length < this.config.volumeThreshold) {
      return false;
    }

    const recentFailures = recentRequests.filter((r) => !r.success).length;
    const failureRate = recentFailures / recentRequests.length;

    return failureRate >= this.config.failureThreshold / this.config.volumeThreshold;
  }

  /**
   * Change circuit state
   */
  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateChangeTime = Date.now();

    this.logger.log(`Circuit ${this.config.name} state changed: ${oldState} -> ${newState}`);

    this.trackMetric('circuit_breaker.state_change', 1, {
      from_state: oldState,
      to_state: newState,
    });

    // Alert on circuit opening
    if (newState === CircuitState.OPEN) {
      this.sentryService.captureMessage(
        `Circuit breaker ${this.config.name} opened due to failures`,
        'warning',
      );
    }
  }

  /**
   * Reset circuit to initial state
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.recentRequests = [];
  }

  /**
   * Force circuit to open state
   */
  forceOpen(): void {
    this.setState(CircuitState.OPEN);
  }

  /**
   * Force circuit to closed state
   */
  forceClose(): void {
    this.setState(CircuitState.CLOSED);
    this.reset();
  }

  /**
   * Get current circuit stats
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangeTime: this.stateChangeTime,
    };
  }

  /**
   * Add request to recent requests tracking
   */
  private addRequest(success: boolean): void {
    this.recentRequests.push({
      timestamp: Date.now(),
      success,
    });
  }

  /**
   * Get recent requests within monitoring period
   */
  private getRecentRequests(): Array<{ timestamp: number; success: boolean }> {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    return this.recentRequests.filter((r) => r.timestamp > cutoff);
  }

  /**
   * Clean old requests outside monitoring period
   */
  private cleanOldRequests(): void {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.recentRequests = this.recentRequests.filter((r) => r.timestamp > cutoff);
  }

  /**
   * Track metrics with Sentry
   */
  private trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.sentryService.trackMetric({
      name,
      value,
      tags: {
        circuit_name: this.config.name,
        circuit_state: this.state,
        ...tags,
      },
    });
  }
}

/**
 * Decorator for circuit breaker protection
 */
export function WithCircuitBreaker(circuitName: string, fallback?: () => any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const circuitBreakerService = this.circuitBreakerService as CircuitBreakerService;

      if (!circuitBreakerService) {
        // If no circuit breaker service available, just call original method
        return await originalMethod.apply(this, args);
      }

      return circuitBreakerService.execute(
        circuitName,
        () => originalMethod.apply(this, args),
        fallback ? () => fallback.apply(this, args) : undefined,
      );
    };

    return descriptor;
  };
}
