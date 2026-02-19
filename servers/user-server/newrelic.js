"use strict";

/**
 * New Relic agent configuration.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || "user-server"],

  /**
   * Your New Relic license key.
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY || "",

  /**
   * Logging level
   * Options: 'fatal', 'error', 'warn', 'info', 'debug', 'trace'
   * Use 'warn' for local development to reduce noise
   */
  logging: {
    level:
      process.env.NEW_RELIC_LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "warn"),
    filepath: "stdout",
  },

  /**
   * Distributed tracing
   */
  distributed_tracing: {
    enabled: true,
  },

  /**
   * Allow all headers
   */
  allow_all_headers: true,

  /**
   * Application logging - IMPORTANT for log forwarding!
   */
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000,
    },
    metrics: {
      enabled: true,
    },
    local_decorating: {
      enabled: false,
    },
  },

  /**
   * Custom insights events
   */
  custom_insights_events: {
    enabled: true,
    max_samples_stored: 10000,
  },

  /**
   * Transaction tracer
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 500,
    record_sql: "obfuscated",
  },

  /**
   * Error collector
   */
  error_collector: {
    enabled: true,
    ignore_status_codes: [400, 401, 403, 404],
    capture_events: true,
  },

  /**
   * Attributes - control which attributes are included/excluded
   */
  attributes: {
    include: [
      "request.headers.accept",
      "request.headers.contentType",
      "request.headers.host",
      "request.headers.userAgent",
      "request.headers.x-request-id",
      "request.method",
      "request.uri",
      "response.status",
      "response.headers.contentType",
    ],
    exclude: [
      "request.headers.authorization",
      "request.headers.cookie",
      "request.headers.set-cookie",
      "request.parameters.password",
      "request.parameters.token",
    ],
  },

  /**
   * Slow SQL analysis
   */
  slow_sql: {
    enabled: true,
    max_samples: 10,
  },

  /**
   * Browser monitoring (disabled by default - requires a Browser key)
   */
  browser_monitoring: {
    enable: false,
  },

  /**
   * Labels for environment tagging
   */
  labels: {
    environment: process.env.NODE_ENV || "development",
    service: process.env.NEW_RELIC_APP_NAME || "user-server",
  },
};
