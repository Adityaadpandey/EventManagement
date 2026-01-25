import type { Response } from "express";
import { ListerService } from "../services/lister.service";
import type { AuthenticatedRequest } from "../types/auth";
import {
  BadRequestError,
  isAppError,
  UnauthorizedError,
} from "../utils/errors";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  applyForListerSchema,
  updateListerSchema,
} from "../validators/lister.validator";

export class ListerController {
  private listerService: ListerService;

  constructor() {
    this.listerService = new ListerService();
  }

  async applyForLister(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedData = applyForListerSchema.parse(req.body);

      logInfo(req, "Applying for lister", {
        userId,
        companyName: validatedData.companyName,
      });
      const lister = await this.listerService.applyForLister(
        userId,
        validatedData,
      );
      return sendSuccess(res, "Lister applied successfully", lister);
    } catch (error: any) {
      logError(req, "Failed to apply for lister", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to apply for lister", 500);
    }
  }

  async meLister(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const lister = await this.listerService.meLister(userId);
      return sendSuccess(res, "Lister found", lister);
    } catch (error: any) {
      logError(req, "Failed to fetch lister profile", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Lister not found", 500);
    }
  }

  async updateLister(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const validatedData = updateListerSchema.parse(req.body);

      logInfo(req, "Updating lister profile", { userId });
      const updatedLister = await this.listerService.updateLister(
        userId,
        validatedData,
      );
      return sendSuccess(res, "Lister updated successfully", updatedLister);
    } catch (error: any) {
      logError(req, "Failed to update lister", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to update lister", 500);
    }
  }

  async getLister(req: AuthenticatedRequest, res: Response) {
    try {
      const listerId = req.params.listerId as string;
      if (!listerId) throw new BadRequestError("Lister ID is required");

      const lister = await this.listerService.getLister(listerId);
      return sendSuccess(res, "Lister found", lister);
    } catch (error: any) {
      logError(req, "Failed to fetch lister", error, {
        listerId: req.params.listerId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch lister", 500);
    }
  }

  async getListerAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const analytics = await this.listerService.getListerAnalytics(userId);
      return sendSuccess(res, "Lister analytics retrieved", analytics);
    } catch (error: any) {
      logError(req, "Failed to get lister analytics", error, {
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get analytics", 500);
    }
  }

  async getTicketAttendes(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const eventId = req.params.eventId as string;
      if (!eventId) throw new BadRequestError("Event ID is required");

      const ticketsDetails =
        await this.listerService.getEventAttendeeTicketsDetails(
          eventId,
          userId,
        );
      return sendSuccess(
        res,
        "Event attendee tickets details retrieved",
        ticketsDetails.data,
      );
    } catch (error: any) {
      logError(req, "Failed to get event attendee tickets details", error, {
        eventId: req.params.eventId as string,
        userId: req.user?.userId,
      });

      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(
        res,
        "Failed to get event attendee tickets details",
        500,
      );
    }
  }
}
