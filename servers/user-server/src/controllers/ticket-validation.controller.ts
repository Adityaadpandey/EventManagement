import type { Request, Response } from "express";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { TicketValidationService } from "../services/ticket-validation.service";
import { sendError, sendSuccess } from "../utils/responseMsg";

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
			const { username, password } = req.body;

			if (!username || !password) {
				return sendError(res, "Username and password are required", 400);
			}

			const result = await this.ticketValidationService.checkerLogin(
				username,
				password,
			);
			return sendSuccess(res, "Login successful", result);
		} catch (error: any) {
			logger.error("Error in checker login:", error);
			return sendError(res, error.message || "Login failed", 401);
		}
	}

	async scanTicket(req: CheckerRequest, res: Response) {
		try {
			const checkerId = req.checker?.checkerId;
			if (!checkerId) {
				return sendError(res, "Checker authentication required", 401);
			}

			const { qrCode, deviceInfo, note } = req.body;
			if (!qrCode) {
				return sendError(res, "QR code is required", 400);
			}

			const ipAddress = req.ip || req.connection.remoteAddress;
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
			logger.error("Error scanning ticket:", error);
			return sendError(res, error.message || "Failed to scan ticket", 500);
		}
	}

	async resetTicketScan(req: CheckerRequest, res: Response) {
		try {
			const checkerId = req.checker?.checkerId;
			if (!checkerId) {
				return sendError(res, "Checker authentication required", 401);
			}

			const { ticketId } = req.params;
			const { note } = req.body;

			if (!ticketId) {
				return sendError(res, "Ticket ID is required", 400);
			}

			const result = await this.ticketValidationService.resetTicketScan(
				ticketId,
				checkerId,
				note,
			);
			return sendSuccess(res, result.message, result);
		} catch (error: any) {
			logger.error("Error resetting ticket scan:", error);
			return sendError(
				res,
				error.message || "Failed to reset ticket scan",
				500,
			);
		}
	}

	async getScanHistory(req: CheckerRequest, res: Response) {
		try {
			const checkerId = req.checker?.checkerId;
			if (!checkerId) {
				return sendError(res, "Checker authentication required", 401);
			}

			const page = Number.parseInt(req.query.page as string) || 1;
			const limit = Number.parseInt(req.query.limit as string) || 20;

			const result = await this.ticketValidationService.getScanHistory(
				checkerId,
				page,
				limit,
			);
			return sendSuccess(res, "Scan history retrieved successfully", result);
		} catch (error: any) {
			logger.error("Error getting scan history:", error);
			return sendError(res, error.message || "Failed to get scan history", 500);
		}
	}

	async getCheckerProfile(req: CheckerRequest, res: Response) {
		try {
			const checkerId = req.checker?.checkerId;
			if (!checkerId) {
				return sendError(res, "Checker authentication required", 401);
			}

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
			logger.error("Error getting checker profile:", error);
			return sendError(res, "Failed to get checker profile", 500);
		}
	}
}
