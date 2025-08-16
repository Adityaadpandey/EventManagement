import jwt from "jsonwebtoken";
import { Twilio } from "twilio";
import { config } from "../config";
import logger from "../config/logger";
import { setCachedToken } from "./redis-fn";

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

export const createToken = (
  userId: string,
  expiresIn: number = 60 * 60 * 24 * 7, // Default to 7 day,
): string => {
  try {
    const secret = config.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    const token = jwt.sign({ userId }, secret, {
      expiresIn: expiresIn,
    });

    // Store the token in Redis
    setCachedToken(token, userId).catch((error) => {
      console.error("Failed to cache token:", error);
      // Don't throw here as token creation succeeded
    });

    return token;
  } catch (error) {
    console.error("Error creating token:", error);
    throw error;
  }
};
