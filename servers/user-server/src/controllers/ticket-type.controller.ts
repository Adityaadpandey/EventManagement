import { Response } from "express";
import { TicketTypeService } from "../services/ticket-type.service";
import { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  patchTicketType,
  ticketTypeSchema,
} from "../validators/ticket-type.validator";
import { formatZodError } from "../utils/formatZodError";

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
      return sendError(
        res,
        error.message || "Failed to create the Ticket Type",
        400,
      );
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
      return sendError(res, error || "Failed to update the Ticket Type", 400);
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

      const result = await this.ticketTypeService.DeleteTicketType(
        userId,
        eventId,
        ticketTypeId,
      );

      return sendSuccess(res, "Ticket Type deleted successfully", result, 200);
    } catch (error: any) {
      return sendError(
        res,
        error.message || "Failed to delete the Ticket Type",
        400,
      );
    }
  }
}
