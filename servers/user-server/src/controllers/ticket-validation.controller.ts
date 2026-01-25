import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { TicketValidationService } from "../services/ticket-validation.service";
import { BadRequestError, isAppError } from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  checkerLoginSchema,
  resetTicketScanSchema,
  scanTicketSchema,
} from "../validators/ticket-validation.validator";

interface CheckerRequest extends Request {
  checker?: {
    checkerId: string;
    username: string;
    eventId?: string;
    listerId: string;
  };
}

export class TicketValidationController {
  private ticketValidationService: TicketValidationService;

  constructor() {
    this.ticketValidationService = new TicketValidationService();
  }

  async checkerLogin(req: Request, res: Response) {
    try {
      const { username, password } = checkerLoginSchema.parse(req.body);

      logInfo(req, "Checker login attempt", { username });
      const result = await this.ticketValidationService.checkerLogin(
        username,
        password,
      );
      return sendSuccess(res, "Login successful", result);
    } catch (error: any) {
      logError(req, "Checker login failed", error, {
        username: req.body.username,
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
      return sendError(res, "Login failed", 401);
    }
  }

  async scanTicket(req: CheckerRequest, res: Response) {
    try {
      const checkerId = req.checker?.checkerId;
      if (!checkerId)
        throw new BadRequestError("Checker authentication required");

      const { qrCode, deviceInfo, note } = scanTicketSchema.parse(req.body);

      logInfo(req, "Scanning ticket", {
        checkerId,
        qrCode: qrCode.substring(0, 10) + "...",
      });
      const ipAddress = req.ip;
      const result = await this.ticketValidationService.scanTicket(
        qrCode,
        checkerId,
        deviceInfo,
        ipAddress,
        note,
      );

      if (result.success) {
        return sendSuccess(res, result.message, result.ticket);
      }
      return sendError(res, result.message, 400);
    } catch (error: any) {
      logError(req, "Failed to scan ticket", error, {
        checkerId: req.checker?.checkerId,
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
      return sendError(res, "Failed to scan ticket", 500);
    }
  }

  async resetTicketScan(req: CheckerRequest, res: Response) {
    try {
      const checkerId = req.checker?.checkerId;
      if (!checkerId)
        throw new BadRequestError("Checker authentication required");

      const ticketId = req.params.ticketId as string;
      if (!ticketId) throw new BadRequestError("Ticket ID is required");

      const { note } = resetTicketScanSchema.parse(req.body);

      logInfo(req, "Resetting ticket scan", { ticketId, checkerId });
      const result = await this.ticketValidationService.resetTicketScan(
        ticketId,
        checkerId,
        note,
      );
      return sendSuccess(res, result.message, result);
    } catch (error: any) {
      logError(req, "Failed to reset ticket scan", error, {
        ticketId: req.params.ticketId,
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
      return sendError(res, "Failed to reset ticket scan", 500);
    }
  }

  async getScanHistory(req: CheckerRequest, res: Response) {
    try {
      const checkerId = req.checker?.checkerId;
      if (!checkerId)
        throw new BadRequestError("Checker authentication required");

      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 20;

      const result = await this.ticketValidationService.getScanHistory(
        checkerId,
        page,
        limit,
      );
      return sendSuccess(res, "Scan history retrieved successfully", result);
    } catch (error: any) {
      logError(req, "Failed to get scan history", error, {
        checkerId: req.checker?.checkerId,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get scan history", 500);
    }
  }

  async getCheckerProfile(req: CheckerRequest, res: Response) {
    try {
      const checkerId = req.checker?.checkerId;
      if (!checkerId)
        throw new BadRequestError("Checker authentication required");

      const checker = await prisma.ticketChecker.findUnique({
        where: {
          checkerId,
        },
        select: {
          event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              time: true,
              location: true,
            },
          },
          lister: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!checker) {
        return sendError(res, "Checker not found", 404);
      }

      return sendSuccess(
        res,
        "Checker profile retrieved successfully",
        checker,
      );
    } catch (error: any) {
      logError(req, "Failed to get checker profile", error, {
        checkerId: req.checker?.checkerId,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to get checker profile", 500);
    }
  }
}
