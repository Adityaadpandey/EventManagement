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

      const result = await this.eventService.createEvent(userId, {
        ...validatedData,
        tags: validatedData.tags || [],
        chips: validatedData.chips || [],
      });
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
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const longitude = req.query.longitude
        ? parseFloat(req.query.longitude as string)
        : undefined;
      const latitude = req.query.latitude
        ? parseFloat(req.query.latitude as string)
        : undefined;

      // New parameter to control whether to include global events
      const includeGlobalEvents = req.query.includeGlobal !== "false"; // Default true

      if (limit <= 0) {
        return sendError(res, "Limit must be a positive integer", 400);
      }

      // Validate coordinates if provided
      if (
        (longitude !== undefined || latitude !== undefined) &&
        (longitude === undefined || latitude === undefined)
      ) {
        return sendError(
          res,
          "Both longitude and latitude must be provided together",
          400,
        );
      }

      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return sendError(res, "Longitude must be between -180 and 180", 400);
      }

      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return sendError(res, "Latitude must be between -90 and 90", 400);
      }

      const result = await this.eventService.getPublicEvents(
        cursor,
        limit,
        longitude,
        latitude,
        includeGlobalEvents,
      );

      return sendSuccess(
        res,
        "Events fetched successfully",
        result.events,
        200,
        {
          pagination: {
            nextCursor: result.nextCursor,
            hasNextPage: result.hasNextPage,
            limit,
          },
          metadata: result.metadata,
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
