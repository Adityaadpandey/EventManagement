import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { CheckerService } from "../services/checker.service";
import type { AuthenticatedRequest } from "../types/auth";
import {
  BadRequestError,
  isAppError,
  UnauthorizedError,
} from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class CheckerController {
  private checkerService: CheckerService;

  constructor() {
    this.checkerService = new CheckerService();
  }

  async createChecker(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

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

      checkerCopy.password = password;
      return sendSuccess(res, "Checker created successfully", checkerCopy, 201);
    } catch (error: any) {
      logError(req, "Failed to create checker", error, {
        eventId: req.params.eventId as string,
      });

      if (error.name === "ZodError") {
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
      return sendError(res, "Failed to create checker", 500);
    }
  }

  async getCheckersByEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const checkers = await this.checkerService.getCheckersByEvent(
        eventId,
        userId,
      );
      return sendSuccess(res, "Checkers retrieved successfully", checkers);
    } catch (error: any) {
      logError(req, "Failed to get checkers", error, {
        eventId: req.params.eventId as string,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get checkers", 500);
    }
  }

  async getCheckerById(req: AuthenticatedRequest, res: Response) {
    try {
      const checkerId = req.params.checkerId as string;
      if (!checkerId) throw new BadRequestError("Checker ID is required");

      const checker = await this.checkerService.getCheckerById(checkerId);
      return sendSuccess(res, "Checker retrieved successfully", checker);
    } catch (error: any) {
      logError(req, "Failed to get checker", error, {
        checkerId: req.params.checkerId as string,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get checker", 500);
    }
  }

  async deleteChecker(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const checkerId = req.params.checkerId as string;
      if (!checkerId) throw new BadRequestError("Checker ID is required");

      logInfo(req, "Deleting checker", { checkerId, userId });
      const result = await this.checkerService.deleteChecker(checkerId, userId);
      return sendSuccess(res, result.message);
    } catch (error: any) {
      logError(req, "Failed to delete checker", error, {
        checkerId: req.params.checkerId as string,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to delete checker", 500);
    }
  }
}
