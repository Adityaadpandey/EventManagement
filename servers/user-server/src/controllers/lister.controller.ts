import type { Response } from "express";
import { ListerServer } from "../services/lister.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  applyForListerSchema,
  updateListerSchema,
} from "../validators/lister.validator";
import { logError, logInfo } from "../utils/logger-context";

export class ListerController {
  private listerService: ListerServer;

  constructor() {
    this.listerService = new ListerServer();
  }

  async applyForLister(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    const validatedData = applyForListerSchema.parse(req.body);

    try {
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
      logError(req, "Failed to apply for lister", error, { userId });
      return sendError(res, "Failed to apply for lister", 500);
    }
  }

  async meLister(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    try {
      const lister = await this.listerService.meLister(userId);
      return sendSuccess(res, "Lister found", lister);
    } catch (error: any) {
      logError(req, "Failed to fetch lister profile", error, { userId });
      return sendError(res, "Lister not found", 500);
    }
  }

  async updateLister(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    const validatedData = updateListerSchema.parse(req.body);

    try {
      logInfo(req, "Updating lister profile", { userId });
      const updatedLister = await this.listerService.updateLister(
        userId,
        validatedData,
      );
      return sendSuccess(res, "Lister updated successfully", updatedLister);
    } catch (error: any) {
      logError(req, "Failed to update lister", error, { userId });
      return sendError(res, "Failed to update lister", 500);
    }
  }

  async getLister(req: AuthenticatedRequest, res: Response) {
    const listerId = req.params.listerId;
    if (!listerId) {
      return sendError(res, "Lister ID is required", 400);
    }

    try {
      const lister = await this.listerService.getLister(listerId);
      return sendSuccess(res, "Lister found", lister);
    } catch (error: any) {
      logError(req, "Failed to fetch lister", error, { listerId });
      return sendError(res, "Failed to fetch lister", 500);
    }
  }

  async getListerAnalytics(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    try {
      const analytics = await this.listerService.getListerAnalytics(userId);
      return sendSuccess(res, "Lister analytics retrieved", analytics);
    } catch (error: any) {
      logError(req, "Failed to get lister analytics", error, { userId });
      return sendError(res, "Failed to get analytics", 500);
    }
  }

  async getTicketAttendes(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, "User ID is required", 400);

    const { eventId } = req.params;
    if (!eventId) return sendError(res, "Event ID is required", 400);

    try {
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
        eventId,
        userId,
      });
      return sendError(
        res,
        "Failed to get event attendee tickets details",
        500,
      );
    }
  }
}
