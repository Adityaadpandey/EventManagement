import type { Response } from "express";
import { TicketService } from "../services/ticket.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class TicketController {
	private ticketService: TicketService;

	constructor() {
		this.ticketService = new TicketService();
	}

	async buyTicket(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const { ticketTypeId, quantity = 1, attendeeData } = req.body;

			if (!ticketTypeId)
				return sendError(res, "Ticket type ID is required", 400);

			if (quantity <= 0)
				return sendError(res, "Quantity must be greater than 0", 400);

			// Call the service to handle ticket purchase logic
			const result = await this.ticketService.buyTicket(
				userId,
				ticketTypeId,
				quantity,
				attendeeData,
			);

			if (result.error) {
				return sendError(res, result.error, 400);
			}

			return sendSuccess(
				res,
				"Ticket created successfully, proceed to payment",
				result.data,
			);
		} catch (error) {
			console.error("Error buying ticket:", error);
			return sendError(res, "Failed to create ticket", 500);
		}
	}

	async verifyPayment(req: AuthenticatedRequest, res: Response) {
		try {
			const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
				req.body;

			if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
				return sendError(res, "Missing payment verification data", 400);
			}

			const result = await this.ticketService.verifyPayment(
				razorpay_order_id,
				razorpay_payment_id,
				razorpay_signature,
			);

			if (result.error) {
				return sendError(res, result.error, 400);
			}

			return sendSuccess(
				res,
				"Payment verified and ticket confirmed",
				result.data,
			);
		} catch (error) {
			console.error("Error verifying payment:", error);
			return sendError(res, "Failed to verify payment", 500);
		}
	}

	async handlePaymentFailure(req: AuthenticatedRequest, res: Response) {
		try {
			const { ticketId } = req.body;

			if (!ticketId) {
				return sendError(res, "Ticket ID is required", 400);
			}

			const result = await this.ticketService.handlePaymentFailure(ticketId);

			return sendSuccess(res, "Payment failure handled", result.data);
		} catch (error) {
			console.error("Error handling payment failure:", error);
			return sendError(res, "Failed to handle payment failure", 500);
		}
	}

	async getUserTickets(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const result = await this.ticketService.getUserTickets(userId);
			return sendSuccess(res, "User tickets fetched successfully", result.data);
		} catch (error) {
			console.error("Error fetching user tickets:", error);
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

			if (result.error) {
				return sendError(res, result.error, 400);
			}

			return sendSuccess(
				res,
				"Ticket buyers fetched successfully",
				result.data,
			);
		} catch (error) {
			console.error("Error fetching ticket buyers for event:", error);
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

			return sendSuccess(
				res,
				"All ticket buyers fetched successfully",
				result.data,
			);
		} catch (error) {
			console.error("Error fetching all ticket buyers:", error);
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

			if (result.error) {
				return sendError(res, result.error, 404);
			}

			return sendSuccess(
				res,
				"Ticket details fetched successfully",
				result.data,
			);
		} catch (error) {
			console.error("Error fetching ticket details:", error);
			return sendError(res, "Failed to fetch ticket details", 500);
		}
	}
}
