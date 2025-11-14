import { Request, Response } from "express";
import logger from "../config/logger";
import { PromotionsService } from "../services/promotions.service";

export class PromotionsController {
  private promotionsService: PromotionsService;

  constructor() {
    this.promotionsService = new PromotionsService();
  }

  /**
   * POST /api/v1/event/:eventId/promote
   * Send promotional emails to previous ticket buyers
   */
  async sendPromotion(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const { content, toEventId, emailTemplate } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await this.promotionsService.sendMailToPrev(
        eventId,
        emailTemplate || "promotion.ejs",
        content || "",
        toEventId,
        userId,
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error("Error in sendPromotion controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * GET /api/v1/event/:eventId/promotion-reach
   * Get count of potential recipients for a promotion
   */
  async getPromotionReach(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const { toEventId } = req.query;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Get lister ID from event
      const { prisma } = await import("../config/db");
      const event = await prisma.event.findUnique({
        where: { eventId },
        select: { listerId: true, lister: { select: { userId: true } } },
      });

      if (!event || event.lister.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to access this event",
        });
      }

      const result = await this.promotionsService.getPromotionReach(
        event.listerId,
        toEventId as string | undefined,
      );

      return res.status(200).json(result);
    } catch (error) {
      logger.error("Error in getPromotionReach controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
