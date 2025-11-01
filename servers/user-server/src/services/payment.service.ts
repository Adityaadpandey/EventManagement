import crypto from "node:crypto";
import { config } from "../config";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { sendEmail } from "../lib/mail";
import { razorpay } from "../lib/razorpay";

export class PaymentService {
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    skipSignatureVerification = false, // For webhook calls
  ) {
    try {
      // Verify signature (skip for webhook as it's already verified)
      if (!skipSignatureVerification) {
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
          .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest("hex");

        if (expectedSignature !== razorpaySignature) {
          return { error: "Invalid payment signature" };
        }
      }

      // Get payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpayPaymentId);

      if (payment.status !== "captured") {
        return { error: "Payment not captured" };
      }

      // Check if ticket exists and get current status
      const existingTicket = await prisma.ticket.findUnique({
        where: { ticketId: payment.notes.ticketId },
        select: { status: true },
      });

      // If ticket is already SUCCESS, don't process again (idempotency)
      if (existingTicket?.status === "SUCCESS") {
        logger.info(`Ticket ${payment.notes.ticketId} already processed`);
        return {
          data: {
            ticket: existingTicket,
            payment,
            alreadyProcessed: true,
          },
        };
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

      // Calculate actual revenue (total price minus platform fees)
      // If platform fee exists, subtract it; if 0, subtract 5% of total price
      const platformFee =
        ticket.ticketType.platformfee > 0
          ? ticket.ticketType.platformfee * ticket.quantity
          : ticket.totalPrice * 0.05;
      const actualRevenue = ticket.totalPrice - platformFee;

      // Update event analytics
      await prisma.event.update({
        where: { eventId: ticket.ticketType.eventId },
        data: {
          ticketsSold: {
            increment: ticket.quantity,
          },
          revenue: {
            increment: actualRevenue,
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
            increment: actualRevenue,
          },
        },
        create: {
          eventId: ticket.ticketType.eventId,
          ticketsSold: ticket.quantity,
          revenue: actualRevenue,
        },
      });

      // Send confirmation email to user
      try {
        if (ticket.user.email) {
          await sendEmail(
            ticket.user.email,
            `Your Ticket for ${ticket.ticketType.event.title}`,
            {
              type: "ticket",
              content: {
                ticket: {
                  ticketQR: ticket.qrCode,
                  ticketId: ticket.ticketId,
                  eventName: ticket.ticketType.event.title,
                  seatNumber: ticket.qrCode,
                  date: ticket.ticketType.event.date
                    .toISOString()
                    .split("T")[0],
                  venue: ticket.ticketType.event.location,
                },
              },
            },
            ticket.user.name || "Valued Customer",
          );
          logger.info(
            `Ticket confirmation email sent to ${ticket.user.email} for ticket ${ticket.ticketId}`,
          );
        } else {
          logger.warn(
            `No email address found for user ${ticket.userId}, skipping email notification`,
          );
        }
      } catch (emailError) {
        logger.error("Error sending ticket confirmation email:", emailError);
        // Don't fail the payment verification if email fails
      }

      return { data: { ticket, payment } };
    } catch (error) {
      logger.error("Error verifying payment:", error);
      throw error;
    }
  }

  async getTicketStatus(ticketId: string) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { ticketId },
        select: { status: true, ticketId: true },
      });
      return ticket;
    } catch (error) {
      logger.error("Error fetching ticket status:", error);
      return null;
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

      // Calculate actual revenue impact (refund amount minus platform fees that were included)
      // If platform fee exists, subtract it; if 0, subtract 5% of refund amount
      const platformFee =
        refund.ticket.ticketType.platformfee > 0
          ? refund.ticket.ticketType.platformfee * refund.ticket.quantity
          : refund.amount * 0.05;
      const actualRevenueImpact = refund.amount - platformFee;

      // Update analytics (decrease revenue and ticket count)
      await prisma.event.update({
        where: { eventId: refund.eventEventId! },
        data: {
          ticketsSold: {
            decrement: refund.ticket.quantity,
          },
          revenue: {
            decrement: actualRevenueImpact,
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
