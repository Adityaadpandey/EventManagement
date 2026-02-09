/**
 * Prometheus HTTP metrics middleware.
 * Tracks request count, duration, and active connections.
 */

import type { Request, Response, NextFunction } from "express";
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
  httpRequestsByDevice,
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

/**
 * Classify user-agent into a low-cardinality device category.
 */
const classifyDevice = (ua: string): string => {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  if (
    /bot|crawl|spider|slurp|wget|curl|httpclient|python-requests|go-http|java\/|okhttp/i.test(
      lower,
    )
  )
    return "bot";
  if (
    /mobile|android|iphone|ipod|windows phone|opera mini|opera mobi/i.test(
      lower,
    )
  )
    return "mobile";
  if (/ipad|tablet|kindle|silk|playbook/i.test(lower)) return "tablet";
  return "desktop";
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

  // Track device category
  const device = classifyDevice(req.get("User-Agent") || "");
  httpRequestsByDevice.labels(device).inc();

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
