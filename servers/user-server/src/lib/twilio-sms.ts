import { Twilio } from "twilio";
import { config } from "../config";
import logger from "../config/logger";

const client = new Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

// would me making a queue for sending SMS in production
export const sendSMS = async (otp: string, phone: string) => {
  try {
    const message = await client.messages.create({
      body: `Your verification code is ${otp}`,
      from: config.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    logger.info(`SMS sent successfully to ${phone}, SID: ${message.sid}`);
    return message.sid;
  } catch (error) {
    logger.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS");
  }
};
