/**
 * Application metrics collection for monitoring
 */

import {
  razorpayCircuitBreaker,
  emailCircuitBreaker,
  smsCircuitBreaker,
} from "./circuitBreaker";

interface CircuitBreakerMetrics {
  [key: string]: {
    state: string;
    failureCount: number;
    successCount: number;
    nextAttempt: Date | null;
  };
}

interface ApplicationMetrics {
  uptime: number;
  timestamp: string;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  circuitBreakers: CircuitBreakerMetrics;
  process: {
    pid: number;
    version: string;
    platform: string;
    arch: string;
  };
}

/**
 * Collect application metrics
 */
export const collectMetrics = (): ApplicationMetrics => {
  return {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    circuitBreakers: {
      razorpay: razorpayCircuitBreaker.getStats(),
      email: emailCircuitBreaker.getStats(),
      sms: smsCircuitBreaker.getStats(),
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
};
