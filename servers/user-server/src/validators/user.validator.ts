import { z } from "zod";

export const updateUserProfileSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    email: z.string().email("Invalid email address").optional(),
    avatar: z.string().url("Invalid avatar URL").optional(),
  })
  .refine((data) => data.name || data.email || data.avatar, {
    message: "At least one field (name, email, avatar) is required to update",
  });
