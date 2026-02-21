import { z } from "zod";

export const applyForListerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLogo: z.string().url("Company logo must be a valid URL").optional(),
  bio: z.string().min(1, "Bio is required"),
});

export const updateListerSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyLogo: z.string().url("Company logo must be a valid URL").optional(),
  bio: z.string().min(1).optional(),
});
