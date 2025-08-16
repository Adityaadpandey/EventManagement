import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import {
  getCachedToken,
  getCachedUser,
  isTokenBlacklisted,
  setCachedToken,
  setCachedUser,
} from "../lib/redis-fn";
import { AuthenticatedRequest, JwtPayload } from "../types/auth";

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Check blacklist early - fastest check
    const [isBlacklisted, cachedUserId] = await Promise.all([
      isTokenBlacklisted(token),
      getCachedToken(token),
    ]);

    if (isBlacklisted) {
      return res.status(401).json({ error: "Token has been invalidated." });
    }

    let userId = cachedUserId;
    let decoded: JwtPayload | null = null;

    // If no cached token, verify JWT
    if (!userId) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        userId = decoded.userId;
      } catch (jwtError) {
        return res.status(401).json({ error: "Invalid token." });
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
        return res.status(401).json({ error: "Invalid token." });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ error: "Account has been deactivated." });
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
        return res.status(401).json({ error: "Account has been deactivated." });
      }

      // If user was cached but token wasn't, cache the token
      if (!cachedUserId) {
        await setCachedToken(token, userId);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ error: "Unauthorized." });
  }
};

// Optimized role-based access control middleware
export const requireRole = (roles: string[]) => {
  // Create a Set for O(1) lookup instead of O(n) array.includes
  const roleSet = new Set(roles);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roleSet.has(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};
