import z from "zod";

export const promotionSchema = z.object({
  content: z.string(),
  toEventId: z.string(),
  emailTemplate: z.string().optional(),
});

export const changeEventStatusSchema = z.object({
  eventId: z.string().uuid(),
  newStatus: z.enum([
    "NOT_VIEWED",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLATION_REQUESTED",
    "CANCELLED",
  ]),
  reason: z.string().optional(),
});
