import { Response } from "express";
import { prisma } from "../config/db";
import { PromotionsService } from "../services/promotions.service";
import { AuthenticatedRequest } from "../types/auth";
import {
  BadRequestError,
  ForbiddenError,
  isAppError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class PromotionsController {
  private promotionsService: PromotionsService;

  constructor() {
    this.promotionsService = new PromotionsService();
  }

  async sendPromotion(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { eventId } = req.params;
      if (!eventId) throw new BadRequestError("Event ID is required");

      // Body validation is now handled by middleware
      const { content, toEventId, emailTemplate } = req.body;

      logInfo(req, "Sending promotion", { eventId, toEventId });

      const result = await this.promotionsService.sendMailToPrev(
        eventId,
        emailTemplate || "promotion.ejs",
        content || "",
        toEventId,
        userId,
      );

      return sendSuccess(res, "Promotion sent successfully", result);
    } catch (error: any) {
      logError(req, "Failed to send promotion", error, {
        eventId: req.params.eventId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to send promotion", 500);
    }
  }

  async getPromotionReach(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { eventId } = req.params;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const { toEventId } = req.query;
      if (toEventId && typeof toEventId !== "string") {
        throw new BadRequestError("toEventId must be a string");
      }

      const event = await prisma.event.findUnique({
        where: { eventId },
        select: { listerId: true, lister: { select: { userId: true } } },
      });

      if (!event) {
        throw new NotFoundError("Event not found");
      }

      if (event.lister.userId !== userId) {
        throw new ForbiddenError(
          "You are not authorized to view this event's promotion reach",
        );
      }

      logInfo(req, "Fetching promotion reach", { eventId, toEventId });

      const result = await this.promotionsService.getPromotionReach(
        event.listerId,
        toEventId as string | undefined,
      );

      return sendSuccess(res, "Promotion reach fetched successfully", result);
    } catch (error: any) {
      logError(req, "Failed to get promotion reach", error, {
        eventId: req.params.eventId,
      });

      // Let error middleware handle it
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }

      return sendError(res, "Failed to get promotion reach", 500);
    }
  }
}
