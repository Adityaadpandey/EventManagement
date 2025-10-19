import { Response } from "express";
import logger from "../config/logger";
import { DiscountService } from "../services/discount.service";
import { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { createDiscountSchema } from "../validators/discount.validator";

export class DiscountController {
  private discountService: DiscountService;

  constructor() {
    this.discountService = new DiscountService();
  }

  async createDiscountCode(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    const { eventId } = req.params;

    if (!userId) return sendError(res, "User ID is required", 400);
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
      const validatedData = createDiscountSchema.parse(req.body);

      const result = await this.discountService.createDiscountCode({
        eventId,
        ...validatedData,
      });

      if (result.error) {
        return sendError(res, result.error, 400);
      }

      return sendSuccess(
        res,
        "Discount code created successfully",
        result.data,
      );
    } catch (error: any) {
      if (error.name === "ZodError") {
        return sendError(res, error.errors, 400);
      }
      logger.error("Error creating discount code:", error);
      return sendError(res, "Failed to create discount code", 500);
    }
  }

  async getDiscountCodesByEvent(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    const { eventId } = req.params;

    if (!userId) return sendError(res, "User ID is required", 400);
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
      const result =
        await this.discountService.getDiscountCodesByEvent(eventId);

      if (result.error) {
        return sendError(res, result.error, 400);
      }

      return sendSuccess(
        res,
        "Fetched discount codes successfully",
        result.data,
      );
    } catch (error: any) {
      logger.error("Error getting event discount codes:", error);
      return sendError(res, "Error getting event discount codes", 500);
    }
  }

  async getCodeInfoByCode(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    const { code, eventId } = req.params;

    if (!userId) return sendError(res, "User ID is required", 400);
    if (!code) return sendError(res, "Code is required", 400);
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
      const result = await this.discountService.getCodeInfoById(code, eventId);

      if (result.error) {
        return sendError(res, result.error, 400);
      }

      return sendSuccess(
        res,
        "Fetched discount code info successfully",
        result.data,
      );
    } catch (error: any) {
      logger.error("Error getting discount code info:", error);
      return sendError(res, "Failed to get discount code info", 500);
    }
  }
}
