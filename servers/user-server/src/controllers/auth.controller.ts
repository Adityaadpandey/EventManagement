import type { Request, Response } from "express";
import { blacklistToken } from "../lib/cache";
import AuthService from "../services/auth.service";
import type { AuthenticatedRequest } from "../types/auth";
import { isAppError } from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
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

      logInfo(req, "Requesting OTP", { identifier });
      await this.authService.requestOtp(identifier);
      return sendSuccess(res, "OTP sent successfully");
    } catch (error: any) {
      if (error.name === "ZodError") {
        logError(req, "Failed to send OTP", error, {
          identifier: req.body.identifier,
        });
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to send OTP", 500);
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { identifier, otp } = verifyOtpSchema.parse(req.body);
      logInfo(req, "Verifying OTP", { identifier });
      const data = await this.authService.verifyOtp(identifier, otp);
      return sendSuccess(res, "OTP verified successfully", data);
    } catch (error: any) {
      if (error.name === "ZodError") {
        logError(req, "Failed to verify OTP", error, {
          identifier: req.body.identifier,
        });
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to verify OTP", 500);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      if (token) {
        await blacklistToken(token);
      }
      return sendSuccess(res, "Logged out successfully");
    } catch (error: any) {
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to logout", 500);
    }
  }
}
