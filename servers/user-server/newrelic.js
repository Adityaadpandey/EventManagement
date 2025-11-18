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
   */
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || "info",
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
};
