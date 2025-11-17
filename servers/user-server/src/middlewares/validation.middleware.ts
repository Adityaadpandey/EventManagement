import type { NextFunction, Request, Response } from "express";
import { ZodSchema, ZodError } from "zod";
import { formatZodError } from "../utils/formatZodError";
import { sendError } from "../utils/responseMsg";

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }
      next(error);
    }
  };
};

/**
 * Middleware to validate request query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      // Cast to any to bypass TypeScript's strict type checking for query params
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Query validation error" },
          400,
        );
      }
      next(error);
    }
  };
};

/**
 * Middleware to validate request params against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      // Cast to any to bypass TypeScript's strict type checking for params
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Parameter validation error" },
          400,
        );
      }
      next(error);
    }
  };
};
