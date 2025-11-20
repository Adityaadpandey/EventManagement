/**
 * Database error handler to wrap Prisma errors and prevent information leakage
 */

import logger from "../config/logger";
import { DatabaseError, ServiceUnavailableError } from "./errors";

/**
 * Check if error is a Prisma/database error
 */
export const isDatabaseError = (error: any): boolean => {
  return (
    error?.code?.startsWith("P") || // Prisma error codes
    error?.message?.includes("prisma") ||
    error?.message?.includes("database") ||
    error?.message?.includes("Authentication failed") ||
    error?.message?.includes("connection") ||
    error?.name === "PrismaClientKnownRequestError" ||
    error?.name === "PrismaClientUnknownRequestError" ||
    error?.name === "PrismaClientRustPanicError" ||
    error?.name === "PrismaClientInitializationError" ||
    error?.name === "PrismaClientValidationError"
  );
};

/**
 * Wrap database operations to catch and sanitize errors
 */
export const wrapDatabaseOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string = "Database operation",
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Log the actual error for debugging
    logger.error(`${operationName} failed`, {
      error: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Check for specific Prisma error codes
    if (error.code) {
      switch (error.code) {
        case "P1001": // Can't reach database server
        case "P1002": // Database server timeout
        case "P1008": // Operations timed out
        case "P1017": // Server closed connection
          throw new ServiceUnavailableError(
            "Database is temporarily unavailable. Please try again later.",
          );

        case "P2002": // Unique constraint violation
          const target = error.meta?.target || "field";
          throw new DatabaseError(`Duplicate ${target} already exists`);

        case "P2003": // Foreign key constraint violation
          throw new DatabaseError("Related record not found");

        case "P2025": // Record not found
          throw new DatabaseError("Record not found");

        default:
          // Generic database error - don't expose details
          throw new DatabaseError(
            "A database error occurred. Please try again later.",
          );
      }
    }

    // If it's a database error but no specific code
    if (isDatabaseError(error)) {
      throw new ServiceUnavailableError(
        "Service temporarily unavailable. Please try again later.",
      );
    }

    // Re-throw if it's not a database error
    throw error;
  }
};

/**
 * Sanitize database error message for client response
 */
export const sanitizeDatabaseError = (error: any): string => {
  // Never expose actual database error messages to clients
  if (isDatabaseError(error)) {
    // Check for connection errors
    if (
      error.code === "P1001" ||
      error.code === "P1002" ||
      error.code === "P1008" ||
      error.code === "P1017" ||
      error.message?.includes("Authentication failed") ||
      error.message?.includes("connection")
    ) {
      return "Service temporarily unavailable. Please try again later.";
    }

    // Generic database error
    return "A database error occurred. Please try again later.";
  }

  // Return original message if not a database error
  return error.message || "An error occurred";
};
