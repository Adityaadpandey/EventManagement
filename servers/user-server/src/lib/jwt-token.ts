import jwt from "jsonwebtoken";
import { config } from "../config";
import logger from "../config/logger";
import { ServiceUnavailableError } from "../utils/errors";
import { setTokenCache } from "./cache";

export const createToken = (
  userId: string,
  role: "USER" | "LISTER" | "ADMIN" | "SUPER_ADMIN" = "USER",
  expiresIn: number = 60 * 60 * 24 * 7, // Default to 7 day,
): string => {
  try {
    const secret = config.JWT_SECRET;
    if (!secret) {
      throw new ServiceUnavailableError(
        "JWT_SECRET environment variable is not set",
      );
    }

    const token = jwt.sign({ userId, role }, secret, {
      expiresIn: expiresIn,
    });

    // Store the token in Redis
    setTokenCache(token, userId).catch((error) => {
      logger.error("Failed to cache token:", error);
      // Don't throw here as token creation succeeded
    });

    return token;
  } catch (error) {
    logger.error("Error creating token:", error);
    throw error;
  }
};
