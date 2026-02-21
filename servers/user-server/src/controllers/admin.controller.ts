import type { Response } from "express";
import { AdminService } from "../services/admin.service";
import { EventService } from "../services/event.service";
import { ListerService } from "../services/lister.service";
import type { AuthenticatedRequest } from "../types/auth";
import { isAppError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { changeEventStatusSchema } from "../validators/admin.validator";

export class AdminController {
  private adminService: AdminService;
  private eventService: EventService;
  private listerService: ListerService;
  constructor() {
    this.eventService = new EventService();
    this.adminService = new AdminService();
    this.listerService = new ListerService();
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

  async changeEventBuyStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new NotFoundError("Event ID is required");

      const { canBuy } = req.body;

      logInfo(req, "Changing event buy status", {
        eventId,
        canBuy,
      });

      const result = await this.eventService.changeEventStatus(
        userId,
        eventId,
        canBuy,
        true,
      );

      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logError(req, "Failed to change event buy status", error);

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to change event buy status", 500);
    }
  }

  async getAllEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      // Call the service method to get all events
      const result = await this.adminService.getAllEvents(userId);
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logError(req, "Failed to fetch all events", error);
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch all events", 500);
    }
  }

  async getEventById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new NotFoundError("Event ID is required");

      // Call the service method to get event by ID
      const result = await this.eventService.getEventDetails(
        userId,
        eventId,
        true,
      );
      return sendSuccess(res, "Event Data Fetched successfully", result, 200);
    } catch (error: any) {
      logError(req, "Failed to fetch event by ID", error);
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch event by ID", 500);
    }
  }

  async getEventAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      // Call the service method to get event statistics
      const result = await this.eventService.getEventAnalytics(
        userId,
        req.params.eventId as string,
        true,
      );
      return sendSuccess(res, "Event Analysis fetched", result, 200);
    } catch (error: any) {
      logError(req, "Failed to fetch event statistics", error);
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch event statistics", 500);
    }
  }

  async getEventTicketAttendees(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new NotFoundError("Event Id not found");

      // Call the service method to get event statistics
      const result = await this.listerService.getEventAttendeeTicketsDetails(
        eventId,
        userId,
        true,
      );
      return sendSuccess(res, "Event Analysis fetched", result, 200);
    } catch (error: any) {
      logError(req, "Failed to fetch event statistics", error);
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch event statistics", 500);
    }
  }
}
