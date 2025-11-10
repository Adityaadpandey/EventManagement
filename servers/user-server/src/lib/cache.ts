import { createHash } from "node:crypto";
import logger from "../config/logger";
import { redis } from "../config/redis";

// Cache key prefixes
export const CACHE_PREFIX = {
  USER: "user",
  USER_PROFILE: "user:profile",
  TOKEN: "token",
  BLACKLIST: "blacklist",
  EVENT: "event",
  EVENT_PUBLIC: "event:public",
  EVENT_LISTER: "event:lister",
  EVENT_ANALYTICS: "event:analytics",
  TICKET: "ticket",
  TICKET_TYPE: "ticket:type",
  LISTER: "lister",
  DISCOUNT: "discount",
  OTP: "otp",
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER: 3600, // 1 hour
  USER_PROFILE: 1800, // 30 minutes
  TOKEN: 604800, // 7 days (same as JWT expiry)
  BLACKLIST: 604800, // 7 days
  EVENT_PUBLIC: 300, // 5 minutes (frequently updated)
  EVENT_DETAILS: 600, // 10 minutes
  EVENT_LISTER: 180, // 3 minutes (lister's own events)
  EVENT_ANALYTICS: 60, // 1 minute (real-time data)
  TICKET: 300, // 5 minutes
  TICKET_TYPE: 600, // 10 minutes
  LISTER: 1800, // 30 minutes
  DISCOUNT: 300, // 5 minutes
  OTP: 300, // 5 minutes
} as const;

/**
 * Hash function for sensitive data (tokens, etc.)
 */
export const hashKey = (key: string): string => {
  return createHash("sha256").update(key).digest("hex");
};

/**
 * Build cache key with prefix
 */
export const buildCacheKey = (prefix: string, ...parts: string[]): string => {
  return `${prefix}:${parts.join(":")}`;
};

/**
 * Generic cache get with JSON parsing
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

/**
 * Generic cache set with JSON stringification
 */
export const cacheSet = async (
  key: string,
  value: any,
  ttl: number,
): Promise<void> => {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
  }
};

/**
 * Generic cache delete
 */
export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
  }
};

/**
 * Delete multiple keys matching a pattern
 */
