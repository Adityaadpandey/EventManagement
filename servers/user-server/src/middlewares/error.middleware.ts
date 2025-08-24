// middlewares/errorHandler.ts
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import logger from "../config/logger";
import type { CustomError } from "../types";
import { sendError } from "../utils/responseMsg";

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error(error);

  if (error instanceof z.ZodError) {
    return sendError(res, "Invalid input", 400, error.issues);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    logger.error({
      message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
    });
  }

  return sendError(res, message, statusCode);
};
