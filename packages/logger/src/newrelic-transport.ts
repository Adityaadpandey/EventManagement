/**
 * Winston transport for New Relic
 * This sends logs directly to New Relic using their logging API
 */

import Transport from "winston-transport";

class NewRelicTransport extends Transport {
  private newrelic: any;

  constructor(opts?: any) {
    super(opts);

    // Try to load New Relic
    try {
      if (process.env.NEW_RELIC_LICENSE_KEY) {
        this.newrelic = require("newrelic");
      }
    } catch (error) {
      console.warn("New Relic not available for logging");
    }
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Send to New Relic if available
    if (this.newrelic) {
      try {
        // For error logs, use noticeError
        if (info.level === "error") {
          const error = info.error || new Error(String(info.message));
          const attributes: Record<string, any> = {
            service: info.service,
            logLevel: info.level,
            timestamp: info.timestamp,
          };

          // Add metadata
          if (info.requestId) attributes.requestId = info.requestId;
          if (info.userId) attributes.userId = info.userId;
          if (info.statusCode) attributes.statusCode = info.statusCode;
          if (info.errorId) attributes.errorId = info.errorId;
          if (info.url) attributes.url = info.url;
          if (info.method) attributes.method = info.method;

          this.newrelic.noticeError(error, attributes);
        }

        // For all logs, record custom event
        const logEvent: Record<string, any> = {
          service: info.service,
          level: info.level,
          message: String(info.message),
          timestamp: info.timestamp,
        };

        // Add optional fields
        if (info.requestId) logEvent.requestId = info.requestId;
        if (info.userId) logEvent.userId = info.userId;
        if (info.eventId) logEvent.eventId = info.eventId;
        if (info.ticketId) logEvent.ticketId = info.ticketId;
        if (info.statusCode) logEvent.statusCode = info.statusCode;
        if (info.duration) logEvent.duration = info.duration;
        if (info.url) logEvent.url = info.url;
        if (info.method) logEvent.method = info.method;

        this.newrelic.recordCustomEvent("ApplicationLog", logEvent);
      } catch (error) {
        // Silently fail - don't break logging if New Relic has issues
      }
    }

    callback();
  }
}

export default NewRelicTransport;