export const cacheDelPattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Deleted ${keys.length} cache keys matching ${pattern}`);
    }
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error);
  }
};

// ============================================================================
// USER CACHING
// ============================================================================

export const getUserCache = async (userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.USER, userId);
  return cacheGet(key);
};

export const setUserCache = async (userId: string, userData: any) => {
  const key = buildCacheKey(CACHE_PREFIX.USER, userId);
  await cacheSet(key, userData, CACHE_TTL.USER);
};

export const delUserCache = async (userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.USER, userId);
  await cacheDel(key);
};

export const getUserProfileCache = async (userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.USER_PROFILE, userId);
  return cacheGet(key);
};

export const setUserProfileCache = async (userId: string, profile: any) => {
  const key = buildCacheKey(CACHE_PREFIX.USER_PROFILE, userId);
  await cacheSet(key, profile, CACHE_TTL.USER_PROFILE);
};

export const delUserProfileCache = async (userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.USER_PROFILE, userId);
  await cacheDel(key);
};

// ============================================================================
// TOKEN CACHING
// ============================================================================

export const getTokenCache = async (token: string): Promise<string | null> => {
  const key = buildCacheKey(CACHE_PREFIX.TOKEN, hashKey(token));
  try {
    return await redis.get(key);
  } catch (error) {
    logger.error("Token cache get error:", error);
    return null;
  }
};

export const setTokenCache = async (token: string, userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.TOKEN, hashKey(token));
  try {
    await redis.setex(key, CACHE_TTL.TOKEN, userId);
  } catch (error) {
    logger.error("Token cache set error:", error);
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const key = buildCacheKey(CACHE_PREFIX.BLACKLIST, hashKey(token));
  try {
    const result = await redis.get(key);
    return result !== null;
  } catch (error) {
    logger.error("Token blacklist check error:", error);
    return false;
  }
};

export const blacklistToken = async (token: string) => {
  const key = buildCacheKey(CACHE_PREFIX.BLACKLIST, hashKey(token));
  try {
    await redis.setex(key, CACHE_TTL.BLACKLIST, "1");
  } catch (error) {
    logger.error("Token blacklist error:", error);
  }
};

/**
 * Batch check token blacklist and get user ID
 */
export const getTokenDataAndBlacklistStatus = async (
  token: string,
): Promise<[boolean, string | null]> => {
  try {
    const hashedToken = hashKey(token);
    const pipeline = redis.pipeline();
    pipeline.get(buildCacheKey(CACHE_PREFIX.BLACKLIST, hashedToken));
    pipeline.get(buildCacheKey(CACHE_PREFIX.TOKEN, hashedToken));

    const results = await pipeline.exec();

    const isBlacklisted = results?.[0]?.[1] !== null;
    const userId = results?.[1]?.[1] as string | null;

    return [isBlacklisted, userId];
  } catch (error) {
    logger.error("Token batch operation error:", error);
    return [false, null];
  }
};

// ============================================================================
// EVENT CACHING
// ============================================================================

export const getEventCache = async (eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT, eventId);
  return cacheGet(key);
};

export const setEventCache = async (eventId: string, eventData: any) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT, eventId);
  await cacheSet(key, eventData, CACHE_TTL.EVENT_DETAILS);
};

export const delEventCache = async (eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT, eventId);
  await cacheDel(key);

  // Also invalidate public event cache
  const publicKey = buildCacheKey(CACHE_PREFIX.EVENT_PUBLIC, eventId);
  await cacheDel(publicKey);
};

export const getPublicEventCache = async (eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_PUBLIC, eventId);
  return cacheGet(key);
};

export const setPublicEventCache = async (eventId: string, eventData: any) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_PUBLIC, eventId);
  await cacheSet(key, eventData, CACHE_TTL.EVENT_PUBLIC);
};

export const getListerEventsCache = async (userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_LISTER, userId);
  return cacheGet(key);
};

export const setListerEventsCache = async (userId: string, events: any) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_LISTER, userId);
  await cacheSet(key, events, CACHE_TTL.EVENT_LISTER);
};

export const delListerEventsCache = async (userId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_LISTER, userId);
  await cacheDel(key);
};

export const getEventAnalyticsCache = async (eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_ANALYTICS, eventId);
  return cacheGet(key);
};

export const setEventAnalyticsCache = async (
  eventId: string,
  analytics: any,
) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_ANALYTICS, eventId);
  await cacheSet(key, analytics, CACHE_TTL.EVENT_ANALYTICS);
};

export const delEventAnalyticsCache = async (eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.EVENT_ANALYTICS, eventId);
  await cacheDel(key);
};

// ============================================================================
// TICKET CACHING
// ============================================================================

export const getTicketCache = async (ticketId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.TICKET, ticketId);
  return cacheGet(key);
};

export const setTicketCache = async (ticketId: string, ticketData: any) => {
  const key = buildCacheKey(CACHE_PREFIX.TICKET, ticketId);
  await cacheSet(key, ticketData, CACHE_TTL.TICKET);
};

export const delTicketCache = async (ticketId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.TICKET, ticketId);
  await cacheDel(key);
};

// ============================================================================
// Ticket Type CACHING
// ============================================================================

export const getTicketTypeCache = async (ticketTypeId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.TICKET_TYPE, ticketTypeId);
  return cacheGet(key);
};

export const setTicketTypeCache = async (
  ticketTypeId: string,
  ticketType: any,
) => {
  const key = buildCacheKey(CACHE_PREFIX.TICKET_TYPE, ticketTypeId);
  await cacheSet(key, ticketType, CACHE_TTL.TICKET_TYPE);
};

export const delTicketTypeCache = async (ticketTypeId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.TICKET_TYPE, ticketTypeId);
  await cacheDel(key);
};

// ============================================================================
// LISTER CACHING
// ============================================================================

export const getListerCache = async (listerId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.LISTER, listerId);
  return cacheGet(key);
};

export const setListerCache = async (listerId: string, listerData: any) => {
  const key = buildCacheKey(CACHE_PREFIX.LISTER, listerId);
  await cacheSet(key, listerData, CACHE_TTL.LISTER);
};

export const delListerCache = async (listerId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.LISTER, listerId);
  await cacheDel(key);
};

// ============================================================================
// DISCOUNT CACHING
// ============================================================================

export const getDiscountCache = async (code: string, eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.DISCOUNT, eventId, code);
  return cacheGet(key);
};

export const setDiscountCache = async (
  code: string,
  eventId: string,
  discountData: any,
) => {
  const key = buildCacheKey(CACHE_PREFIX.DISCOUNT, eventId, code);
  await cacheSet(key, discountData, CACHE_TTL.DISCOUNT);
};

export const delDiscountCache = async (code: string, eventId: string) => {
  const key = buildCacheKey(CACHE_PREFIX.DISCOUNT, eventId, code);
  await cacheDel(key);
};

// ============================================================================
// CHECKER CACHING
// ============================================================================

export const getCheckerCache = async (username: string) => {
  const key = buildCacheKey("checker", username);
  return cacheGet(key);
};

export const setCheckerCache = async (username: string, checkerData: any) => {
  const key = buildCacheKey("checker", username);
  await cacheSet(key, checkerData, 1800); // 30 minutes TTL
};

export const delCheckerCache = async (username: string) => {
  const key = buildCacheKey("checker", username);
  await cacheDel(key);
};

export const getCheckerByIdCache = async (checkerId: string) => {
  const key = buildCacheKey("checker", "id", checkerId);
  return cacheGet(key);
};

export const setCheckerByIdCache = async (
  checkerId: string,
  checkerData: any,
) => {
  const key = buildCacheKey("checker", "id", checkerId);
  await cacheSet(key, checkerData, 1800); // 30 minutes TTL
};

export const delCheckerByIdCache = async (checkerId: string) => {
  const key = buildCacheKey("checker", "id", checkerId);
  await cacheDel(key);
};

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate all caches related to an event
 */
export const invalidateEventCaches = async (
  eventId: string,
  userId?: string,
) => {
  await Promise.all([
    delEventCache(eventId),
    delEventAnalyticsCache(eventId),
    userId ? delListerEventsCache(userId) : Promise.resolve(),
    // Invalidate public events list cache
    cacheDelPattern("event:public:*"),
  ]);
};

/**
 * Invalidate all caches related to a user
 */
export const invalidateUserCaches = async (userId: string) => {
  await Promise.all([
    delUserCache(userId),
    delUserProfileCache(userId),
    delListerEventsCache(userId),
  ]);
};

/**
 * Invalidate all caches related to a ticket
 */
export const invalidateTicketCaches = async (
  ticketId: string,
  eventId?: string,
) => {
  await Promise.all([
    delTicketCache(ticketId),
    eventId ? delEventAnalyticsCache(eventId) : Promise.resolve(),
  ]);
};
