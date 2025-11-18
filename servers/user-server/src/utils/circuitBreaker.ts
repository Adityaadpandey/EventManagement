/**
 * Circuit Breaker pattern implementation for external service calls
 * Prevents cascading failures by failing fast when a service is down
 */

import logger from "../config/logger";
import { ServiceUnavailableError } from "./errors";

enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Service is down, fail fast
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes to close circuit from half-open
  timeout: number; // Time in ms before attempting to close circuit
  name: string; // Name for logging
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000, // 1 minute default
      name: options.name || "UnnamedService",
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn(
          `Circuit breaker OPEN for ${this.options.name}, failing fast`,
        );
        throw new ServiceUnavailableError(
          `Service ${this.options.name} is temporarily unavailable`,
        );
      }
      // Try to recover
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      logger.info(
        `Circuit breaker entering HALF_OPEN state for ${this.options.name}`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        logger.info(`Circuit breaker CLOSED for ${this.options.name}`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      logger.error(
        `Circuit breaker OPEN for ${this.options.name} after ${this.failureCount} failures. ` +
          `Will retry at ${new Date(this.nextAttempt).toISOString()}`,
      );
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt:
        this.state === CircuitState.OPEN ? new Date(this.nextAttempt) : null,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info(`Circuit breaker manually reset for ${this.options.name}`);
  }
}

// Pre-configured circuit breakers for common services
export const razorpayCircuitBreaker = new CircuitBreaker({
  name: "Razorpay",
  failureThreshold: 5,
  timeout: 60000,
});

export const emailCircuitBreaker = new CircuitBreaker({
  name: "Email",
  failureThreshold: 10,
  timeout: 30000,
});

export const smsCircuitBreaker = new CircuitBreaker({
  name: "SMS",
  failureThreshold: 10,
  timeout: 30000,
});
