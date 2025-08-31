import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  getCachedToken,
  getCachedUser,
  isTokenBlacklisted,
  setCachedToken,
  setCachedUser,
} from "../lib/redis-fn";
import type { AuthenticatedRequest, JwtPayload } from "../types/auth";
import { sendError } from "../utils/responseMsg";

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return sendError(res, "No token provided", 401);
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET is not defined");
      return sendError(res, "Server configuration error", 500);
    }

    // Check blacklist early - fastest check
    const [isBlacklisted, cachedUserId] = await Promise.all([
      isTokenBlacklisted(token),
      getCachedToken(token),
    ]);

    if (isBlacklisted) {
      return sendError(res, "Token has been blacklisted", 401);
    }

    let userId = cachedUserId;
    let decoded: JwtPayload | null = null;

    // If no cached token, verify JWT
    if (!userId) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        userId = decoded.userId;
      } catch (_jwtError) {
        return sendError(res, "Invalid Authorization token", 401);
      }
    }

    // Try to get user from cache first
    let user = await getCachedUser(userId);

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
          isActive: true, // Added this important field
        },
      });

      if (!user) {
        return sendError(res, "User not found", 404);
      }

      // Check if user is active
      if (!user.isActive) {
        return sendError(res, "Account has been deactivated", 401);
      }

      // Cache both user and token (only if we had to fetch from DB)
      const cachePromises = [setCachedUser(userId, user)];

      // Only cache token if we just verified it (not already cached)
      if (!cachedUserId) {
        cachePromises.push(setCachedToken(token, userId));
      }

      await Promise.all(cachePromises);
    } else {
      // Even if user is cached, check if active (this is a fast in-memory check)
      if (!user.isActive) {
        return sendError(res, "Account has been deactivated", 401);
      }

      // If user was cached but token wasn't, cache the token
      if (!cachedUserId) {
        await setCachedToken(token, userId);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    logger("Auth Middleware Error:", error);
    return sendError(res, "Authentication failed", 500);
  }
};

// Optimized role-based access control middleware
export const requireRole = (roles: string[]) => {
  // Create a Set for O(1) lookup instead of O(n) array.includes
  const roleSet = new Set(roles);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Authentication required", 401);
    }

    if (!roleSet.has(req.user.role)) {
      return sendError(res, "Access denied", 403);
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
