import { Response } from "express";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { PromotionsService } from "../services/promotions.service";
import { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { promotionSchema } from "../validators/promotions.validator";

export class PromotionsController {
  private promotionsService: PromotionsService;

  constructor() {
    this.promotionsService = new PromotionsService();
  }

  async sendPromotion(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    const { eventId } = req.params;
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
      const { content, toEventId, emailTemplate } = promotionSchema.parse(
        req.body,
      );

      const result = await this.promotionsService.sendMailToPrev(
        eventId,
        emailTemplate || "promotion.ejs",
        content || "",
        toEventId,
        userId,
      );

      return sendSuccess(res, "Promotion sent", result);
    } catch (error) {
      logger.error("Error in sendPromotion controller:", error);
      return sendError(res, "Internal server error", 500);
    }
  }

  async getPromotionReach(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    const { eventId } = req.params;
    if (!eventId) return sendError(res, "Event ID is required", 400);

    const { toEventId } = req.query;
    if (toEventId && typeof toEventId !== "string") {
      return sendError(res, "toEventId must be a string", 400);
    }
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
        select: { listerId: true, lister: { select: { userId: true } } },
      });

      if (!event || event.lister.userId !== userId) {
        return sendError(res, "Event not found or unauthorized", 404);
      }

      const result = await this.promotionsService.getPromotionReach(
        event.listerId,
        toEventId as string | undefined,
      );

      return sendSuccess(res, "Promotion reach fetched", result);
    } catch (error) {
      logger.error("Error in getPromotionReach controller:", error);
      return sendError(res, "Internal server error", 500);
    }
  }
}
