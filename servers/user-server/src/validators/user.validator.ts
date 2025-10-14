import { z } from "zod";

export const updateUserProfileSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    email: z.string().email("Invalid email address").optional(),
    avatar: z.string().url("Invalid avatar URL").optional(),
    phone: z.string().min(13, "Invalid phone number").optional(),
  })

  .refine((data) => data.name || data.email || data.avatar || data.phone, {
    message:
      "At least one field (name, email, avatar, phone) is required to update",
  });
