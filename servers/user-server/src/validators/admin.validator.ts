import z from "zod";

export const promoteUserSchema = z.object({
	userId: z.string().uuid(),
	newRole: z.enum(["ADMIN", "LISTER", "USER"]),
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
