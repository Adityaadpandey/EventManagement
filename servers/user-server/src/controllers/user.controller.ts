import { Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest } from "../types/auth";
import { sendError, sendSuccess } from "../utils/responseMsg";

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
      return sendError(
        res,
        error.message || "Failed to retrieve user profile",
        500,
      );
    }
  }

  async updateUserProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "User ID is required", 400);
    }

    const { name, email, avatar } = req.body;

    if (!name && !email && !avatar) {
      return sendError(
        res,
        "At least one field (name, email, avatar) is required to update",
        400,
      );
    }

    try {
      const updatedUser = await this.userService.updateUserProfile(userId, {
        name,
        email,
        avatar,
      });
      return sendSuccess(res, "User profile updated successfully", updatedUser);
    } catch (error: any) {
      return sendError(
        res,
        error.message || "Failed to update user profile",
        500,
      );
    }
  }
}
