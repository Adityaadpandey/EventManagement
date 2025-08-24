import { z } from "zod";

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required"),
});

export const requestRefundSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  reason: z.string().optional(),
});

export const processRefundSchema = z.object({
  refundId: z.string().min(1, "Refund ID is required"),
  action: z.enum(["approve", "reject"], {
    message: "Action must be either 'approve' or 'reject'",
  }),
});
