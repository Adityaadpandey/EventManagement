/**
 * Prometheus metrics using prom-client with a custom registry
 * to avoid conflicts with New Relic's default registry.
 */

import client, {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";
import {
  razorpayCircuitBreaker,
  emailCircuitBreaker,
  smsCircuitBreaker,
} from "./circuitBreaker";
import {
  emailQueue,
  otpQueue,
  notificationQueue,
  analyticsQueue,
} from "../lib/queues";

// Custom registry — keeps prom-client metrics isolated from New Relic
export const registry = new Registry();

registry.setDefaultLabels({ app: "tixin-backend" });

// Collect Node.js default metrics (heap, GC, event loop lag, CPU, etc.)
collectDefaultMetrics({ register: registry });

// ── Custom application metrics ──────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpActiveRequests = new Gauge({
  name: "http_active_requests",
  help: "Number of in-flight HTTP requests",
  labelNames: ["method"] as const,
  registers: [registry],
});

export const circuitBreakerState = new Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)",
  labelNames: ["service"] as const,
  registers: [registry],
});

export const circuitBreakerFailureCount = new Gauge({
  name: "circuit_breaker_failure_count",
  help: "Circuit breaker current failure count",
  labelNames: ["service"] as const,
  registers: [registry],
});

export const circuitBreakerSuccessCount = new Gauge({
  name: "circuit_breaker_success_count",
  help: "Circuit breaker current success count",
  labelNames: ["service"] as const,
  registers: [registry],
});

// ── Device / client category tracking ───────────────────────────────

export const httpRequestsByDevice = new Counter({
  name: "http_requests_by_device_total",
  help: "HTTP requests by device category",
  labelNames: ["device"] as const,
  registers: [registry],
});

// ── BullMQ worker queue gauges ──────────────────────────────────────

export const bullmqWaiting = new Gauge({
  name: "bullmq_queue_waiting",
  help: "Number of waiting jobs in BullMQ queue",
  labelNames: ["queue"] as const,
  registers: [registry],
});

export const bullmqActive = new Gauge({
  name: "bullmq_queue_active",
  help: "Number of active jobs in BullMQ queue",
  labelNames: ["queue"] as const,
  registers: [registry],
});

export const bullmqCompleted = new Gauge({
  name: "bullmq_queue_completed",
  help: "Number of completed jobs in BullMQ queue",
  labelNames: ["queue"] as const,
  registers: [registry],
});

export const bullmqFailed = new Gauge({
  name: "bullmq_queue_failed",
  help: "Number of failed jobs in BullMQ queue",
  labelNames: ["queue"] as const,
  registers: [registry],
});

export const bullmqDelayed = new Gauge({
  name: "bullmq_queue_delayed",
  help: "Number of delayed jobs in BullMQ queue",
  labelNames: ["queue"] as const,
  registers: [registry],
});

// ── Circuit breaker sync helper ─────────────────────────────────────

const stateToNum = (state: string): number => {
  switch (state) {
    case "CLOSED":
      return 0;
    case "HALF_OPEN":
      return 1;
    case "OPEN":
      return 2;
    default:
      return -1;
  }
};

const breakers: Record<string, typeof razorpayCircuitBreaker> = {
  razorpay: razorpayCircuitBreaker,
  email: emailCircuitBreaker,
  sms: smsCircuitBreaker,
};

export const updateCircuitBreakerMetrics = (): void => {
  for (const [name, breaker] of Object.entries(breakers)) {
    const stats = breaker.getStats();
    circuitBreakerState.labels(name).set(stateToNum(stats.state));
    circuitBreakerFailureCount.labels(name).set(stats.failureCount);
    circuitBreakerSuccessCount.labels(name).set(stats.successCount);
  }
};

// ── BullMQ queue sync helper ────────────────────────────────────────

const queues = {
  emails: emailQueue,
  otps: otpQueue,
  notifications: notificationQueue,
  analytics: analyticsQueue,
};

const updateQueueMetrics = async (): Promise<void> => {
  for (const [name, queue] of Object.entries(queues)) {
    try {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      );
      bullmqWaiting.labels(name).set(counts.waiting ?? 0);
      bullmqActive.labels(name).set(counts.active ?? 0);
      bullmqCompleted.labels(name).set(counts.completed ?? 0);
      bullmqFailed.labels(name).set(counts.failed ?? 0);
      bullmqDelayed.labels(name).set(counts.delayed ?? 0);
    } catch {
      // Queue may not be ready yet — skip silently
    }
  }
};

// ── Exports for the /metrics endpoint ───────────────────────────────

export const getMetrics = async (): Promise<string> => {
  updateCircuitBreakerMetrics();
  await updateQueueMetrics();
  return registry.metrics();
};

export const getContentType = (): string => {
  return registry.contentType;
};
