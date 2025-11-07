import type { Response } from "express";
import { UserService } from "../services/user.service";
import type { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";
import { updateUserProfileSchema } from "../validators/user.validator";
import { logError, logInfo } from "../utils/logger-context";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUserProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "User ID is required", 400);
    }

    try {
      const userProfile = await this.userService.getUserProfile(userId);
      return sendSuccess(
        res,
        "User profile retrieved successfully",
        userProfile,
      );
    } catch (error: any) {
      logError(req, "Failed to retrieve user profile", error, { userId });
      return sendError(res, "Failed to retrieve user profile", 500);
    }
  }

  async updateUserProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "User ID is required", 400);
    }

    const updateData = updateUserProfileSchema.parse(req.body);

    try {
      logInfo(req, "Updating user profile", { userId });
      const updatedUser = await this.userService.updateUserProfile(
        userId,
        updateData,
      );
      return sendSuccess(res, "User profile updated successfully", updatedUser);
    } catch (error: any) {
      logError(req, "Failed to update user profile", error, { userId });
      return sendError(res, "Failed to update user profile", 500);
    }
  }
}
