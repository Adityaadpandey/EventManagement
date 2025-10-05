import { z } from "zod";

export const createDiscountSchema = z.object({
  code: z.string().min(1, "Discount code is required"),
  discountPct: z
    .number()
    .min(1, "Percentage must be at least 1")
    .max(100, "Percentage cannot exceed 100"),
  maxUses: z.number().min(1, "Max uses must be at least 1"),
  validFrom: z.coerce.date({ message: "Valid from date is required" }),
  validTo: z.coerce.date({ message: "Valid until date is required" }),
});
