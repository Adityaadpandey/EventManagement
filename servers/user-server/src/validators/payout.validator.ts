import z from "zod";

export const requestPayoutSchema = z.object({
  amount: z.number().min(100, "Minimum payout amount is 100"),
  eventId: z.string().optional(),
  type: z.enum(["FULL", "PARTIAL"]),
  remark: z.string().optional(),
});

export const approvePayoutSchema = z.object({
  approvedAmount: z.number().optional(),
  remark: z.string().optional(),
});
