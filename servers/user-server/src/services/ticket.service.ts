import crypto from "node:crypto";
import { config } from "../config";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { razorpay } from "../lib/razorpay";

export class TicketService {
	async buyTicket(
		userId: string,
		ticketTypeId: string,
		quantity = 1,
		attendeeData?: any[],
	) {
		try {
			// Fetch ticket type and event details
			const ticketType = await prisma.ticketType.findUnique({
				where: { ticketTypeId },
				include: {
					event: {
						include: {
							CustomField: true,
						},
					},
				},
			});

			if (!ticketType) {
				return { error: "Ticket type not found" };
			}

			// Ensure event is approved
			if (ticketType.event.status !== "APPROVED") {
				return { error: "Event is not available for ticket purchase" };
			}

			// Check availability
			const availableQuantity = ticketType.quantity - ticketType.soldCount;
			if (availableQuantity < quantity) {
				return { error: `Only ${availableQuantity} tickets available` };
			}

			// Check sales cutoff
			if (ticketType.salesCutoff && new Date() > ticketType.salesCutoff) {
				return { error: "Ticket sales have ended" };
			}

			const totalPrice = ticketType.price * quantity;
			const qrCode = this.generateQRCode();

			// Determine payment status
			const isFree = totalPrice === 0;
			const ticketStatus = isFree ? "SUCCESS" : "PENDING";

			// Create ticket
			const ticket = await prisma.ticket.create({
				data: {
					ticketTypeId,
					userId,
					quantity,
					totalPrice,
					qrCode,
					status: ticketStatus,
					eventEventId: ticketType.eventId,
				},
			});

			// Store attendee custom field responses if provided
			if (attendeeData && attendeeData.length > 0) {
				const responses = attendeeData.map((response) => ({
					ticketId: ticket.ticketId,
					fieldId: response.fieldId,
					value: response.value,
				}));

				await prisma.attendeeFieldResponse.createMany({
					data: responses,
				});
			}

			// If ticket is free, return success directly
			if (isFree) {
				return {
					data: {
						ticket,
						event: ticketType.event,
						message: "Free ticket issued successfully",
					},
				};
			}

			// Else, create Razorpay order
			const razorpayOrder = await razorpay.orders.create({
				amount: totalPrice * 100, // in paise
				currency: "INR",
				receipt: ticket.ticketId,
				notes: {
					ticketId: ticket.ticketId,
					eventId: ticketType.eventId,
					userId,
				},
			});

			return {
				data: {
					ticket,
					razorpayOrder,
					event: ticketType.event,
				},
			};
		} catch (error) {
			logger.error("Error buying ticket:", error);
			throw error;
		}
	}

	async verifyPayment(
		razorpayOrderId: string,
		razorpayPaymentId: string,
		razorpaySignature: string,
	) {
		try {
			// Verify signature
			const body = razorpayOrderId + "|" + razorpayPaymentId;
			const expectedSignature = crypto
				.createHmac("sha256", config.RAZORPAY_KEY_SECRET)
				.update(body.toString())
				.digest("hex");

			if (expectedSignature !== razorpaySignature) {
				return { error: "Invalid payment signature" };
			}

			// Get payment details from Razorpay
			const payment = await razorpay.payments.fetch(razorpayPaymentId);

			if (payment.status !== "captured") {
				return { error: "Payment not captured" };
			}

			// Update ticket status to SUCCESS
			const ticket = await prisma.ticket.update({
				where: { ticketId: payment.notes.ticketId },
				data: { status: "SUCCESS" },
				include: {
					ticketType: {
						include: {
							event: true,
						},
					},
					user: {
						select: {
							name: true,
							email: true,
							phone: true,
						},
					},
				},
			});

			// Update sold count and revenue
			await prisma.ticketType.update({
				where: { ticketTypeId: ticket.ticketTypeId },
				data: {
					soldCount: {
						increment: ticket.quantity,
					},
				},
			});

			// Update event analytics
			await prisma.event.update({
				where: { eventId: ticket.ticketType.eventId },
				data: {
					ticketsSold: {
						increment: ticket.quantity,
					},
					revenue: {
						increment: ticket.totalPrice,
					},
				},
			});

			// Update event analytics table
			await prisma.eventAnalytics.upsert({
				where: { eventId: ticket.ticketType.eventId },
				update: {
					ticketsSold: {
						increment: ticket.quantity,
					},
					revenue: {
						increment: ticket.totalPrice,
					},
				},
				create: {
					eventId: ticket.ticketType.eventId,
					ticketsSold: ticket.quantity,
					revenue: ticket.totalPrice,
				},
			});

			return { data: { ticket, payment } };
		} catch (error) {
			logger.error("Error verifying payment:", error);
			throw error;
		}
	}

