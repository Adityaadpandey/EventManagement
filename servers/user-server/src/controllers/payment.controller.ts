import type { Response } from "express";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { PaymentService } from "../services/payment.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class PaymentController {
	private paymentService: PaymentService;

	constructor() {
		this.paymentService = new PaymentService();
	}

	async verifyPayment(req: AuthenticatedRequest, res: Response) {
		try {
			const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
				req.body;

			if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
				return sendError(res, "Missing payment verification data", 400);
			}

			const isValid = await this.paymentService.verifySignature(
				razorpay_order_id,
				razorpay_payment_id,
				razorpay_signature,
			);

			if (!isValid) {
				return sendError(res, "Invalid payment signature", 400);
			}

			const paymentDetails =
				await this.paymentService.getPaymentDetails(razorpay_payment_id);

			return sendSuccess(res, "Payment verified successfully", {
				verified: true,
				paymentDetails: paymentDetails.data,
			});
		} catch (error) {
			logger.error("Error verifying payment:", error);
			return sendError(res, "Failed to verify payment", 500);
		}
	}

	async requestRefund(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			if (!userId) return sendError(res, "User ID is required", 400);

			const { ticketId, reason } = req.body;

			if (!ticketId) {
				return sendError(res, "Ticket ID is required", 400);
			}

			// Verify user owns the ticket
			const ticket = await prisma.ticket.findFirst({
				where: {
					ticketId,
					userId,
				},
			});

			if (!ticket) {
				return sendError(res, "Ticket not found or access denied", 404);
			}

			const result = await this.paymentService.processRefund(
				ticketId,
				ticket.totalPrice,
				reason,
			);

			if (result.error) {
				return sendError(res, result.error, 400);
			}

			return sendSuccess(
				res,
				"Refund request created successfully",
				result.data,
			);
		} catch (error) {
			logger("Error requesting refund:", error);
			return sendError(res, "Failed to request refund", 500);
		}
	}

	async processRefund(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			const userRole = req.user?.role;

			const { refundId, action } = req.body; // action: 'approve' or 'reject'

			if (!refundId || !action) {
				return sendError(res, "Refund ID and action are required", 400);
			}

			let result: any;
			if (action === "approve") {
				result = await this.paymentService.completeRefund(refundId, userId!);
			} else if (action === "reject") {
				result = await this.paymentService.rejectRefund(refundId, userId!);
			} else {
				return sendError(res, "Invalid action. Use 'approve' or 'reject'", 400);
			}

			return sendSuccess(res, `Refund ${action}d successfully`, result.data);
		} catch (error) {
			logger("Error processing refund:", error);
			return sendError(res, "Failed to process refund", 500);
		}
	}

	async getRefunds(req: AuthenticatedRequest, res: Response) {
		try {
			const userId = req.user?.userId;
			const userRole = req.user?.role;
			const { eventId } = req.query;

			let searchUserId: string | undefined;
			let searchEventId: string | undefined;

			// Set filters based on user role
			if (userRole === "USER") {
				searchUserId = userId; // Users can only see their own refunds
			} else if (userRole === "LISTER") {
				// Listers can see refunds for their events
				if (eventId) {
					// Verify lister owns the event
					const lister = await prisma.lister.findUnique({
						where: { userId },
					});

					if (!lister) {
						return sendError(res, "Lister profile not found", 400);
					}

					const event = await prisma.event.findFirst({
						where: {
							eventId: eventId as string,
							listerId: lister.listerId,
						},
					});

					if (!event) {
						return sendError(res, "Event not found or access denied", 404);
					}

					searchEventId = eventId as string;
				} else {
					return sendError(res, "Event ID is required for listers", 400);
				}
			}
			// Admins can see all refunds (no filters needed)

			const result = await this.paymentService.getRefunds(
				searchEventId,
				searchUserId,
			);

			return sendSuccess(res, "Refunds fetched successfully", result.data);
		} catch (error) {
			logger("Error fetching refunds:", error);
			return sendError(res, "Failed to fetch refunds", 500);
		}
	}
}
