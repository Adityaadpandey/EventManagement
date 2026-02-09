/**
 * Prometheus HTTP metrics middleware.
 * Tracks request count, duration, and active connections.
 */

import type { Request, Response, NextFunction } from "express";
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
} from "../utils/prometheusMetrics";

/**
 * Collapse dynamic path segments (UUIDs, ObjectIDs, numeric IDs) to `:id`
 * to prevent high-cardinality label explosion in Prometheus.
 */
const normalizeRoute = (path: string): string => {
  return path
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ":id",
    ) // UUID
    .replace(/[0-9a-f]{24}/gi, ":id") // MongoDB ObjectId
    .replace(/\/\d+/g, "/:id"); // Numeric IDs
};

export const prometheusMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Skip instrumentation for metrics/health endpoints
  if (
    req.path === "/metrics" ||
    req.path === "/metrics/json" ||
    req.path === "/health"
  ) {
    next();
    return;
  }

  const method = req.method;
  const start = process.hrtime.bigint();

  httpActiveRequests.labels(method).inc();

  res.on("finish", () => {
    const route = normalizeRoute(req.path);
    const statusCode = res.statusCode.toString();
    const durationSec = Number(process.hrtime.bigint() - start) / 1_000_000_000;

    httpRequestsTotal.labels(method, route, statusCode).inc();
    httpRequestDuration.labels(method, route, statusCode).observe(durationSec);
    httpActiveRequests.labels(method).dec();
  });

  next();
};
