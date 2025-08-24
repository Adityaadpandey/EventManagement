import { prisma } from "../config/db";
import logger from "../config/logger";

export class UserService {
  async getUserProfile(userId: string) {
    try {
      const userProfile = await prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          phoneVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!userProfile) {
        throw new Error("User not found");
      }
      return userProfile;
    } catch (error: any) {
      logger.error("Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile");
    }
  }

  async updateUserProfile(
    userId: string,
    updates: { name?: string; email?: string; avatar?: string },
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
        throw new Error("User not found or update failed");
      }

      return updatedUser;
    } catch (error: any) {
      logger("Error updating user profile:", error);
      throw new Error("Failed to update user profile");
    }
  }
}
