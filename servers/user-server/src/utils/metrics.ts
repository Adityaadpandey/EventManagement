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

/**
 * Format metrics for Prometheus (optional)
 */
export const formatPrometheusMetrics = (
  metrics: ApplicationMetrics,
): string => {
  const lines: string[] = [];

  // Memory metrics
  lines.push(`# HELP nodejs_memory_heap_used_bytes Heap used in bytes`);
  lines.push(`# TYPE nodejs_memory_heap_used_bytes gauge`);
  lines.push(`nodejs_memory_heap_used_bytes ${metrics.memory.heapUsed}`);

  lines.push(`# HELP nodejs_memory_heap_total_bytes Heap total in bytes`);
  lines.push(`# TYPE nodejs_memory_heap_total_bytes gauge`);
  lines.push(`nodejs_memory_heap_total_bytes ${metrics.memory.heapTotal}`);

  // Uptime
  lines.push(`# HELP nodejs_uptime_seconds Process uptime in seconds`);
  lines.push(`# TYPE nodejs_uptime_seconds counter`);
  lines.push(`nodejs_uptime_seconds ${metrics.uptime}`);

  // Circuit breaker states
  for (const [name, stats] of Object.entries(metrics.circuitBreakers)) {
    lines.push(
      `# HELP circuit_breaker_state Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)`,
    );
    lines.push(`# TYPE circuit_breaker_state gauge`);
    const stateValue =
      stats.state === "CLOSED" ? 0 : stats.state === "HALF_OPEN" ? 1 : 2;
    lines.push(`circuit_breaker_state{service="${name}"} ${stateValue}`);

    lines.push(`# HELP circuit_breaker_failures Circuit breaker failure count`);
    lines.push(`# TYPE circuit_breaker_failures counter`);
    lines.push(
      `circuit_breaker_failures{service="${name}"} ${stats.failureCount}`,
    );
  }

  return lines.join("\n");
};
