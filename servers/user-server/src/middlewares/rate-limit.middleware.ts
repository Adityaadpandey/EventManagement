// middlewares/rate-limit.middleware.ts - Enhanced DDoS/DoS Protection
import type { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { config } from "../config";
import logger from "../config/logger";
import { redis } from "../config/redis";

const BLOCK_PREFIX = "blocked_ip:";
const VIOLATION_PREFIX = "ip_violations:";
const BLOCK_TTL = 60 * 60; // 1 hour in seconds
const VIOLATION_TTL = 60 * 60; // track violations for 1 hour
const VIOLATION_THRESHOLD = 5;

// Single shared Redis store instance (reused across all limiters)
const sharedRedisStore = new RedisStore({
  sendCommand: (...args: string[]) =>
    redis.call(args[0], ...args.slice(1)) as Promise<any>,
  prefix: "rl:",
});

// Helper function to get IP address with proper fallback
const getClientIP = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  return ((forwarded as string)?.split(",")[0] ||
    realIp ||
    req.ip ||
    "unknown") as string;
};

// Track violations in Redis so all workers share the state
const trackSuspiciousIP = async (ip: string): Promise<void> => {
  try {
    const violationKey = `${VIOLATION_PREFIX}${ip}`;
    const count = await redis.incr(violationKey);
    if (count === 1) {
      // First violation — set expiry
      await redis.expire(violationKey, VIOLATION_TTL);
    }
    if (count >= VIOLATION_THRESHOLD) {
      const blockKey = `${BLOCK_PREFIX}${ip}`;
      await redis.set(blockKey, "1", "EX", BLOCK_TTL);
      logger.error(`IP blocked due to repeated violations: ${ip}`, {
        violations: count,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error("Redis error in trackSuspiciousIP", { err, ip });
  }
};

// Middleware to block suspicious IPs — checked in Redis, shared across workers
export const blockSuspiciousIPs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const ip = getClientIP(req);
  try {
    const blocked = await redis.get(`${BLOCK_PREFIX}${ip}`);
    if (blocked) {
      logger.warn(`Blocked request from suspicious IP: ${ip}`, {
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
      });
      res.status(403).json({
        error:
          "Access denied. Your IP has been temporarily blocked due to suspicious activity.",
        retryAfter: "1 hour",
      });
      return;
    }
  } catch (err) {
    // Redis down — fail open to avoid blocking legitimate traffic
    logger.error("Redis error in blockSuspiciousIPs, failing open", {
      err,
      ip,
    });
  }
  next();
};

// Enhanced general limiter
export const limiter = rateLimit({
  store: sharedRedisStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    return `general:${ipKeyGenerator(ip)}`;
  },
  skip: (req: Request) => {
    if (config.NODE_ENV !== "production") return true;
    return req.path === "/health" || req.path === "/metrics";
  },
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip).catch(() => {});
    logger.warn(`Rate limit reached`, {
      ip,
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

// STRICT rate limiter for authentication routes
export const authLimiter = rateLimit({
  store: sharedRedisStore,
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  message: {
    error: "Too many authentication attempts. Please try again later.",
    retryAfter: "15 minutes",
  },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    return `auth:${ipKeyGenerator(ip)}`;
  },
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip).catch(() => {});
    logger.error(`Auth rate limit reached - potential brute force attack`, {
      ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    res.status(429).json({
      error: "Too many authentication attempts. Please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

// Rate limiter for heavy operations
export const heavyOperationLimiter = rateLimit({
  store: sharedRedisStore,
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    return `heavy:${ipKeyGenerator(ip)}`;
  },
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip).catch(() => {});
    logger.warn(`Heavy operation rate limit reached`, {
      ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    res.status(429).json({
      error: "Too many resource-intensive requests. Please slow down.",
      retryAfter: "5 minutes",
    });
  },
});

// Burst rate limiter — tightest window, first line of defence
export const burstLimiter = rateLimit({
  store: sharedRedisStore,
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true },
  message: {
    error: "Request rate too high. Please slow down.",
    retryAfter: "1 minute",
  },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    return `burst:${ipKeyGenerator(ip)}`;
  },
  skip: (req: Request) => req.path === "/health" || req.path === "/metrics",
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip).catch(() => {});
    logger.warn(`Burst rate limit reached - potential DDoS`, {
      ip,
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });
    res.status(429).json({
      error: "Request rate too high. Please slow down.",
      retryAfter: "1 minute",
    });
  },
});

export const adminLimiter = rateLimit({
  store: sharedRedisStore,
  windowMs: 15 * 60 * 1000,
  max: 40,
  validate: { trustProxy: true },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    const userId = (req as any).user?.id || "anonymous";
    return `admin:${ipKeyGenerator(ip)}:${userId}`;
  },
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip).catch(() => {});
    logger.error(`Admin rate limit reached - SECURITY ALERT`, {
      ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(429).json({
      error: "Too many admin requests. Access temporarily restricted.",
      retryAfter: "15 minutes",
    });
  },
});

export const combinedLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  burstLimiter(req, res, (err: any) => {
    if (err) return next(err);
    limiter(req, res, next);
  });
};
