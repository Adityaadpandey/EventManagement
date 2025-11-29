import z from "zod";

export const bankDetailsSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  branchCode: z.string().optional(),
});

export const bankDetailsSchemaUpdate = bankDetailsSchema.partial();
