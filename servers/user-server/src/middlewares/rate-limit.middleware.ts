// middlewares/rate-limit.middleware.ts - Enhanced DDoS/DoS Protection
import type { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { config } from "../config";
import logger from "../config/logger";
import { redis } from "../config/redis";

// Suspicious IP tracking
const suspiciousIPs = new Set<string>();
const ipViolationCount = new Map<string, number>();

// Create Redis store for rate limiting with enhanced configuration
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

// Track and block suspicious IPs
const trackSuspiciousIP = (ip: string) => {
  const count = (ipViolationCount.get(ip) || 0) + 1;
  ipViolationCount.set(ip, count);

  // Block IP after 5 violations within tracking period
  if (count >= 5) {
    suspiciousIPs.add(ip);
    logger.error(`IP blocked due to repeated violations: ${ip}`, {
      violations: count,
      timestamp: new Date().toISOString(),
    });

    // Auto-unblock after 1 hour
    setTimeout(
      () => {
        suspiciousIPs.delete(ip);
        ipViolationCount.delete(ip);
        logger.info(`IP unblocked: ${ip}`);
      },
      60 * 60 * 1000,
    );
  }
};

// Middleware to block suspicious IPs
export const blockSuspiciousIPs = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = getClientIP(req);

  if (suspiciousIPs.has(ip)) {
    logger.warn(`Blocked request from suspicious IP: ${ip}`, {
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });
    return res.status(403).json({
      error:
        "Access denied. Your IP has been temporarily blocked due to suspicious activity.",
      retryAfter: "1 hour",
    });
  }

  next();
};

// Enhanced general limiter with DDoS protection
export const limiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250, // Reduced from 300 for better protection
  standardHeaders: true,
  validate: {
    trustProxy: true,
  },
  legacyHeaders: false,
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
    trackSuspiciousIP(ip);

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

// STRICT rate limiter for authentication routes (DDoS protection)
export const authLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000,
  max: 8, // Reduced from 10 for better security
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
    const ip = getClientIP(req);
    trackSuspiciousIP(ip);

    logger.error(`Auth rate limit reached - potential brute force attack`, {
      ip: req.ip,
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

// Rate limiter for heavy operations with DDoS protection
export const heavyOperationLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // Reduced from 20 for better protection
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
  },
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip);

    logger.warn(`Heavy operation rate limit reached`, {
      ip: req.ip,
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

// Burst rate limiter for DDoS protection
export const burstLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Reduced from 100 for better protection
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
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip);

    logger.warn(`Burst rate limit reached - potential DDoS`, {
      ip: req.ip,
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
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // Reduced from 50 for better security
  validate: {
    trustProxy: true,
  },
  keyGenerator: (req: Request) => {
    const ip = getClientIP(req);
    const userId = (req as any).user?.id || "anonymous";
    return `admin:${ipKeyGenerator(ip)}:${userId}`;
  },
  handler: (req: Request, res: Response) => {
    const ip = getClientIP(req);
    trackSuspiciousIP(ip);

    logger.error(`Admin rate limit reached - SECURITY ALERT`, {
      ip: req.ip,
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

export const combinedLimiter = (req: Request, res: Response, next: any) => {
  // Apply burst protection first
  burstLimiter(req, res, (err: any) => {
    if (err) return next(err);

    // Then apply general limiter
    limiter(req, res, next);
  });
};
