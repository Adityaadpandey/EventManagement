// controllers/auth.controller.ts
import { Request, Response } from "express";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import AuthService from "../services/auth.service";
import { sendError, sendSuccess } from "../utils/responseMsg";

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
    const { phone } = req.body;

    if (!phone) {
      return sendError(res, "Phone number is required", 400);
    }

    try {
      const normalizedPhone = normalizePhone(phone);
      await this.authService.requestOtp(normalizedPhone);

      return sendSuccess(res, "OTP sent successfully");
    } catch (error: any) {
      return sendError(res, error.message || "Failed to send OTP");
    }
  }

  async verifyOtp(req: Request, res: Response) {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return sendError(res, "Phone number and OTP are required", 400);
    }

    try {
      const normalizedPhone = normalizePhone(phone);
      const data = await this.authService.verifyOtp(normalizedPhone, otp);

      return sendSuccess(res, "OTP verified successfully", data);
    } catch (error: any) {
      return sendError(res, error.message || "Failed to verify OTP");
    }
  }
}
