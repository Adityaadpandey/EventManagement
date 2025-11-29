import { Response } from "express";
import { BankDetailsService } from "../services/bankDetails.service";
import { AuthenticatedRequest } from "../types/auth";
import { isAppError, UnauthorizedError } from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { bankDetailsSchema } from "../validators/bankDetails.validator";

export class BankDetailsController {
  private bankDetailsService: BankDetailsService;

  constructor() {
    this.bankDetailsService = new BankDetailsService();
  }

  async addOrUpdateBankDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedData = bankDetailsSchema.parse(req.body);

      logInfo(req, "Adding/Updating bank details", {
        userId,
        bankName: validatedData.bankName,
      });
      const bankDetails = await this.bankDetailsService.addOrUpdateBankDetails(
        userId,
        validatedData,
      );
      return sendSuccess(res, "Bank details saved successfully", bankDetails);
    } catch (error: any) {
      logError(req, "Failed to add/update bank details", error, {
        userId: req.user?.userId,
      });
      if (error.name === "ZodError") {
        logError(req, "Failed to add/update bank details", error, {
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
      return sendError(res, "Failed to add/update bank details", 500);
    }
  }

  async getBankDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const bankDetails = await this.bankDetailsService.getBankDetails(userId);
      return sendSuccess(res, "Bank details fetched successfully", bankDetails);
    } catch (error: any) {
      logError(req, "Failed to fetch bank details", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch bank details", 500);
    }
  }
}
