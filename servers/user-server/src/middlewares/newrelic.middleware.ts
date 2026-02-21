/**
 * New Relic middleware for enhanced tracking
 */

import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";
import {
  addCustomAttributes,
  recordCustomEvent,
  getTransaction,
} from "../utils/newrelic";

/**
 * Add custom attributes to New Relic transactions
 */
export const newrelicMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Add custom attributes to the transaction
  const attributes: Record<string, any> = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get("User-Agent") || "unknown",
    ip: req.ip,
  };

  // Add user info if authenticated
  if (req.user) {
    attributes.userId = req.user.userId;
    attributes.userRole = req.user.role;
  }

  // Add query params (sanitized)
  if (Object.keys(req.query).length > 0) {
    attributes.hasQueryParams = true;
    attributes.queryParamCount = Object.keys(req.query).length;
  }

  // Add body size if present
  if (req.body && Object.keys(req.body).length > 0) {
    attributes.hasBody = true;
    attributes.bodyFieldCount = Object.keys(req.body).length;
  }

  addCustomAttributes(attributes);

  // Track response time
  const startTime = Date.now();

  // Get the current transaction to add response attributes properly
  const transaction = getTransaction();

  // Intercept the res.end to capture response details before transaction ends
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;

    // Add response attributes while transaction is still active
    if (transaction) {
      addCustomAttributes({
        statusCode: res.statusCode,
        responseTime: duration,
        success: res.statusCode < 400,
      });
    }

    // Record custom event for API calls (events don't require active transaction)
    recordCustomEvent("ApiRequest", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId || "anonymous",
      userRole: req.user?.role || "none",
      success: res.statusCode < 400,
    });

    // Call the original end method
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Track business events in New Relic
 */
export const trackBusinessEvent = (
  eventType: string,
  attributes: Record<string, any>,
) => {
  recordCustomEvent(eventType, {
    ...attributes,
    timestamp: new Date().toISOString(),
  });
};
