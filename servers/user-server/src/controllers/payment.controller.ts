import type { Response } from "express";
import { prisma } from "../config/db";
import { PaymentService } from "../services/payment.service";
import type { AuthenticatedRequest } from "../types/auth";
import { isAppError, UnauthorizedError } from "../utils/errors";
import { formatZodError } from "../utils/formatZodError";
import { logError, logInfo } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";
import {
  processRefundSchema,
  requestRefundSchema,
  verifyPaymentSchema,
} from "../validators/payment.validator";
import { handlePaymentFailureSchema } from "../validators/ticket.validator";

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        verifyPaymentSchema.parse(req.body);

      logInfo(req, "Verifying payment", { orderId: razorpay_order_id });
      const result = await this.paymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      );

      return sendSuccess(res, "Payment verified and ticket confirmed", result);
    } catch (error: any) {
      logError(req, "Failed to verify payment", error);
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
      return sendError(res, "Failed to verify payment", 500);
    }
  }

  async handlePaymentFailure(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = handlePaymentFailureSchema.parse(req.body);

      logInfo(req, "Handling payment failure", { ticketId });
      const result = await this.paymentService.handlePaymentFailure(ticketId);

      return sendSuccess(res, "Payment failure handled", result);
    } catch (error: any) {
      logError(req, "Failed to handle payment failure", error, {
        ticketId: req.body.ticketId,
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
      return sendError(res, "Failed to handle payment failure", 500);
    }
  }

  async requestRefund(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError("User ID is required");

      const { ticketId, reason } = requestRefundSchema.parse(req.body);
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

      logInfo(req, "Requesting refund", { ticketId, userId });
      const result = await this.paymentService.processRefund(
        ticketId,
        ticket.totalPrice,
        reason,
      );

      return sendSuccess(res, "Refund request created successfully", result);
    } catch (error: any) {
      logError(req, "Failed to request refund", error, {
        ticketId: req.body.ticketId,
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
      return sendError(res, "Failed to request refund", 500);
    }
  }

  async processRefund(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const { refundId, action } = processRefundSchema.parse(req.body);

      if (!refundId || !action) {
        return sendError(res, "Refund ID and action are required", 400);
      }

      logInfo(req, "Processing refund", { refundId, action, userId });
      let result: any;
      if (action === "approve") {
        result = await this.paymentService.completeRefund(refundId, userId!);
      } else if (action === "reject") {
        result = await this.paymentService.rejectRefund(refundId, userId!);
      } else {
        return sendError(res, "Invalid action. Use 'approve' or 'reject'", 400);
      }

      return sendSuccess(res, `Refund ${action}d successfully`, result);
    } catch (error: any) {
      logError(req, "Failed to process refund", error, {
        refundId: req.body.refundId,
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
      return sendError(res, "Failed to process refund", 500);
    }
  }

  async getRefunds(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const eventId = req.params.eventId as string;

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

      return sendSuccess(res, "Refunds fetched successfully", result);
    } catch (error) {
      logError(req, "Failed to fetch refunds", error, {
        eventId: req.params.eventId as string,
      });
      if (isAppError(error)) {
        return sendError(res, error.message, error.statusCode);
      }
      return sendError(res, "Failed to fetch refunds", 500);
    }
  }
}
