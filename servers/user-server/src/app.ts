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
import { securityMiddleware } from "./middlewares/security.middleware";

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

// Add request ID tracking (before any logging)
app.use(requestIdMiddleware);

// Body parsing with strict limits for DDoS protection
app.use(express.json({ limit: "5mb" })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// CORS with proper configuration
app.use(
  cors({
    origin: [
      "https://www.tixin.in",
      "http://localhost:3000",
      "https://stag.tixin.in",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400, // Cache preflight for 24 hours
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Checker-Auth",
    ],
  }),
);

// Handle OPTIONS requests early (before security middleware)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  next();
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
