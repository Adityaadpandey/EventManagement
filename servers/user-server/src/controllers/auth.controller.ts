// controllers/auth.controller.ts
import type { Request, Response } from "express";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import AuthService from "../services/auth.service";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
	requestOtpSchema,
	verifyOtpSchema,
} from "../validators/auth.validator";

const normalizePhone = (rawPhone: string) => {
	const phone = parsePhoneNumberFromString(rawPhone, "IN");
	if (!phone?.isValid()) throw new Error("Invalid phone number");
	return phone.number;
};

export class AuthController {
	private authService: AuthService;

	constructor() {
		this.authService = new AuthService();
	}

	async requestOtp(req: Request, res: Response) {
		try {
			const { phone } = requestOtpSchema.parse(req.body); // validate input
			const normalizedPhone = normalizePhone(phone);
			await this.authService.requestOtp(normalizedPhone);

			return sendSuccess(res, "OTP sent successfully");
		} catch (error: any) {
			if (error.name === "ZodError") {
				return sendError(
					res,
					error.errors?.[0]?.message || "Validation error",
					400,
				);
			}
			return sendError(res, error.message || "Failed to send OTP", 400);
		}
	}

	async verifyOtp(req: Request, res: Response) {
		try {
			const { phone, otp } = verifyOtpSchema.parse(req.body); // validate input
			const normalizedPhone = normalizePhone(phone);
			const data = await this.authService.verifyOtp(normalizedPhone, otp);

			return sendSuccess(res, "OTP verified successfully", data);
		} catch (error: any) {
			if (error.name === "ZodError") {
				return sendError(
					res,
					error.errors?.[0]?.message || "Validation error",
					400,
				);
			}
			return sendError(res, error.message || "Failed to verify OTP", 400);
		}
	}
}
