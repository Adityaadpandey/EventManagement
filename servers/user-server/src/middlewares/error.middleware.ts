import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { config } from "../config";
import logger from "../config/logger";
import { AppError, isAppError, isOperationalError } from "../utils/errors";
import {
  isDatabaseError,
  sanitizeDatabaseError,
} from "../utils/databaseErrorHandler";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(2, 9);
  const isDev = config.NODE_ENV !== "production";
  const wantsDebug = isDev || req.query.debug === "true";

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn("Validation error", {
      errorId,
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      issues: err.issues,
    });

    return res.status(400).json({
      status: "error",
      errorId,
      requestId: req.requestId,
      message: "Validation failed",
      issues: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Handle custom AppError instances
  if (isAppError(err)) {
    const logLevel = err.statusCode >= 500 ? "error" : "warn";

    logger[logLevel]("Application error", {
      errorId,
      requestId: req.requestId,
      message: err.message,
      error: err, // Pass the error object for New Relic
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.userId,
      userAgent: req.get("User-Agent"),
      ...(err.statusCode >= 500 && { stack: err.stack }),
    });

    const errorResponse: Record<string, any> = {
      status: "error",
      errorId,
      requestId: req.requestId,
      message: err.message,
    };

    if (wantsDebug && err.stack) {
      errorResponse.stack = err.stack.split("\n");
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle unexpected errors
  const isOperational = isOperationalError(err);
  const isDbError = isDatabaseError(err);

  logger.error("Unhandled error", {
    errorId,
    requestId: req.requestId,
    message: err.message,
    error: err, // Pass the error object for New Relic
    stack: err.stack,
    code: err.code,
    isOperational,
    isDatabaseError: isDbError,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.userId,
    userAgent: req.get("User-Agent"),
  });

  // For non-operational errors in production, log as critical
  if (!isOperational && config.NODE_ENV === "production") {
    logger.error("CRITICAL: Non-operational error in production", {
      errorId,
      message: err.message,
      error: err, // Pass the error object for New Relic
      stack: err.stack,
      code: err.code,
      critical: true,
      isOperational: false,
      requestId: req.requestId,
      userId: (req as any).user?.userId,
    });
  }

  // Sanitize error message for production
  let clientMessage: string;

  if (wantsDebug) {
    // In development, show actual error (but still sanitize DB credentials)
    clientMessage = isDbError ? sanitizeDatabaseError(err) : err.message;
  } else {
    // In production, always sanitize
    clientMessage = isDbError
      ? sanitizeDatabaseError(err)
      : `Internal server error (ID: ${errorId})`;
  }

  const errorResponse: Record<string, any> = {
    status: "error",
    errorId,
    requestId: req.requestId,
    message: clientMessage,
  };

  if (wantsDebug && err.stack && !isDbError) {
    // Don't expose stack traces for database errors even in debug mode
    errorResponse.stack = err.stack.split("\n");
  }

  // Use 503 for database errors, 500 for others
  const statusCode = isDbError ? 503 : 500;

  return res.status(statusCode).json(errorResponse);
};
