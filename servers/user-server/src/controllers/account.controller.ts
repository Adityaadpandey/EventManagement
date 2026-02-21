import { Response } from "express";
import { AccountService } from "../services/account.service";
import { AuthenticatedRequest } from "../types/auth";
import { isAppError, UnauthorizedError } from "../utils/errors";
import { logError } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class AccountController {
  private accountService: AccountService;
  constructor() {
    this.accountService = new AccountService();
  }

  async getAccountDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const accountDetails =
        await this.accountService.getAccountDetails(userId);
      return sendSuccess(
        res,
        "Account details fetched successfully",
        accountDetails,
      );
    } catch (error: any) {
      logError(req, "Failed to fetch account details", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch account details", 500);
    }
  }
}
