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

    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ error: "Token has been invalidated." });
    }

    let userId = await getCachedToken(token);

    if (!userId) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        userId = decoded.userId;
      } catch (jwtError) {
        return res.status(401).json({ error: "Invalid token." });
      }
    }

    let user = await getCachedUser(userId);

    if (!user) {
      user = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          name: true,
          role: true,
          phone: true,
          phoneVerified: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid token." });
      }

      // Cache user and token
      await Promise.all([
        setCachedUser(userId, user),
        setCachedToken(token, userId),
      ]);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ error: "Unauthorized." });
  }
};

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};
