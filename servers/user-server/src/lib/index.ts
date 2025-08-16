import jwt from "jsonwebtoken";
import { Twilio } from "twilio";
import { config } from "../config";
import { setCachedToken } from "./redis-fn";

const client = new Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export const sendSMS = async (otp: string, phone: string) => {
  try {
    await client.messages.create({
      body: `Your verification code is ${otp}`,
      from: config.TWILIO_PHONE_NUMBER, // Use config instead of process.env
      to: phone, // Remove .toString() since phone is already a string
    });
    console.log(`SMS sent successfully to ${phone}`);
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS");
  }
};

export const createToken = (
  userId: string,
  expiresIn: number = 3600,
): string => {
  try {
    const secret = config.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    const token = jwt.sign({ userId }, secret, {
      expiresIn: expiresIn,
    });

    // Store the token in Redis (async operation, but we don't await to avoid blocking)
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
