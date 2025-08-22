import crypto from "crypto";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { razorpay } from "../lib/razorpay";

export class PaymentService {
	async verifySignature(orderId: string, paymentId: string, signature: string) {
		try {
			const body = orderId + "|" + paymentId;
			const expectedSignature = crypto
				.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
				.update(body.toString())
				.digest("hex");

			return expectedSignature === signature;
		} catch (error) {
			logger.error("Error verifying signature:", error);
			throw error;
		}
	}

	async getPaymentDetails(paymentId: string) {
		try {
			const payment = await razorpay.payments.fetch(paymentId);
			return { data: payment };
		} catch (error) {
			logger.error("Error fetching payment details:", error);
			throw error;
		}
	}

	async processRefund(
		ticketId: string,
		amount: number,
		reason?: string,
		processedBy?: string,
	) {
		try {
			// Get ticket details
			const ticket = await prisma.ticket.findUnique({
				where: { ticketId },
				include: {
					ticketType: {
						include: {
							event: true,
						},
					},
				},
			});

			if (!ticket) {
				return { error: "Ticket not found" };
			}

			if (ticket.status !== "SUCCESS") {
				return { error: "Only successful tickets can be refunded" };
			}

			// Check if refund already exists
			const existingRefund = await prisma.refund.findFirst({
				where: {
					ticketId,
					status: { in: ["PENDING", "COMPLETED"] },
				},
			});

			if (existingRefund) {
				return { error: "Refund already exists for this ticket" };
			}

			// Create refund record
			const refund = await prisma.refund.create({
				data: {
					ticketId,
					amount,
					reason,
					status: "PENDING",
					processedBy,
					userUserId: ticket.userId,
					eventEventId: ticket.ticketType.eventId,
				},
			});

			return { data: refund };
		} catch (error) {
			logger.error("Error processing refund:", error);
			throw error;
		}
	}

	async completeRefund(refundId: string, processedBy: string) {
		try {
			const refund = await prisma.refund.update({
				where: { refundId },
				data: {
					status: "COMPLETED",
					processedBy,
					processedAt: new Date(),
				},
				include: {
					ticket: {
						include: {
							ticketType: true,
						},
					},
				},
			});

			// Update analytics (decrease revenue and ticket count)
			await prisma.event.update({
				where: { eventId: refund.eventEventId! },
				data: {
					ticketsSold: {
						decrement: refund.ticket.quantity,
					},
					revenue: {
						decrement: refund.amount,
					},
				},
			});

			await prisma.ticketType.update({
				where: { ticketTypeId: refund.ticket.ticketTypeId },
				data: {
					soldCount: {
						decrement: refund.ticket.quantity,
					},
				},
			});

			return { data: refund };
		} catch (error) {
			logger.error("Error completing refund:", error);
			throw error;
		}
	}

	async rejectRefund(refundId: string, processedBy: string) {
		try {
			const refund = await prisma.refund.update({
				where: { refundId },
				data: {
					status: "REJECTED",
					processedBy,
					processedAt: new Date(),
				},
			});

			return { data: refund };
		} catch (error) {
			logger.error("Error rejecting refund:", error);
			throw error;
		}
	}

	async getRefunds(eventId?: string, userId?: string) {
		try {
			const whereClause: any = {};

			if (eventId) {
				whereClause.eventEventId = eventId;
			}

			if (userId) {
				whereClause.userUserId = userId;
			}

			const refunds = await prisma.refund.findMany({
				where: whereClause,
				include: {
					ticket: {
						include: {
							ticketType: {
								select: {
									name: true,
									price: true,
								},
							},
						},
					},
					User: {
						select: {
							name: true,
							email: true,
							phone: true,
						},
					},
					Event: {
						select: {
							title: true,
							date: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
			return refunds;
		} catch (error) {
			logger.error("Error fetching refunds:", error);
			throw error;
		}
	}
}
