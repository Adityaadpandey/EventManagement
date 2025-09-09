// middlewares/rate-limit.middleware.ts
import type { Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { config } from "../config";
import logger from "../config/logger";
import { redis } from "../config/redis";

// Create Redis store for rate limiting
const createRedisStore = () => {
  return new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(args[0], ...args.slice(1)) as Promise<any>,
    prefix: "rl:", // Rate limit prefix
  });
};

// Helper function to get IP address with proper fallback
const getClientIP = (req: Request): string => {
  // Handle forwarded IPs from load balancers/proxies
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const ip =
    (forwarded as string)?.split(",")[0] || realIp || req.ip || "unknown";
  return ip as string;
};

// Enhanced general limiter with Redis backend
export const limiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased for your dedicated app server (was 100)
  standardHeaders: true,
  validate: {
    trustProxy: true,
  },
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  // Custom key generator with proper IPv6 handling
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    return `general:${ipKeyGenerator(ip)}`;
  },
  // Skip in non-production and for health checks and metrics
  skip: (req: Request) => {
    if (config.NODE_ENV !== "production") return true;
    return req.path === "/health" || req.path === "/metrics";
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit reached`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

// Strict rate limiter for authentication routes
export const authLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
    retryAfter: "15 minutes",
  },
  validate: {
    trustProxy: true,
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit reached`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: "Too many authentication attempts. Please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

// Rate limiter for heavy operations (payments, validations)
export const heavyOperationLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 heavy operations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
  },
  // Use default keyGenerator for simplicity and security
  handler: (req: Request, res: Response) => {
    logger.warn(`Heavy operation rate limit reached`, {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: "Too many resource-intensive requests. Please slow down.",
      retryAfter: "5 minutes",
    });
  },
});

// Burst rate limiter for high-frequency requests
export const burstLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  validate: {
    trustProxy: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Request rate too high. Please slow down.",
    retryAfter: "1 minute",
  },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    return `burst:${ipKeyGenerator(ip)}`;
  },
  skip: (req: Request) => {
    return req.path === "/health" || req.path === "/metrics";
  },
});

export const adminLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 admin requests per 15 minutes
  validate: {
    trustProxy: true,
  },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    const userId = (req as any).user?.id || "anonymous";
    return `admin:${ipKeyGenerator(ip)}:${userId}`;
  },
  handler: (req: Request, res: Response) => {
    logger.error(`Admin rate limit reached - potential security concern`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
    });
    res.status(429).json({
      error: "Too many admin requests. Access temporarily restricted.",
      retryAfter: "15 minutes",
    });
  },
});

export const combinedLimiter = (req: Request, res: Response, next: any) => {
  // Apply burst protection first
  burstLimiter(req, res, (err: any) => {
    if (err) return next(err);

    // Then apply general limiter
    limiter(req, res, next);
  });
};
