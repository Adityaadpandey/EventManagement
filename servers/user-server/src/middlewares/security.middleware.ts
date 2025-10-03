// middlewares/security.middleware.ts - Advanced DDoS/DoS Protection
import type { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

// Detect and block common attack patterns
export const detectAttackPatterns = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userAgent = req.get("User-Agent") || "";
  const referer = req.get("Referer") || "";
  const url = req.url.toLowerCase();
  const body = JSON.stringify(req.body).toLowerCase();

  // Block requests with no user agent
  if (!userAgent) {
    logger.warn("Blocked request with no user agent", {
      ip: req.ip,
      url: req.url,
    });
    return res.status(403).json({ error: "Invalid request" });
  }

  // Block common bot user agents
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /go-http-client/i,
    /java/i,
    /scanner/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
  ];

  if (botPatterns.some((pattern) => pattern.test(userAgent))) {
    logger.warn("Blocked bot/scraper request", {
      ip: req.ip,
      userAgent,
      url: req.url,
    });
    return res.status(403).json({ error: "Access denied" });
  }

  // Block SQL injection attempts
  const sqlPatterns = [
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /update.*set/i,
    /exec.*\(/i,
    /script.*>/i,
  ];

  if (sqlPatterns.some((pattern) => pattern.test(url) || pattern.test(body))) {
    logger.error("SQL injection attempt detected", {
      ip: req.ip,
      url: req.url,
      userAgent,
    });
    return res.status(403).json({ error: "Invalid request" });
  }

  // Block XSS attempts
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\(/i,
    /alert\(/i,
  ];

  if (xssPatterns.some((pattern) => pattern.test(url) || pattern.test(body))) {
    logger.error("XSS attempt detected", {
      ip: req.ip,
      url: req.url,
      userAgent,
    });
    return res.status(403).json({ error: "Invalid request" });
  }

  // Block suspicious referers
  const suspiciousReferers = [
    /baidu/i,
    /semalt/i,
    /viagra/i,
    /cialis/i,
    /poker/i,
    /casino/i,
  ];

  if (suspiciousReferers.some((pattern) => pattern.test(referer))) {
    logger.warn("Blocked suspicious referer", {
      ip: req.ip,
      referer,
      url: req.url,
    });
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};

// Validate request size to prevent memory exhaustion
export const validateRequestSize = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const contentLength = parseInt(req.get("Content-Length") || "0", 10);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    logger.warn("Request too large", {
      ip: req.ip,
      contentLength,
      url: req.url,
    });
    return res.status(413).json({ error: "Request entity too large" });
  }

  next();
};

// Detect and block slowloris attacks
const requestTimestamps = new Map<string, number[]>();

export const detectSlowloris = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // Clean old timestamps (older than 10 seconds)
  const recentTimestamps = timestamps.filter((ts) => now - ts < 10000);
  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);

  // If more than 50 requests in 10 seconds from same IP, it's suspicious
  if (recentTimestamps.length > 50) {
    logger.error("Potential slowloris attack detected", {
      ip,
      requestCount: recentTimestamps.length,
      url: req.url,
    });
    return res.status(429).json({
      error: "Too many concurrent requests",
      retryAfter: "10 seconds",
    });
  }

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance
    for (const [key, value] of requestTimestamps.entries()) {
      if (value.length === 0 || now - value[value.length - 1] > 60000) {
        requestTimestamps.delete(key);
      }
    }
  }

  next();
};

// Validate JSON payloads
export const validateJSON = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const contentType = req.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      try {
        // Body is already parsed by express.json()
        if (typeof req.body !== "object") {
          throw new Error("Invalid JSON");
        }
      } catch (error) {
        logger.warn("Invalid JSON payload", {
          ip: req.ip,
          url: req.url,
        });
        return res.status(400).json({ error: "Invalid JSON payload" });
      }
    }
  }

  next();
};

// Detect rapid-fire requests (potential DDoS)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const detectRapidFire = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const data = requestCounts.get(ip);

  if (!data || now > data.resetTime) {
    // Reset counter every second
    requestCounts.set(ip, { count: 1, resetTime: now + 1000 });
  } else {
    data.count++;

    // If more than 20 requests per second, block
    if (data.count > 20) {
      logger.error("Rapid-fire requests detected - potential DDoS", {
        ip,
        count: data.count,
        url: req.url,
        userAgent: req.get("User-Agent"),
      });
      return res.status(429).json({
        error: "Request rate too high",
        retryAfter: "1 second",
      });
    }
  }

  next();
};

// Combined security middleware
export const securityMiddleware = [
  validateRequestSize,
  detectAttackPatterns,
  validateJSON,
  detectSlowloris,
  detectRapidFire,
];
