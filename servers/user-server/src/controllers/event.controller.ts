import type { Request, Response } from "express";
import logger from "../config/logger";
import { EventService } from "../services/event.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  createEventSchema,
  patchEventSchema,
} from "../validators/event.validator";

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async createEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const validatedData = createEventSchema.parse(req.body);

      const result = await this.eventService.createEvent(userId, validatedData);
      return sendSuccess(res, result.message, result.data, 201);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return sendError(res, error.errors, 400);
      }
      logger.error("Create event error:", error);
      return sendError(res, "Failed to create event", 500, error.message);
    }
  }

  //  all the event details for public view
  async getPublicEvents(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10);

      console.log(page, limit);

      const { events, total } = await this.eventService.getPublicEvents(
        page,
        limit,
      );

      const totalPages = Math.ceil(total / limit);

      return sendSuccess(
        res,
        "Public events retrieved successfully",
        events,
        200,
        {
          page,
          limit,
          total,
          totalPages,
        },
      );
    } catch (error: any) {
      logger.error("Failed to get public events:", error);
      return sendError(res, "Failed to get public events", 500, error.message);
    }
  }

  // for getting lister events
  async getListerEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const events = await this.eventService.getListerEvents(userId);
      return sendSuccess(
        res,
        "Lister events retrieved successfully",
        events,
        200,
      );
    } catch (error: any) {
      logger.error("Failed to get lister event:", error);
      return sendError(res, "Failed to get lister event", 500, error.message);
    }
  }

  // for getting specific event details
  async getPublicEventDetails(req: Request, res: Response) {
    try {
      const eventId = req.params.eventId;
      if (!eventId) return sendError(res, "Event ID is required", 400);

      const eventDetails =
        await this.eventService.getPublicEventDetails(eventId);

      if (!eventDetails) {
        return sendError(res, "Event not found", 404);
      }

      return sendSuccess(
        res,
        "Public event details retrieved successfully",
        eventDetails,
        200,
      );
    } catch (error: any) {
      logger.error("Failed to get public event details:", error);
      return sendError(
        res,
        "Failed to get public event details",
        500,
        error.message,
      );
    }
  }

  async getEventDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const eventId = req.params.eventId;
      if (!eventId) return sendError(res, "Event ID is required", 400);
      const eventDetails = await this.eventService.getEventDetails(
        userId,
        eventId,
      );
      if (!eventDetails) {
        return sendError(res, "Event not found", 404);
      }

      return sendSuccess(
        res,
        "Event details retrieved successfully",
        eventDetails,
        200,
      );
    } catch (error: any) {
      if (error.name === "ZodError") {
        return sendError(
          res,
          error.errors?.[0]?.message || "Validation error",
          400,
        );
      }
      logger.error("Failed to get event details:", error);
      return sendError(res, "Failed to get event details", 500, error.message);
    }
  }

  async patchEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const eventId = req.params.eventId;
      if (!eventId) return sendError(res, "Event ID is required", 400);

      const validatedData = patchEventSchema.parse(req.body);

      const updatedEvent = await this.eventService.patchEvent(
        userId,
        eventId,
        validatedData,
      );
      return sendSuccess(
        res,
        `Update succesfully executed for eventId:${eventId}`,
        updatedEvent,
        200,
      );
    } catch (error: any) {
      if (error.name === "ZodError") {
        return sendError(
          res,
          error.errors?.[0]?.message || "Validation error",
          400,
        );
      }
      logger.error("Failed to patch event:", error);
      return sendError(res, "Failed to patch event", 500, error.message);
    }
  }

  async submitEventForApproval(_req: AuthenticatedRequest, _res: Response) {}

  async getEventAttendees(_req: AuthenticatedRequest, _res: Response) {}
}
