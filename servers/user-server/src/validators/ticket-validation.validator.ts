import { z } from "zod";

export const checkerLoginSchema = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

export const scanTicketSchema = z.object({
	qrCode: z.string().min(1, "QR code is required"),
	deviceInfo: z.string().optional(),
	note: z.string().optional(),
});

export const resetTicketScanSchema = z.object({
	note: z.string().optional(),
});
