import { z } from "zod";

export const buyTicketSchema = z.object({
  ticketTypeId: z.string().min(1, "Ticket type ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").default(1),
  attendeeData: z.any().optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required"),
});

export const handlePaymentFailureSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
});
