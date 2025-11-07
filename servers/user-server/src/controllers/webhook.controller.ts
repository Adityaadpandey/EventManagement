import type { Request, Response } from "express";
import crypto from "node:crypto";
import { config } from "../config";
import logger from "../config/logger";
import { PaymentService } from "../services/payment.service";
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
        logger.error("Missing webhook signature or secret");
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
        logger.error("Invalid webhook signature");
        return sendError(res, "Invalid signature", 400);
      }

      const event = req.body.event;
      const payload = req.body.payload.payment.entity;

      logger.info(`Received webhook event: ${event}`);

      // Handle different webhook events
      switch (event) {
        case "payment.captured":
          await this.handlePaymentCaptured(payload);
          break;

        case "payment.failed":
          await this.handlePaymentFailed(payload);
          break;

        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }

      // Always return 200 to acknowledge receipt
      return sendSuccess(res, "Webhook processed successfully");
    } catch (error) {
      logger.error("Error processing webhook:", error);
      // Still return 200 to prevent Razorpay from retrying
      return sendSuccess(res, "Webhook received");
    }
  }

  private async handlePaymentCaptured(payment: any) {
    try {
      const ticketId = payment.notes?.ticketId;

      if (!ticketId) {
        logger.warn("Payment captured but no ticketId in notes");
        return;
      }

      // Check if ticket is already processed
      const ticket = await this.paymentService.getTicketStatus(ticketId);

      if (ticket?.status === "SUCCESS") {
        logger.info(`Ticket ${ticketId} already processed, skipping`);
        return;
      }

      // Process the payment
      await this.paymentService.verifyPayment(
        payment.order_id,
        payment.id,
        "", // Signature already verified by webhook
        true, // Skip signature verification
      );

      logger.info(
        `Successfully processed payment via webhook for ticket ${ticketId}`,
      );
    } catch (error: any) {
      logger.error(
        "Error handling payment.captured webhook:",
        error.message || error,
      );
    }
  }

  private async handlePaymentFailed(payment: any) {
    try {
      const ticketId = payment.notes?.ticketId;

      if (!ticketId) {
        logger.warn("Payment failed but no ticketId in notes");
        return;
      }

      await this.paymentService.handlePaymentFailure(ticketId);
      logger.info(`Payment failed for ticket ${ticketId}`);
    } catch (error) {
      logger.error("Error handling payment.failed webhook:", error);
    }
  }
}
