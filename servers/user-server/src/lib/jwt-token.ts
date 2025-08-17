import jwt from "jsonwebtoken";
import { config } from "../config";
import { setCachedToken } from "./redis-fn";

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
