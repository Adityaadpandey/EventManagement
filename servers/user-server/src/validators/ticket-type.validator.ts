import { z } from "zod";

// Custom Field Schema
const customFieldSchema = z.object({
  label: z
    .string()
    .min(1, "Custom field label is required")
    .max(100, "Label must not exceed 100 characters")
    .trim(),
  fieldType: z
    .string()
    .min(1, "Custom fieldType is required")
    .max(50, "Field type must not exceed 50 characters"),
  required: z.boolean({
    message: "Custom field 'required' must be a boolean",
  }),
  options: z
    .string()
    .max(1000, "Options must not exceed 1000 characters")
    .optional()
    .nullable(),
});

// Ticket Type Schema
export const ticketTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Ticket name is required")
    .max(100, "Ticket name must not exceed 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
  price: z
    .number()
    .nonnegative("Price must be a non-negative number")
    .finite("Price must be a valid number"),
  discountedPrice: z
    .number()
    .nonnegative("Discounted price must be a non-negative number")
    .finite("Discounted price must be a valid number")
    .optional()
    .nullable(),
  discountReason: z
    .string()
    .max(200, "Discount reason must not exceed 200 characters")
    .optional()
    .nullable(),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be a positive number")
    .max(100000, "Quantity cannot exceed 100,000"),
  ticketPrefix: z
    .string()
    .min(2, "Ticket prefix must be at least 2 characters")
    .max(10, "Ticket prefix must not exceed 10 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "Ticket prefix must contain only uppercase letters and numbers",
    )
    .optional()
    .nullable(),
  salesCutoff: z.string().optional().nullable(),
  customField: z
    .array(customFieldSchema)
    .max(20, "Cannot exceed 20 custom fields per ticket type")
    .optional(),
});

// Patch Ticket Type Schema
export const patchTicketType = ticketTypeSchema.partial();
