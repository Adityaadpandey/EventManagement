import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { CheckerService } from "../services/checker.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";

export class CheckerController {
  private checkerService: CheckerService;

  constructor() {
    this.checkerService = new CheckerService();
  }

  async createChecker(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const { eventId } = req.params;
      if (!eventId) {
        return sendError(res, "Event ID is required", 400);
      }

      logInfo(req, "Creating checker", { eventId, userId });
      const username = randomUUID().slice(0, 5);
      const password = randomUUID().slice(0, 8);

      const checker = await this.checkerService.createChecker(
        eventId,
        userId,
        username,
        password,
      );
      const checkerCopy: any = { ...checker };

      checkerCopy.password = password; // Return plain password only on creation
      return sendSuccess(res, "Checker created successfully", checkerCopy, 201);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }

      logError(req, "Failed to create checker", error, {
        eventId: req.params.eventId,
      });
      return sendError(res, "Failed to create checker", 500);
    }
  }

  async getCheckersByEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const { eventId } = req.params;
      if (!eventId) {
        return sendError(res, "Event ID is required", 400);
      }

      const checkers = await this.checkerService.getCheckersByEvent(
        eventId,
        userId,
      );
      return sendSuccess(res, "Checkers retrieved successfully", checkers);
    } catch (error: any) {
      logError(req, "Failed to get checkers", error, {
        eventId: req.params.eventId,
      });
      return sendError(res, "Failed to get checkers", 500);
    }
  }

  async getCheckerById(req: AuthenticatedRequest, res: Response) {
    try {
      const { checkerId } = req.params;
      if (!checkerId) {
        return sendError(res, "Checker ID is required", 400);
      }

      const checker = await this.checkerService.getCheckerById(checkerId);
      return sendSuccess(res, "Checker retrieved successfully", checker);
    } catch (error: any) {
      logError(req, "Failed to get checker", error, {
        checkerId: req.params.checkerId,
      });
      return sendError(res, "Failed to get checker", 500);
    }
  }

  async deleteChecker(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const { checkerId } = req.params;
      if (!checkerId) {
        return sendError(res, "Checker ID is required", 400);
      }

      logInfo(req, "Deleting checker", { checkerId, userId });
      const result = await this.checkerService.deleteChecker(checkerId, userId);
      return sendSuccess(res, result.message);
    } catch (error: any) {
      logError(req, "Failed to delete checker", error, {
        checkerId: req.params.checkerId,
      });
      return sendError(res, "Failed to delete checker", 500);
    }
  }
}
