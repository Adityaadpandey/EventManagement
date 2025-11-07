import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware to add a unique request ID to each request
 * Uses X-Request-ID header if provided, otherwise generates a new UUID
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Use existing request ID from header or generate new one
  const requestId =
    (req.headers["x-request-id"] as string) ||
    (req.headers["x-correlation-id"] as string) ||
    randomUUID();

  // Attach to request object for use in controllers/services
  req.requestId = requestId;

  // Set response header for client tracking
  res.setHeader("X-Request-ID", requestId);

  next();
};
