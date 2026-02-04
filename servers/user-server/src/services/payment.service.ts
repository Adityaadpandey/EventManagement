import crypto from "node:crypto";
import { config } from "../config";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { Prisma } from "../generated/prisma/client";
import { delAccountCache, delTicketCache } from "../lib/cache";
import { sendEmail } from "../lib/mail";
import { notificationQueue } from "../lib/queues";
import { razorpay } from "../lib/razorpay";
import { razorpayCircuitBreaker } from "../utils/circuitBreaker";
import {
  BadRequestError,
  ExternalServiceError,
  NotFoundError,
} from "../utils/errors";
import { withTimeout } from "../utils/timeout";

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
          throw new ExternalServiceError("Invalid payment signature");
        }
      }

      // Get payment details from Razorpay with circuit breaker and timeout
      const payment = await razorpayCircuitBreaker.execute(() =>
        withTimeout(
          razorpay.payments.fetch(razorpayPaymentId),
          10000,
          "Razorpay payment fetch timed out",
        ),
      );

      if (payment.status !== "captured") {
        logger.error(`Payment ${razorpayPaymentId} not captured`);
        throw new ExternalServiceError("Payment not captured");
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
          ticket: existingTicket,
          payment,
          alreadyProcessed: true,
        };
      }

      // Update ticket status to SUCCESS (optimized query)
      const ticket = await prisma.ticket.update({
        where: { ticketId: payment.notes.ticketId },
        data: { status: "SUCCESS" },
        include: {
          ticketType: {
            select: {
              ticketTypeId: true,
              eventId: true,
              name: true,
              platformfee: true,
              platformfeePerc: true,
              event: {
                select: {
                  eventId: true,
                  title: true,
                  date: true,
                  location: true,
                  listerId: true,
                },
              },
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

      // Invalidate ticket cache after status update
      delTicketCache(ticket.ticketId).catch(() =>
        logger.warn(
          `Failed to invalidate cache for ticket: ${ticket.ticketId}`,
        ),
      );

      // Send notification about ticket creation
      await notificationQueue.add("send-notification", {
        userId: ticket.userId,
        type: "TICKET_PURCHASED",
        title: "Ticket Purchased Successfully",
        message: `Your ticket for ${ticket.ticketType.event.title} has been confirmed.`,
        metadata: {
          eventId: ticket.ticketType.eventId,
          ticketId: ticket.ticketId,
        },
      });

      // Calculate actual revenue (total price minus platform fees)
      const platformFee =
        ticket.ticketType.platformfee > 0
          ? ticket.ticketType.platformfee * ticket.quantity
          : ticket.totalPrice * ticket.ticketType.platformfeePerc;
      const actualRevenue = ticket.totalPrice - platformFee;

      // Parallel updates and lister fetch for better performance (optimized)
      const [, , lister] = await Promise.all([
        // Update ticket type sold count
        prisma.ticketType.update({
          where: { ticketTypeId: ticket.ticketTypeId },
          data: { soldCount: { increment: ticket.quantity } },
        }),
        // Update event analytics (upsert handles both create and update)
        prisma.eventAnalytics.upsert({
          where: { eventId: ticket.ticketType.eventId },
          update: {
            ticketsSold: { increment: ticket.quantity },
            revenue: { increment: actualRevenue },
          },
          create: {
            eventId: ticket.ticketType.eventId,
            ticketsSold: ticket.quantity,
            revenue: actualRevenue,
          },
        }),
        // Fetch lister data for email
        prisma.lister.findUnique({
          where: { userId: ticket.ticketType.event.listerId },
          select: {
            listerId: true,
            instagramLink: true,
            facebookLink: true,
            xLink: true,
            website: true,
            companyName: true,
            contactPhone: true,
            contactEmail: true,
            user: {
              select: { email: true },
            },
            Account: {
              select: {
                accountId: true,
                balance: true,
              },
            },
          },
        }),
      ]);

      // Create ledger entry for revenue (create account if doesn't exist)
      if (lister) {
        try {
          let account = lister.Account;

          // Create account if it doesn't exist
          if (!account) {
            account = await prisma.account.create({
              data: {
                listerId: lister.listerId,
                balance: 0,
              },
            });
            logger.info(`Created account for lister ${lister.listerId}`);
          }

          const newBalance = new Prisma.Decimal(account.balance).plus(
            actualRevenue,
          );

          await prisma.$transaction([
            prisma.ledgerEntry.create({
              data: {
                accountId: account.accountId,
                entryType: "CREDIT",
                amount: actualRevenue,
                balanceAfter: newBalance,
                referenceType: "EVENT_REVENUE",
                referenceId: ticket.ticketType.eventId,
              },
            }),
            prisma.account.update({
              where: { accountId: account.accountId },
              data: { balance: newBalance },
            }),
          ]);

          logger.info(
            `Ledger entry created for ticket ${ticket.ticketId}: ${actualRevenue}, new balance: ${newBalance}`,
          );

          // Invalidate account cache
          await delAccountCache(ticket.ticketType.event.listerId).catch(() =>
            logger.warn("Failed to invalidate account cache"),
          );
        } catch (ledgerError) {
          logger.error("Error creating ledger entry:", ledgerError);
          // Don't fail the payment if ledger fails
        }
      } else {
        logger.warn(
          `Lister not found for event ${ticket.ticketType.eventId}, skipping ledger entry`,
        );
      }

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
                  CompanyName: lister?.companyName,
                  instagramLink: lister?.instagramLink || null,
                  facebookLink: lister?.facebookLink || null,
                  xLink: lister?.xLink || null,
                  website: lister?.website || null,
                  contactPhone: lister?.contactPhone || null,
                  contactEmail: lister?.contactEmail || null,
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

      // Send notification about payment success
      await notificationQueue.add("send-notification", {
        userId: ticket.userId,
        type: "PAYMENT_SUCCESS",
        title: "Payment Successful",
        message: `Payment of ₹${ticket.totalPrice} completed successfully.`,
        metadata: {
          paymentId: razorpayPaymentId,
          amount: ticket.totalPrice,
          ticketId: ticket.ticketId,
        },
      });

      return { ticket, payment };
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
      const ticket = await prisma.ticket.findUnique({
        where: { ticketId },
        select: { status: true, ticketId: true },
      });

      if (!ticket) {
        logger.warn(
          `Ticket ${ticketId} not found for payment failure handling`,
        );
        return null;
      }

      // Don't overwrite SUCCESS or FAILED status
      if (ticket.status === "SUCCESS") {
        logger.info(
          `Ticket ${ticketId} already marked as SUCCESS, skipping failure update`,
        );
        return ticket;
      }

      if (ticket.status === "FAILED") {
        logger.info(
          `Ticket ${ticketId} already marked as FAILED, skipping duplicate update`,
        );
        return ticket;
      }

      // Only update if status is PENDING or other non-final state
      const updatedTicket = await prisma.ticket.update({
        where: { ticketId },
        data: { status: "FAILED" },
      });

      logger.info(`Ticket ${ticketId} marked as FAILED`);

      // Invalidate ticket cache after status update
      delTicketCache(ticketId).catch(() =>
        logger.warn(`Failed to invalidate cache for ticket: ${ticketId}`),
      );

      return updatedTicket;
    } catch (error) {
      logger.error("Error handling payment failure:", error);
      throw error;
    }
  }

  async getPaymentDetails(paymentId: string) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
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
            select: {
              ticketTypeId: true,
              eventId: true,
              platformfee: true,
              platformfeePerc: true,
              event: true,
            },
          },
        },
      });

      if (!ticket) {
        throw new NotFoundError("Ticket not found");
      }

      if (ticket.status !== "SUCCESS") {
        throw new BadRequestError("Only successful tickets can be refunded");
      }

      // Check if refund already exists
      const existingRefund = await prisma.refund.findFirst({
        where: {
          ticketId,
          status: { in: ["PENDING", "COMPLETED"] },
        },
      });

      if (existingRefund) {
        throw new BadRequestError("Refund already exists for this ticket");
      }

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          ticketId,
          amount,
          reason,
          status: "PENDING",
          processedBy,
          userId: ticket.userId,
          eventId: ticket.ticketType.eventId,
        },
      });

      return refund;
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
              ticketType: {
                select: {
                  ticketTypeId: true,
                  platformfee: true,
                  platformfeePerc: true,
                  event: {
                    select: {
                      listerId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Calculate actual revenue impact (refund amount minus platform fees that were included)
      // If platform fee exists, subtract it; if 0, use platformfeePerc
      const platformFee =
        refund.ticket.ticketType.platformfee > 0
          ? refund.ticket.ticketType.platformfee * refund.ticket.quantity
          : refund.amount * refund.ticket.ticketType.platformfeePerc;
      const actualRevenueImpact = refund.amount - platformFee;

      // Update analytics (decrease revenue and ticket count)
      await prisma.eventAnalytics.update({
        where: { eventId: refund.eventId! },
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

      // Create DEBIT ledger entry for refund
      const lister = await prisma.lister.findUnique({
        where: { listerId: refund.ticket.ticketType.event.listerId },
        include: {
          Account: true,
        },
      });

      if (lister) {
        try {
          let account = lister.Account;

          // Create account if it doesn't exist
          if (!account) {
            account = await prisma.account.create({
              data: {
                listerId: lister.listerId,
                balance: 0,
              },
            });
            logger.info(
              `Created account for lister ${lister.listerId} during refund`,
            );
          }

          const newBalance = new Prisma.Decimal(account.balance).minus(
            actualRevenueImpact,
          );

          await prisma.$transaction([
            prisma.ledgerEntry.create({
              data: {
                accountId: account.accountId,
                entryType: "DEBIT",
                amount: actualRevenueImpact,
                balanceAfter: newBalance,
                referenceType: "REFUND",
                referenceId: refundId,
              },
            }),
            prisma.account.update({
              where: { accountId: account.accountId },
              data: { balance: newBalance },
            }),
          ]);

          logger.info(
            `Ledger entry created for refund ${refundId}: -${actualRevenueImpact}, new balance: ${newBalance}`,
          );

          // Invalidate account cache
          await delAccountCache(refund.ticket.ticketType.event.listerId).catch(
            () => logger.warn("Failed to invalidate account cache"),
          );
        } catch (ledgerError) {
          logger.error("Error creating ledger entry for refund:", ledgerError);
          // Don't fail the refund if ledger fails
        }
      } else {
        logger.warn(
          `Lister not found for refund ${refundId}, skipping ledger entry`,
        );
      }

      return refund;
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

      return refund;
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
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          event: {
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
