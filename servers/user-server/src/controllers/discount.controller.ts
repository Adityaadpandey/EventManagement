import { Response } from "express";
import { DiscountService } from "../services/discount.service";
import { AuthenticatedRequest } from "../types/auth";
import {
  BadRequestError,
  isAppError,
  UnauthorizedError,
} from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { createDiscountSchema } from "../validators/discount.validator";

export class DiscountController {
  private discountService: DiscountService;

  constructor() {
    this.discountService = new DiscountService();
  }

  async createDiscountCode(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("User ID is required");

    const eventId = req.params.eventId as string;
    if (!eventId) throw new BadRequestError("Event ID is required");

    try {
      const validatedData = createDiscountSchema.parse(req.body);
      logInfo(req, "Creating discount code", {
        eventId,
        code: validatedData.code,
      });

      const result = await this.discountService.createDiscountCode({
        eventId,
        ...validatedData,
      });

      return sendSuccess(res, "Discount code created successfully", result);
    } catch (error: any) {
      logError(req, "Failed to create discount code", error, { eventId });

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
      return sendError(res, "Failed to create discount code", 500);
    }
  }

  async getDiscountCodesByEvent(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("User ID is required");

    const eventId = req.params.eventId as string;
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
      const result =
        await this.discountService.getDiscountCodesByEvent(eventId);

      return sendSuccess(res, "Fetched discount codes successfully", result);
    } catch (error: any) {
      logError(req, "Failed to get discount codes", error, { eventId });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get discount codes", 500);
    }
  }

  async getCodeInfoByCode(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("User ID is required");
    const eventId = req.params.eventId as string;
    const code = req.params.code as string;
    if (!code) return sendError(res, "Code is required", 400);
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
      const result = await this.discountService.getCodeInfoById(code, eventId);

      return sendSuccess(
        res,
        "Fetched discount code info successfully",
        result,
      );
    } catch (error: any) {
      logError(req, "Failed to get discount code info", error, {
        code,
        eventId,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get discount code info", 500);
    }
  }
}
