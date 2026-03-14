import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  getTokenDataAndBlacklistStatus,
  getUserCache,
  setTokenCache,
  setUserCache,
} from "../lib/cache";
import type { AuthenticatedRequest, JwtPayload } from "../types/auth";
import {
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from "../utils/errors";

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new NotFoundError("No token provided");
    }

    if (!config.JWT_SECRET) {
      logger.error("JWT_SECRET is not defined");
      throw new NotFoundError("Server configuration error");
    }

    // Check blacklist early - fastest check
    const [isBlacklisted, cachedUserId] =
      await getTokenDataAndBlacklistStatus(token);

    if (isBlacklisted) {
      throw new ForbiddenError("Token has been blacklisted");
    }

    let userId = cachedUserId;
    let decoded: JwtPayload | null = null;

    // If no cached token, verify JWT
    if (!userId) {
      try {
        decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        userId = decoded.userId;
      } catch (_jwtError) {
        throw new UnauthorizedError("Invalid Authorization token");
      }
    }

    // Try to get user from cache first
    let user = await getUserCache(userId);

    if (!user) {
      // Fetch from database with minimal fields
      user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          name: true,
          role: true,
          phone: true,
          phoneVerified: true,
          emailVerified: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Check if user is active
      if (!(user as any).isActive) {
        throw new UnauthorizedError("Account has been deactivated");
      }

      // Cache both user and token (only if we had to fetch from DB)
      const cachePromises = [setUserCache(userId, user)];

      // Only cache token if we just verified it (not already cached)
      if (!cachedUserId) {
        cachePromises.push(setTokenCache(token, userId));
      }

      await Promise.all(cachePromises);
    } else {
      // Even if user is cached, check if active (this is a fast in-memory check)
      if (!(user as any).isActive) {
        throw new ForbiddenError("Account has been deactivated");
      }

      // If user was cached but token wasn't, cache the token
      if (!cachedUserId) {
        await setTokenCache(token, userId);
      }
    }

    req.user = user as any;
    next();
  } catch (error) {
    logger.error("Auth Middleware Error:", error);
    // the error needed to be thrown not a new instance of error
    throw error;
  }
};

// Optimized role-based access control middleware
export const requireRole = (roles: string[]) => {
  // Create a Set for O(1) lookup instead of O(n) array.includes
  const roleSet = new Set(roles);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!roleSet.has(req.user.role)) {
      throw new ForbiddenError("Access denied");
    }

    next();
  };
};

export const checkerAuthMiddleware = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.header("checker-auth")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.checker = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token." });
  }
};
