import { z } from "zod";

export const createDiscountSchema = z.object({
  code: z.string().min(1, "Discount code is required"),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FLAT"], {
    message: "Discount type must be PERCENTAGE or FLAT",
  }),
  discountPct: z
    .number()
    .min(0.01, "Percentage must be at least 0.01")
    .max(100, "Percentage cannot exceed 100")
    .optional(),
  discountAmt: z
    .number()
    .min(0.01, "Discount amount must be at least 0.01")
    .optional(),
  maxDiscount: z
    .number()
    .min(0, "Max discount must be non-negative")
    .optional(),
  minOrderAmt: z
    .number()
    .min(0, "Minimum order amount must be non-negative")
    .optional(),
  maxUses: z.number().min(1, "Max uses must be at least 1").optional(),
  validFrom: z.coerce.date({ message: "Valid from date is required" }),
  validTo: z.coerce.date({ message: "Valid until date is required" }),
});
