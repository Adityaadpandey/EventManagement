import type { Response } from "express";
import { AdminService } from "../services/admin.service";
import type { AuthenticatedRequest } from "../types/auth";
import { isAppError, UnauthorizedError } from "../utils/errors";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  changeEventStatusSchema,
  promoteUserSchema,
} from "../validators/admin.validator";

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  async changeUserToListerStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedData = promoteUserSchema.parse(req.body);
      logInfo(req, "Changing user to lister status", {
        targetUserId: validatedData.userId,
      });

      const result = await this.adminService.changeUserToListerStatus(
        userId,
        validatedData,
      );

      return sendSuccess(res, result.message, result.data, 201);
    } catch (error: any) {
      logError(req, "Failed to change user to lister", error);

      if (error.name === "ZodError") {
        return sendError(res, error, 400);
      }

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to change user to lister", 500);
    }
  }

  async getAllListerRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      // Call the service method to get all lister requests
      const result = await this.adminService.getAllListerRequests(userId);
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logError(req, "Failed to fetch lister requests", error);
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch lister requests", 500);
    }
  }

  async changeEventStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedData = changeEventStatusSchema.parse(req.body);

      logInfo(req, "Changing event status", {
        eventId: validatedData.eventId,
        newStatus: validatedData.newStatus,
      });
      // Call the service method to change event status
      const result = await this.adminService.changeEventStatus(
        userId,
        validatedData,
      );

      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logError(req, "Failed to change event status", error);

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }

      return sendError(res, "Failed to change event status", 500);
    }
  }
  async getAllPendingEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      // Call the service method to get all pending events
      const result = await this.adminService.getAllPendingEvents(userId);
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logError(req, "Failed to fetch pending events", error);
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch pending events", 500);
    }
  }
}
