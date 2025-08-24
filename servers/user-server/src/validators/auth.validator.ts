import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

const phoneSchema = z
  .string({
    message: "Phone number must be a string",
  })
  .min(1, "Phone number is required")
  .refine(
    (val) => {
      const phone = parsePhoneNumberFromString(val, "IN");
      return phone?.isValid();
    },
    {
      message: "Invalid phone number",
    },
  );

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string({
      message: "OTP must be a string",
    })
    .min(1, "OTP is required")
    .min(4, "OTP must be at least 4 characters"),
});
