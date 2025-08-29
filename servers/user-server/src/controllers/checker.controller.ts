import type { Response } from "express";
import { randomUUID } from "node:crypto";
import logger from "../config/logger";
import { CheckerService } from "../services/checker.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";

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
        return sendError(
          res,
          error.errors?.[0]?.message || "Validation error",
          400,
        );
      }

      logger.error("Error creating checker:", error);
      return sendError(res, error.message || "Failed to create checker", 500);
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
      logger.error("Error getting checkers:", error);
      return sendError(res, error.message || "Failed to get checkers", 500);
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
      logger.error("Error getting checker:", error);
      return sendError(res, error.message || "Failed to get checker", 500);
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

      const result = await this.checkerService.deleteChecker(checkerId, userId);
      return sendSuccess(res, result.message);
    } catch (error: any) {
      logger.error("Error deleting checker:", error);
      return sendError(res, error.message || "Failed to delete checker", 500);
    }
  }
}
