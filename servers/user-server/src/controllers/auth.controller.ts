import type { Request, Response } from "express";
import AuthService from "../services/auth.service";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  requestOtpSchema,
  verifyOtpSchema,
} from "../validators/auth.validator";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async requestOtp(req: Request, res: Response) {
    try {
      const { identifier } = requestOtpSchema.parse(req.body);
      await this.authService.requestOtp(identifier);
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
      const { identifier, otp } = verifyOtpSchema.parse(req.body);
      const data = await this.authService.verifyOtp(identifier, otp);
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
