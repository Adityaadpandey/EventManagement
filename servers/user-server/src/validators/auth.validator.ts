import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

const identifierSchema = z
  .string({
    message: "Identifier must be a string",
  })
  .min(1, "Email or phone number is required");

export const requestOtpSchema = z.object({
  identifier: identifierSchema,
});

export const verifyOtpSchema = z.object({
  identifier: identifierSchema,
  otp: z
    .string({
      message: "OTP must be a string",
    })
    .min(1, "OTP is required")
    .min(4, "OTP must be at least 4 characters"),
});
