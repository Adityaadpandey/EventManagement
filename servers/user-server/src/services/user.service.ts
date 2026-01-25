import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  getUserProfileCache,
  invalidateUserCaches,
  setUserProfileCache,
} from "../lib/cache";
import { createToken } from "../lib/jwt-token";
import { NotFoundError } from "../utils/errors";

export class UserService {
  async getUserProfile(userId: string) {
    try {
      // Try cache first
      const cached: any = await getUserProfileCache(userId);
      if (cached) {
        logger.info(`User profile cache hit for ${userId}`);
        // Generate fresh token
        const token = createToken((cached as any).userId, (cached as any).role);
        return { ...cached, token };
      }

      // Cache miss - fetch from database
      const userProfile = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          phoneVerified: true,
          emailVerified: true,
          avatar: true,
          profileComplete: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!userProfile) {
        throw new NotFoundError("User not found");
      }

      // Cache the profile (without token)
      await setUserProfileCache(userId, userProfile);

      // Generate token
      const token = createToken(userProfile.userId, userProfile.role);
      return { ...userProfile, token };
    } catch (error: any) {
      logger.error("Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile");
    }
  }

  async updateUserProfile(
    userId: string,
    updates: { name?: string; email?: string; avatar?: string; phone?: string },
  ) {
    try {
      const updatedUser = await prisma.user.update({
        where: { userId },
        data: updates,
        select: {
          userId: true,
          name: true,
          phone: true,
          email: true,
          avatar: true,
          role: true,
          phoneVerified: true,
          emailVerified: true,
          profileComplete: true,
        },
      });

      if (!updatedUser) {
        throw new NotFoundError("User not found or update failed");
      }

      // Invalidate all user-related caches
      await invalidateUserCaches(userId);

      return updatedUser;
    } catch (error: any) {
      logger.error("Error updating user profile:", error);
      throw new Error("Failed to update user profile");
    }
  }
}
