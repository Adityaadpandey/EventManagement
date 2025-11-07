import type { Response } from "express";
import { TicketService } from "../services/ticket.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { buyTicketSchema } from "../validators/ticket.validator";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";

export class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  async buyTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

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
      if (error.name === "ZodError") {
        const formattedErrors = formatZodError(error);
        return sendError(
          res,
          { error: formattedErrors || "Validation error" },
          400,
        );
      }
      logError(req, "Failed to create ticket", error, {
        ticketTypeId: req.body.ticketTypeId,
      });
      return sendError(res, "Failed to create ticket", 500);
    }
  }

  async getUserTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return sendError(res, "User ID is required", 400);

      const result = await this.ticketService.getUserTickets(userId);
      return sendSuccess(res, "User tickets fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch user tickets", error, {
        userId: req.user?.userId,
      });
      return sendError(res, "Failed to fetch user tickets", 500);
    }
  }

  async getTicketBuyersForEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { eventId } = req.params;
      const userId = req.user?.userId;

      if (!eventId) {
        return sendError(res, "Event ID is required", 400);
      }
      if (!userId) return sendError(res, "User ID is required", 400);

      const result = await this.ticketService.getTicketBuyersForEvent(
        eventId,
        userId,
      );

      return sendSuccess(res, "Ticket buyers fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch ticket buyers", error, {
        eventId: req.params.eventId,
      });
      return sendError(res, "Failed to fetch ticket buyers", 500);
    }
  }

  async getAllTicketBuyers(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      // Only admins can access all ticket buyers
      if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        return sendError(res, "Access denied", 403);
      }

      const result = await this.ticketService.getAllTicketBuyers();

      return sendSuccess(res, "All ticket buyers fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to fetch all ticket buyers", error);
      return sendError(res, "Failed to fetch all ticket buyers", 500);
    }
  }

  async getTicketDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!ticketId) {
        return sendError(res, "Ticket ID is required", 400);
      }

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
      return sendError(res, "Failed to fetch ticket details", 500);
    }
  }
}
