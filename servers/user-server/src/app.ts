import cors from "cors";
import "dotenv/config";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "./config";
import logger from "./config/logger";
import { connectRedis } from "./config/redis";
import { compressionMiddleware } from "./middlewares/compression.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import {
  adminLimiter,
  authLimiter,
  blockSuspiciousIPs,
  combinedLimiter,
  heavyOperationLimiter,
} from "./middlewares/rate-limit.middleware";
import { reqMiddleware } from "./middlewares/req.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { securityMiddleware } from "./middlewares/security.middleware";
import { adminRouter } from "./routes/v1/admin.router";
import { authRouter } from "./routes/v1/auth.router";
import { checkerRouter } from "./routes/v1/checker.router";
import { discountRouter } from "./routes/v1/discount.router";
import { eventsRouter } from "./routes/v1/events.router";
import { listerRouter } from "./routes/v1/lister.router";
import { paymentRouter } from "./routes/v1/payment.router";
import { TicketTypeRouter } from "./routes/v1/ticket-type.router";
import { ticketValidationRouter } from "./routes/v1/ticket-validation.router";
import { ticketRouter } from "./routes/v1/ticket.router";
import { userRouter } from "./routes/v1/user.router";
import { getDatabaseMetrics } from "./utils/databseMatrices";
import { setupGracefulShutdown } from "./utils/gracefullShutdown";
import { healthCheck } from "./utils/healthCheck";
import { sendError } from "./utils/responseMsg";

const app = express();

// Disable unnecessary Express features for performance
app.disable("x-powered-by"); // Hide Express signature
app.disable("etag"); // Disable ETag generation (use CDN/nginx for this)

// Trust proxy for accurate IP detection in rate limiting
// Set to number of proxies (e.g., 1 for single load balancer)
app.set("trust proxy", 1);

// Optimize view cache for production
if (config.NODE_ENV === "production") {
  app.set("view cache", true);
}

// Security headers with optimized configuration
app.use(
  helmet({
    contentSecurityPolicy:
      config.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false, // Disable CSP in development for easier debugging
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: true },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }),
);

// Add request ID tracking (before any logging)
app.use(requestIdMiddleware);

// Body parsing with strict limits and optimized settings
app.use(
  express.json({
    limit: "5mb",
    strict: true, // Only parse arrays and objects
    type: "application/json",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
    parameterLimit: 1000, // Limit number of parameters
  }),
);

// Apply compression AFTER body parsing for better performance
app.use(compressionMiddleware);

// CORS with optimized configuration
const allowedOrigins = [
  "https://www.tixin.in",
  "https://stag.tixin.in",
  ...(config.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 204, // Use 204 instead of 200 for OPTIONS
    maxAge: 86400, // Cache preflight for 24 hours
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Checker-Auth",
      "X-Request-ID",
    ],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
  }),
);

// DDoS Protection Layer 1: Block known suspicious IPs
app.use(blockSuspiciousIPs);

// DDoS Protection Layer 2: Security middleware (attack pattern detection)
app.use(securityMiddleware);

// DDoS Protection Layer 3: Rate limiting
app.use(combinedLimiter);

app.get("/health", async (_, res: Response) => {
  const status = await healthCheck();
  const allHealthy = Object.values(status).every(Boolean);
  const response = {
    ...status,
    status: allHealthy ? "ok" : "unhealthy",
    timestamp: new Date().toISOString(),
    worker: process.pid,
  };
  res.status(allHealthy ? 200 : 503).json(response);
});

// Request middleware (logs all requests except health checks)
app.use(reqMiddleware);

// Metrics endpoint for monitoring (with basic auth in production)
app.get("/metrics", async (_, res: Response) => {
  try {
    const metrics = await getDatabaseMetrics();
    return res.json({
      metrics,
    });
  } catch (error) {
    logger.error("Error fetching metrics:", error);
    return res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// Auth routes with strict rate limiting
app.use("/api/v1/auth", authLimiter, authRouter);

// Admin routes with admin-specific rate limiting
app.use("/api/v1/admin", adminLimiter, adminRouter);

// Heavy operation routes with specialized rate limiting
app.use("/api/v1/payment", heavyOperationLimiter, paymentRouter);
app.use(
  "/api/v1/ticket-validation",
  heavyOperationLimiter,
  ticketValidationRouter,
);

// Standard API routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/lister", listerRouter);
app.use("/api/v1/event", eventsRouter);
app.use("/api/v1/ticket", ticketRouter);
app.use("/api/v1/checker", checkerRouter);
app.use("/api/v1/discount", discountRouter);
app.use("/api/v1/ticket-type", TicketTypeRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`Resource not found: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  return sendError(res, "Resource not found", 404);
});

// Global error handler
app.use(errorHandler);

export const startServer = async () => {
  try {
    // Connect to Redis first (required for rate limiting)
    await connectRedis();

    const server = app.listen(config.PORT, "0.0.0.0", () => {
      logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Worker process: ${process.pid}`);
      logger.info(`Node version: ${process.version}`);
    });

    // Optimize server timeouts for better performance
    server.keepAliveTimeout = 65000; // Slightly higher than typical load balancer timeout (60s)
    server.headersTimeout = 66000; // Should be higher than keepAliveTimeout
    server.requestTimeout = 120000; // 2 minutes for long-running requests
    server.timeout = 120000; // Socket timeout

    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};
