import type { Request, Response } from "express";
import { EventService } from "../services/event.service";
import { PublicEventService } from "../services/publicEvent.service";
import type { AuthenticatedRequest } from "../types/auth";
import {
  BadRequestError,
  isAppError,
  UnauthorizedError,
} from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  createEventSchema,
  patchEventSchema,
} from "../validators/event.validator";

export class EventController {
  private eventService: EventService;
  private publicEventService: PublicEventService;

  constructor() {
    this.eventService = new EventService();
    this.publicEventService = new PublicEventService();
  }

  async createEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedData = createEventSchema.parse(req.body);
      logInfo(req, "Creating event", { userId, title: validatedData.title });

      const result = await this.eventService.createEvent(userId, {
        ...validatedData,
        tags: validatedData.tags || [],
        chips: validatedData.chips || [],
      });
      return sendSuccess(res, result.message, result.data, 201);
    } catch (error: any) {
      logError(req, "Failed to create event", error);
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

      const includeAll = req.query.includeAll === "true"; // Default false

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

      const result = await this.publicEventService.getPublicEvents(
        cursor,
        limit,
        longitude,
        latitude,
        includeGlobalEvents,
        includeAll,
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
      logError(req, "Failed to get public events", error);

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get public events", 500, error.message);
    }
  }

  // for getting lister events
  async getListerEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const events = await this.eventService.getListerEvents(userId);
      return sendSuccess(
        res,
        "Lister events retrieved successfully",
        events,
        200,
      );
    } catch (error: any) {
      logError(req, "Failed to get lister events", error, {
        userId: req.user?.userId,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get lister events", 500, error.message);
    }
  }

  // for getting specific event details
  async getPublicEventDetails(req: Request, res: Response) {
    try {
      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");
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
      logError(req, "Failed to get public event details", error, {
        eventId: req.params.eventId as string,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
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
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

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
        logError(req, "Failed to get event details", error, {
          eventId: req.params.eventId as string,
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
      return sendError(res, "Failed to get event details", 500, error.message);
    }
  }

  async patchEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const validatedData = patchEventSchema.parse(req.body);
      logInfo(req, "Patching event", { eventId, userId });

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
      logError(req, "Failed to patch event", error, {
        eventId: req.params.eventId,
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
      return sendError(res, "Failed to patch event", 500, error.message);
    }
  }

  async updateInfo(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const { update, imageUrl } = req.body;
      if (!update) return sendError(res, "Update data is required", 400);

      const isAdmin = req.user?.role === "ADMIN";
      logInfo(req, "Updating event info", {
        eventId,
        hasImage: !!imageUrl,
        isAdmin,
      });
      const result = await this.eventService.updateInfo(
        eventId,
        update,
        userId,
        imageUrl,
        isAdmin,
      );
      return sendSuccess(res, "Event info update processed", result, 200);
    } catch (error: any) {
      logError(req, "Failed to update event info", error, {
        eventId: req.params.eventId as string,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to update event info", 500, error.message);
    }
  }

  async getAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const analytics = await this.eventService.getEventAnalytics(
        userId,
        eventId,
      );
      return sendSuccess(
        res,
        "Event analytics retrieved successfully",
        analytics,
        200,
      );
    } catch (error: any) {
      logError(req, "Failed to get event analytics", error, {
        eventId: req.params.eventId as string,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(
        res,
        "Failed to get event analytics",
        500,
        error.message,
      );
    }
  }

  async patchEventStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");
      const { canBuy } = req.body;
      if (typeof canBuy !== "boolean") {
        return sendError(res, "canBuy must be a boolean", 400);
      }

      logInfo(req, "Patching event status", { eventId, userId, canBuy });

      const updatedEvent = await this.eventService.changeEventStatus(
        userId,
        eventId,
        canBuy,
      );

      return sendSuccess(
        res,
        `Event status updated successfully for eventId: ${eventId}`,
        updatedEvent,
        200,
      );
    } catch (error: any) {
      logError(req, "Failed to patch event status", error, {
        eventId: req.params.eventId,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to patch event status", 500, error.message);
    }
  }

  async publishEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { eventId } = req.params;
      logInfo(req, "Publishing event", { eventId, userId });

      const result = await this.eventService.publishEvent(
        userId,
        eventId as string,
      );
      return sendSuccess(res, result.message, result.data, 200);
    } catch (error: any) {
      logError(req, "Failed to publish event", error, {
        eventId: req.params.eventId,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to publish event", 500, error.message);
    }
  }
}
