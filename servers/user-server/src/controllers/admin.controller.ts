import type { Response } from "express";
import logger from "../config/logger";
import { AdminService } from "../services/admin.service";
import type { AuthenticatedRequest } from "../types/auth";
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
      if (!userId) return sendError(res, "User ID is required", 400);
      const validatedData = promoteUserSchema.parse(req.body);
      const result = await this.adminService.changeUserToListerStatus(
        userId,
        validatedData,
      );
      return sendSuccess(res, result.message, result.data, 201);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return sendError(res, error.errors, 400);
      }
      logger.error("Create event error:", error);
      return sendError(res, "Failed to create event", 500, error.message);
    }
  }

  async getAllListerRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      // Call the service method to get all lister requests
      const result = await this.adminService.getAllListerRequests(userId);
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logger.error("Error fetching lister requests:", error);
      return sendError(
        res,
        "Failed to fetch lister requests",
        500,
        error.message,
      );
    }
  }

  async changeEventStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);
      const validatedData = changeEventStatusSchema.parse(req.body);

      // Call the service method to change event status
      const result = await this.adminService.changeEventStatus(
        userId,
        validatedData,
      );
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logger.error("Error changing event status:", error);
      return sendError(
        res,
        "Failed to change event status",
        500,
        error.message,
      );
    }
  }
  async getAllPendingEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      // Call the service method to get all pending events
      const result = await this.adminService.getAllPendingEvents(userId);
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logger.error("Error fetching pending events:", error);
      return sendError(
        res,
        "Failed to fetch pending events",
        500,
        error.message,
      );
    }
  }
}
