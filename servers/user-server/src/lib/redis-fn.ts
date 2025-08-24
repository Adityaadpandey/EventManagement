import { createHash } from "node:crypto";
import logger from "../config/logger";
import { redis } from "../config/redis";

// Redis Cache Keys
export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  TOKEN: (token: string) => `token:${hashToken(token)}`,
  BLACKLIST: (token: string) => `blacklist:${hashToken(token)}`,
  PUBLIC_EVENTS: "events:public",
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER: 3600, // 1 hour
  TOKEN: 604800, // 7 days (same as JWT expiry)
  BLACKLIST: 604800, // 7 days
  PUBLIC_EVENTS: 600, // 10 minutes
};

// Hash function for tokens (for secure cache keys)
const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const getTokenDataAndBlacklistStatus = async (
  token: string,
): Promise<[boolean, string | null]> => {
  try {
    const pipeline = redis.pipeline();
    pipeline.get(CACHE_KEYS.BLACKLIST(token));
    pipeline.get(CACHE_KEYS.TOKEN(token));

    const results = await pipeline.exec();

    const isBlacklisted = results?.[0]?.[1] !== null;
    const userId = results?.[1]?.[1] as string | null;

    return [isBlacklisted, userId];
  } catch (error) {
    logger.error("Redis batch operation error:", error);
    return [false, null]; // Fail open for availability
  }
};

// User caching functions
export const getCachedUser = async (userId: string) => {
  try {
    const cached = await redis.get(CACHE_KEYS.USER(userId));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error("Redis get user error:", error);
    return null;
  }
};

export const setCachedUser = async (userId: string, userData: any) => {
  try {
    await redis.setex(
      CACHE_KEYS.USER(userId),
      CACHE_TTL.USER,
      JSON.stringify(userData),
    );
  } catch (error) {
    logger.error("Redis set user error:", error);
  }
};

export const deleteCachedUser = async (userId: string) => {
  try {
    await redis.del(CACHE_KEYS.USER(userId));
  } catch (error) {
    logger.error("Redis delete user error:", error);
  }
};

// Token caching functions
export const getCachedToken = async (token: string): Promise<string | null> => {
  try {
    const userId = await redis.get(CACHE_KEYS.TOKEN(token));
    return userId;
  } catch (error) {
    logger.error("Redis get token error:", error);
    return null;
  }
};

export const setCachedToken = async (token: string, userId: string) => {
  try {
    await redis.setex(CACHE_KEYS.TOKEN(token), CACHE_TTL.TOKEN, userId);
  } catch (error) {
    logger.error("Redis set token error:", error);
  }
};

// Token blacklist functions (for logout)
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redis.get(CACHE_KEYS.BLACKLIST(token));
    return result !== null;
  } catch (error) {
    logger.error("Redis check blacklist error:", error);
    return false; // Fail open for availability
  }
};

export const blacklistToken = async (token: string) => {
  try {
    await redis.setex(CACHE_KEYS.BLACKLIST(token), CACHE_TTL.BLACKLIST, "1");
  } catch (error) {
    logger.error("Redis blacklist token error:", error);
  }
};

// Batch operations for even faster performance
export const invalidateUserSessions = async (userId: string) => {
  try {
    // Clear user cache when user data changes
    await deleteCachedUser(userId);
  } catch (error) {
    logger.error("Redis invalidate user sessions error:", error);
  }
};

export const getCachedPublicEvents = async (page: number, limit: number) => {
  try {
    const cacheKey = `${CACHE_KEYS.PUBLIC_EVENTS}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error("Redis get public events error:", error);
    return null;
  }
};

export const setCachedPublicEvents = async (
  events: any,
  page: number,
  limit: number,
) => {
  try {
    if (!events || !events.events || events.events.length === 0) {
      // don’t cache empty responses
      return;
    }

    const cacheKey = `${CACHE_KEYS.PUBLIC_EVENTS}:${page}:${limit}`;
    await redis.setex(
      cacheKey,
      CACHE_TTL.PUBLIC_EVENTS,
      JSON.stringify(events),
    );
  } catch (error) {
    logger.error("Redis set public events error:", error);
  }
};
