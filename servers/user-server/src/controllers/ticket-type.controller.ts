import { Response } from "express";
import { TicketTypeService } from "../services/ticket-type.service";
import { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  patchTicketType,
  ticketTypeSchema,
} from "../validators/ticket-type.validator";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";

export class TicketTypeController {
  private ticketTypeService: TicketTypeService;

  constructor() {
    this.ticketTypeService = new TicketTypeService();
  }

  async Create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const { eventId } = req.params;
      if (!eventId) return sendError(res, "Event ID is required", 400);

      const parsedBody = ticketTypeSchema.parse(req.body);
      logInfo(req, "Creating ticket type", { eventId, name: parsedBody.name });
      const result = await this.ticketTypeService.CreateTicketType(
        userId,
        eventId,
        parsedBody,
      );

      return sendSuccess(res, "Ticket Type created successfully", result, 201);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }
      logError(req, "Failed to create ticket type", error, {
        eventId: req.params.eventId,
      });
      return sendError(res, "Failed to create the Ticket Type", 400);
    }
  }

  async Update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const { eventId, ticketTypeId } = req.params;
      if (!eventId) return sendError(res, "Event ID is required", 400);
      if (!ticketTypeId)
        return sendError(res, "Ticket Type ID is required", 400);

      const parsedBody = patchTicketType.parse(req.body);

      // Ensure at least one field is being updated
      if (Object.keys(parsedBody).length === 0) {
        return sendError(res, "No fields to update", 400);
      }

      logInfo(req, "Updating ticket type", { eventId, ticketTypeId });
      const result = await this.ticketTypeService.UpdateTicketType(
        userId,
        eventId,
        ticketTypeId,
        parsedBody,
      );

      return sendSuccess(res, "Ticket Type updated successfully", result, 200);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }
      logError(req, "Failed to update ticket type", error, {
        ticketTypeId: req.params.ticketTypeId,
      });
      return sendError(res, "Failed to update the Ticket Type", 400);
    }
  }

  async Delete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const { eventId, ticketTypeId } = req.params;
      if (!eventId) return sendError(res, "Event ID is required", 400);
      if (!ticketTypeId)
        return sendError(res, "Ticket Type ID is required", 400);

      logInfo(req, "Deleting ticket type", { eventId, ticketTypeId });
      const result = await this.ticketTypeService.DeleteTicketType(
        userId,
        eventId,
        ticketTypeId,
      );

      return sendSuccess(res, "Ticket Type deleted successfully", result, 200);
    } catch (error: any) {
      logError(req, "Failed to delete ticket type", error, {
        ticketTypeId: req.params.ticketTypeId,
      });
      return sendError(res, "Failed to delete the Ticket Type", 400);
    }
  }
}
