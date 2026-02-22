import { Response } from "express";
import { prisma } from "../config/db";
import { PayoutService } from "../services/payout.service";
import { AuthenticatedRequest } from "../types/auth";
import { isAppError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  approvePayoutSchema,
  requestPayoutSchema,
} from "../validators/payout.validator";

export class PayoutController {
  private payoutService: PayoutService;

  constructor() {
    this.payoutService = new PayoutService();
  }

  async requestPayout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedBody = requestPayoutSchema.parse(req.body);

      const payout = await this.payoutService.requestPayout(
        userId,
        validatedBody,
      );

      return sendSuccess(res, "Payout request created successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to request payout", error, {
        userId: req.user?.userId,
        body: req.body,
      });

      if (error.name === "ZodError") {
        logError(req, "Failed to Validate the body", error, {
          userId: req.user?.userId,
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
      return sendError(res, "Failed to request payout", 500);
    }
  }

  async getPayouts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { status } = req.query;

      const payouts = await this.payoutService.getPayouts(
        userId,
        status as string,
      );

      return sendSuccess(res, "Payouts fetched successfully", payouts);
    } catch (error: any) {
      logError(req, "Failed to fetch payouts", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch payouts", 500);
    }
  }

  async getPayoutById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const payoutId = req.params.payoutId as string;
      if (!payoutId) throw new NotFoundError("Payout ID is required");

      const payout = await this.payoutService.getPayoutById(payoutId, userId);

      return sendSuccess(res, "Payout details fetched successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to fetch payout details", error, {
        userId: req.user?.userId,
        payoutId: req.params.payoutId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch payout details", 500);
    }
  }

  async cancelPayout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const payoutId = req.params.payoutId as string;
      if (!payoutId) throw new NotFoundError("Payout ID is required");

      const payout = await this.payoutService.cancelPayout(payoutId, userId);

      return sendSuccess(res, "Payout cancelled successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to cancel payout", error, {
        userId: req.user?.userId,
        payoutId: req.params.payoutId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to cancel payout", 500);
    }
  }

  async getLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const ledger = await this.payoutService.getLedger(userId, limit, offset);

      return sendSuccess(res, "Ledger fetched successfully", ledger);
    } catch (error: any) {
      logError(req, "Failed to fetch ledger", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch ledger", 500);
    }
  }

  async reconcileBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      // Get lister ID from user
      const lister = await prisma.lister.findUnique({
        where: { userId },
        select: { listerId: true },
      });

      if (!lister) {
        return sendError(res, "Lister profile not found", 404);
      }

      const result = await this.payoutService.reconcileBalance(lister.listerId);

      return sendSuccess(res, "Balance reconciliation completed", result);
    } catch (error: any) {
      logError(req, "Failed to reconcile balance", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to reconcile balance", 500);
    }
  }

  // Admin endpoints
  async getAllPayouts(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.payoutService.getAllPayouts(
        status as string,
        limit,
        offset,
      );

      return sendSuccess(res, "All payouts fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch all payouts", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch all payouts", 500);
    }
  }

  async approvePayout(req: AuthenticatedRequest, res: Response) {
    try {
      const payoutId = req.params.payoutId as string;
      if (!payoutId) throw new NotFoundError("Payout ID is required");
      const { approvedAmount, remark } = approvePayoutSchema.parse(
        req.body ?? {},
      );

      const payout = await this.payoutService.approvePayout(
        payoutId,
        approvedAmount,
        remark,
      );

      return sendSuccess(res, "Payout approved successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to approve payout", error, {
        userId: req.user?.userId,
        payoutId: req.params.payoutId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to approve payout", 500);
    }
  }

  async completePayout(req: AuthenticatedRequest, res: Response) {
    try {
      const payoutId = req.params.payoutId as string;
      if (!payoutId) throw new NotFoundError("Payout ID is required");

      const payout = await this.payoutService.completePayout(payoutId);

      return sendSuccess(res, "Payout completed successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to complete payout", error, {
        userId: req.user?.userId,
        payoutId: req.params.payoutId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to complete payout", 500);
    }
  }

  async rejectPayout(req: AuthenticatedRequest, res: Response) {
    try {
      const payoutId = req.params.payoutId as string;
      const { reason } = req.body;

      const payout = await this.payoutService.rejectPayout(payoutId, reason);

      return sendSuccess(res, "Payout rejected successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to reject payout", error, {
        userId: req.user?.userId,
        payoutId: req.params.payoutId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to reject payout", 500);
    }
  }

  async reversePayout(req: AuthenticatedRequest, res: Response) {
    try {
      const payoutId = req.params.payoutId as string;
      const { reason } = req.body;

      if (!reason) {
        return sendError(res, "Reason is required for payout reversal", 400);
      }

      const payout = await this.payoutService.reversePayout(payoutId, reason);

      return sendSuccess(res, "Payout reversed successfully", payout);
    } catch (error: any) {
      logError(req, "Failed to reverse payout", error, {
        userId: req.user?.userId,
        payoutId: req.params.payoutId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to reverse payout", 500);
    }
  }
}
