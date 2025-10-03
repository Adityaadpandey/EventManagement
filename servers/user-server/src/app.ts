import cors from "cors";
import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { config } from "./config";
import logger from "./config/logger";
import { connectRedis } from "./config/redis";
import { compressionMiddleware } from "./middlewares/compression.middleware";
import {
  adminLimiter,
  authLimiter,
  blockSuspiciousIPs,
  combinedLimiter,
  heavyOperationLimiter,
} from "./middlewares/rate-limit.middleware";
import { reqMiddleware } from "./middlewares/req.middleware";
import { securityMiddleware } from "./middlewares/security.middleware";
import { adminRouter } from "./routes/v1/admin.router";
import { authRouter } from "./routes/v1/auth.router";
import { checkerRouter } from "./routes/v1/checker.router";
import { eventsRouter } from "./routes/v1/events.router";
import { listerRouter } from "./routes/v1/lister.router";
import { paymentRouter } from "./routes/v1/payment.router";
import { ticketValidationRouter } from "./routes/v1/ticket-validation.router";
import { ticketRouter } from "./routes/v1/ticket.router";
import { userRouter } from "./routes/v1/user.router";
import { getDatabaseMetrics } from "./utils/databseMatrices";
import { setupGracefulShutdown } from "./utils/gracefullShutdown";
import { healthCheck } from "./utils/healthCheck";
import { sendError } from "./utils/responseMsg";

const app = express();

// Trust proxy for accurate IP detection in rate limiting
app.set("trust proxy", true);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// Apply compression early in the middleware chain
app.use(compressionMiddleware);

// Body parsing with strict limits for DDoS protection
app.use(express.json({ limit: "5mb" })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// CORS with proper configuration
app.use(
  cors({
    origin: ["https://www.tixin.in", "http://localhost:3000"],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400, // Cache preflight for 24 hours
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Handle OPTIONS requests early (before security middleware)
app.options("*", (req, res) => {
  res.status(200).end();
});

// DDoS Protection Layer 1: Block known suspicious IPs
app.use(blockSuspiciousIPs);

// DDoS Protection Layer 2: Security middleware (attack pattern detection)
app.use(securityMiddleware);

// DDoS Protection Layer 3: Rate limiting
app.use(combinedLimiter);

// Request middleware
app.use(reqMiddleware);

// Health check endpoint (no rate limiting)
app.get("/health", async (_, res: Response) => {
  const status = await healthCheck();
  const allHealthy = Object.values(status).every(Boolean);
  res.status(allHealthy ? 200 : 503).json({
    ...status,
    status: allHealthy ? "ok" : "unhealthy",
    timestamp: new Date().toISOString(),
    worker: process.pid,
  });
});

// Metrics endpoint for monitoring
app.get("/metrics", async (req: Request, res: Response) => {
  return res.json({
    getDatabaseMetrics: await getDatabaseMetrics(),
  });
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

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`Resource not found: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  return sendError(res, "Resource not found", 404);
});

// Enhanced error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Generate unique error ID for tracking
  const errorId = Math.random().toString(36).substr(2, 9);

  logger.error("Unhandled error:", {
    errorId,
    error: err.message,
    stack: config.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Don't leak error details in production
  const message =
    config.NODE_ENV === "production"
      ? `Internal server error (ID: ${errorId})`
      : err.message;

  return sendError(res, message, 500);
});

export const startServer = async () => {
  try {
    // Connect to Redis first (required for rate limiting)
    await connectRedis();

    const server = app.listen(config.PORT, "0.0.0.0", () => {
      logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Worker process: ${process.pid}`);
    });

    server.keepAliveTimeout = 65000; // Slightly higher than typical load balancer timeout
    server.headersTimeout = 66000; // Should be higher than keepAliveTimeout

    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};
