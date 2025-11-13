import { Job, Worker } from "bullmq";
import { redis } from "../config/redis";
import { sendSMS } from "../lib/twilio-sms";

import { getLogger } from "@repo/logger";

const logger: any = getLogger("Phone OTP Worker", "debug");

interface OtpJobData {
  to: string;
  otp: string;
}

import { parsePhoneNumberFromString } from "libphonenumber-js";

export const otpWorker = new Worker(
  "otps",
  async (job: Job<OtpJobData>) => {
    const { to, otp } = job.data;

    const parsed = parsePhoneNumberFromString(to);
    if (!parsed?.isValid()) {
      logger.error(`❌ Invalid phone number in OTP job: ${to}`);
      throw new Error(`Invalid phone number format: ${to}`);
    }

    try {
      await sendSMS(otp, parsed.number); // pass formatted number
      logger.info(`OTP sent to ${parsed.number}`);
    } catch (err) {
      logger.error(`Failed to send OTP to ${parsed.number}`, err);
      throw err;
    }
  },
  { connection: redis },
);

otpWorker.on("failed", (job: any, err) => {
  logger.error(`OTP job ${job.id} failed:`, err);
});
