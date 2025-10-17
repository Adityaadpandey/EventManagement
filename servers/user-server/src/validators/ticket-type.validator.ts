import { z } from "zod";

export const ticketTypeSchema = z
  .object({
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

    salesCutoff: z
      .string()
      .refine(
        (val) => {
          if (!val) return true; // Optional field
          const date = new Date(val);
          return !isNaN(date.getTime()) && date > new Date();
        },
        { message: "Sales cutoff must be a valid future date" },
      )
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // If discountedPrice is provided, it must be less than price
      if (data.discountedPrice !== null && data.discountedPrice !== undefined) {
        return data.discountedPrice < data.price;
      }
      return true;
    },
    {
      message: "Discounted price must be less than regular price",
      path: ["discountedPrice"],
    },
  )
  .refine(
    (data) => {
      // If discountedPrice is provided, discountReason should be provided
      if (data.discountedPrice !== null && data.discountedPrice !== undefined) {
        return data.discountReason && data.discountReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Discount reason is required when discounted price is provided",
      path: ["discountReason"],
    },
  );

export const patchTicketType = ticketTypeSchema.partial().refine(
  (data) => {
    if (
      data.discountedPrice !== null &&
      data.discountedPrice !== undefined &&
      data.price !== undefined
    ) {
      return data.discountedPrice < data.price;
    }
    return true;
  },
  {
    message: "Discounted price must be less than regular price",
    path: ["discountedPrice"],
  },
);
