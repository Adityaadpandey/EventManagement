import type { NextFunction, Request, Response } from "express";
import logger from "../config/logger";

export const reqMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = process.hrtime();
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  logger.info(`Incoming request: ${req.method} ${req.originalUrl} from ${ip}`, {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    ip,
    userAgent: req.get("User-Agent"),
  });

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    logger.info(
      `Request completed: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${durationMs} ms`,
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: parseFloat(durationMs),
      },
    );
  });

  next();
};
