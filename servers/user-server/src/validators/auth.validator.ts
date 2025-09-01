import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

const identifierSchema = z
  .string({
    message: "Identifier must be a string",
  })
  .min(1, "Email or phone number is required")
  .refine(
    (val) => {
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(val)) {
        return true;
      }

      // Check if it's a valid phone number
      const phone = parsePhoneNumberFromString(val, "IN");
      return phone?.isValid();
    },
    {
      message: "Must be a valid email address or phone number",
    },
  );

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
