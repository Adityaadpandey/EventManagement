import type { Request, Response } from "express";
import crypto from "node:crypto";
import { config } from "../config";
import { PaymentService } from "../services/payment.service";
import { logError, logInfo, logWarn } from "../utils/logger-context";
import { sendError, sendSuccess } from "../utils/responseMsg";

export class WebhookController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  async handlePaymentWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature
      const webhookSignature = req.headers["x-razorpay-signature"] as string;
      const webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSignature || !webhookSecret) {
        logError(req, "Missing webhook signature or secret");
        return sendError(res, "Invalid webhook request", 400);
      }

      // Create expected signature
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      // Verify signature
      if (expectedSignature !== webhookSignature) {
        logError(req, "Invalid webhook signature");
        return sendError(res, "Invalid signature", 400);
      }

      const event = req.body.event;
      const payload = req.body.payload.payment.entity;

      logInfo(req, "Received webhook event", { event, paymentId: payload.id });

      // Handle different webhook events
      switch (event) {
        case "payment.captured":
          await this.handlePaymentCaptured(req, payload);
          break;

        case "payment.failed":
          await this.handlePaymentFailed(req, payload);
          break;

        default:
          logInfo(req, "Unhandled webhook event", { event });
      }

      // Always return 200 to acknowledge receipt
      return sendSuccess(res, "Webhook processed successfully");
    } catch (error) {
      logError(req, "Error processing webhook", error);
      // Still return 200 to prevent Razorpay from retrying
      return sendSuccess(res, "Webhook received");
    }
  }

  private async handlePaymentCaptured(req: Request, payment: any) {
    try {
      const ticketId = payment.notes?.ticketId;

      if (!ticketId) {
        logWarn(req, "Payment captured but no ticketId in notes", {
          paymentId: payment.id,
        });
        return;
      }

      // Check if ticket is already processed
      const ticket = await this.paymentService.getTicketStatus(ticketId);

      if (ticket?.status === "SUCCESS") {
        logInfo(req, "Ticket already processed, skipping", { ticketId });
        return;
      }

      // Process the payment
      await this.paymentService.verifyPayment(
        payment.order_id,
        payment.id,
        "", // Signature already verified by webhook
        true, // Skip signature verification
      );

      logInfo(req, "Successfully processed payment via webhook", {
        ticketId,
        paymentId: payment.id,
      });
    } catch (error: any) {
      logError(req, "Error handling payment.captured webhook", error, {
        ticketId: payment.notes?.ticketId,
        paymentId: payment.id,
      });
    }
  }

  private async handlePaymentFailed(req: Request, payment: any) {
    try {
      const ticketId = payment.notes?.ticketId;

      if (!ticketId) {
        logWarn(req, "Payment failed but no ticketId in notes", {
          paymentId: payment.id,
        });
        return;
      }

      await this.paymentService.handlePaymentFailure(ticketId);
      logInfo(req, "Payment failed for ticket", {
        ticketId,
        paymentId: payment.id,
      });
    } catch (error) {
      logError(req, "Error handling payment.failed webhook", error, {
        ticketId: payment.notes?.ticketId,
        paymentId: payment.id,
      });
    }
  }
}
