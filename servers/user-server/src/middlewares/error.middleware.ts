import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { config } from "../config";
import logger from "../config/logger";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(2, 9);
  const isDev = config.NODE_ENV !== "production";
  const wantsDebug = isDev || req.query.debug === "true";

  // Handle Zod errors first
  if (err instanceof ZodError) {
    logger.warn("Validation error", {
      errorId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      issues: err.issues, // ← log structured Zod issues
    });

    return res.status(400).json({
      errorId,
      message: "Validation failed",
      issues: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Log all other errors
  logger.error("Unhandled error", {
    errorId,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  const errorResponse: Record<string, any> = {
    errorId,
    message: wantsDebug
      ? err.message
      : `Internal server error (ID: ${errorId})`,
  };

  if (wantsDebug && err.stack) {
    errorResponse.stack = err.stack.split("\n");
  }

  return res.status(500).json(errorResponse);
};
