import type { Response } from "express";
import { TicketService } from "../services/ticket.service";
import type { AuthenticatedRequest } from "../types/auth";
import {
  BadRequestError,
  ForbiddenError,
  isAppError,
  UnauthorizedError,
} from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { buyTicketSchema } from "../validators/ticket.validator";

export class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  async buyTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { ticketTypeId, quantity, attendeeData, discountCode } =
        buyTicketSchema.parse(req.body);

      logInfo(req, "Buying ticket", { userId, ticketTypeId, quantity });
      const result = await this.ticketService.buyTicket(
        userId,
        ticketTypeId,
        quantity,
        attendeeData,
        discountCode || undefined,
      );

      return sendSuccess(
        res,
        "Ticket created successfully, proceed to payment",
        result,
      );
    } catch (error: any) {
      logError(req, "Failed to create ticket", error, {
        ticketTypeId: req.body.ticketTypeId,
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
      return sendError(res, "Failed to create ticket", 500);
    }
  }

  async getUserTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const result = await this.ticketService.getUserTickets(userId);
      return sendSuccess(res, "User tickets fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch user tickets", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch user tickets", 500);
    }
  }

  async getTicketBuyersForEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { eventId } = req.params;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const result = await this.ticketService.getTicketBuyersForEvent(
        eventId,
        userId,
      );

      return sendSuccess(res, "Ticket buyers fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch ticket buyers", error, {
        eventId: req.params.eventId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch ticket buyers", 500);
    }
  }

  async getAllTicketBuyers(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      // Only admins can access all ticket buyers
      if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        throw new ForbiddenError("Access denied");
      }

      const result = await this.ticketService.getAllTicketBuyers();

      return sendSuccess(res, "All ticket buyers fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch all ticket buyers", error);

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch all ticket buyers", 500);
    }
  }

  async getTicketDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const userRole = req.user?.role;

      if (!ticketId) throw new BadRequestError("Ticket ID is required");

      // Only allow users to see their own tickets unless they're admin
      const searchUserId =
        userRole === "ADMIN" || userRole === "SUPER_ADMIN" ? undefined : userId;

      const result = await this.ticketService.getTicketDetails(
        ticketId,
        searchUserId,
      );

      return sendSuccess(res, "Ticket details fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch ticket details", error, {
        ticketId: req.params.ticketId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch ticket details", 500);
    }
  }
}