	async getUserTickets(userId: string) {
		try {
			const tickets = await prisma.ticket.findMany({
				where: {
					userId,
					status: "SUCCESS", // Only show successful tickets
				},
				include: {
					ticketType: {
						include: {
							event: {
								select: {
									title: true,
									description: true,
									date: true,
									time: true,
									location: true,
									banner_square: true,
								},
							},
						},
					},
					AttendeeFieldResponse: {
						include: {
							field: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return { data: tickets };
		} catch (error) {
			logger.error("Error fetching user tickets:", error);
			throw error;
		}
	}

	async getTicketBuyersForEvent(eventId: string, userId: string) {
		try {
			const lister = await prisma.lister.findUnique({
				where: { userId },
			});

			if (!lister) {
				throw new Error("Lister profile not found");
			}

			const listerId = lister.listerId;

			// If listerId provided, verify the lister owns this event
			if (listerId) {
				const event = await prisma.event.findFirst({
					where: {
						eventId,
						listerId,
					},
				});

				if (!event) {
					return { error: "Event not found or access denied" };
				}
			}

			const tickets = await prisma.ticket.findMany({
				where: {
					Event: {
						eventId,
					},
					status: "SUCCESS",
				},
				include: {
					user: {
						select: {
							userId: true,
							name: true,
							email: true,
							phone: true,
						},
					},
					ticketType: {
						select: {
							name: true,
							price: true,
						},
					},
					AttendeeFieldResponse: {
						include: {
							field: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return { data: tickets };
		} catch (error) {
			logger.error("Error fetching ticket buyers:", error);
			throw error;
		}
	}

	async getAllTicketBuyers() {
		try {
			const tickets = await prisma.ticket.findMany({
				where: {
					status: "SUCCESS",
				},
				include: {
					user: {
						select: {
							userId: true,
							name: true,
							email: true,
							phone: true,
						},
					},
					ticketType: {
						select: {
							name: true,
							price: true,
						},
					},
					Event: {
						select: {
							eventId: true,
							title: true,
							date: true,
							location: true,
						},
					},
					AttendeeFieldResponse: {
						include: {
							field: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return { data: tickets };
		} catch (error) {
			logger.error("Error fetching all ticket buyers:", error);
			throw error;
		}
	}

	async handlePaymentFailure(ticketId: string) {
		try {
			// Update ticket status to FAILED
			const ticket = await prisma.ticket.update({
				where: { ticketId },
				data: { status: "FAILED" },
			});

			return { data: ticket };
		} catch (error) {
			logger.error("Error handling payment failure:", error);
			throw error;
		}
	}

	async getTicketDetails(ticketId: string, userId?: string) {
		try {
			const whereClause: any = { ticketId };

			// If userId provided, ensure user owns the ticket
			if (userId) {
				whereClause.userId = userId;
			}

			const ticket = await prisma.ticket.findUnique({
				where: whereClause,
				include: {
					ticketType: {
						include: {
							event: true,
						},
					},
					user: {
						select: {
							name: true,
							email: true,
							phone: true,
						},
					},
					AttendeeFieldResponse: {
						include: {
							field: true,
						},
					},
					TicketScanLog: {
						orderBy: { scannedAt: "desc" },
						take: 5,
					},
				},
			});

			if (!ticket) {
				return { error: "Ticket not found" };
			}

			return { data: ticket };
		} catch (error) {
			logger.error("Error fetching ticket details:", error);
			throw error;
		}
	}

	private generateQRCode(): string {
		// Generate a unique QR code string
		const timestamp = Date.now().toString();
		const random = Math.random().toString(36).substring(2, 15);
		return `TICKET_${timestamp}_${random}`;
	}
}
