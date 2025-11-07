import type { Request } from "express";
import logger from "../config/logger";

interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

const getRequestContext = (req: Request): LogContext => {
  return {
    requestId: req.requestId,
    userId: (req as any).userId, // If you have auth middleware that sets userId
  };
};

export const logInfo = (req: Request, message: string, meta?: object) => {
  logger.info(message, {
    ...getRequestContext(req),
    ...meta,
  });
};

export const logWarn = (req: Request, message: string, meta?: object) => {
  logger.warn(message, {
    ...getRequestContext(req),
    ...meta,
  });
};

export const logError = (
  req: Request,
  message: string,
  error?: any,
  meta?: object,
) => {
  logger.error(message, {
    ...getRequestContext(req),
    error: error?.message || error,
    stack: error?.stack,
    ...meta,
  });
};

export const logDebug = (req: Request, message: string, meta?: object) => {
  logger.debug(message, {
    ...getRequestContext(req),
    ...meta,
  });
};
