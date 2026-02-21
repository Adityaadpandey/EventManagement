import { z } from "zod";

/**
 * Common validation schemas used across the application
 */

// UUID validation
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Event ID param validation
export const eventIdParamSchema = z.object({
  eventId: uuidSchema,
});

// Ticket ID param validation
export const ticketIdParamSchema = z.object({
  ticketId: uuidSchema,
});

// User ID param validation
export const userIdParamSchema = z.object({
  userId: uuidSchema,
});

// Pagination query validation
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

// Location query validation
export const locationQuerySchema = z.object({
  longitude: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  latitude: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
});

// Email validation
export const emailSchema = z.string().email("Invalid email format");

// Phone validation (basic)
export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must not exceed 15 digits");

// Date string validation
export const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  });

// Positive integer validation
export const positiveIntSchema = z
  .number()
  .int("Must be an integer")
  .positive("Must be a positive number");

// Non-negative number validation
export const nonNegativeNumberSchema = z
  .number()
  .nonnegative("Must be a non-negative number");
