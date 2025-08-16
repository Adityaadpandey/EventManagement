import { Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest } from "../types/auth";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUserProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const userProfile = await this.userService.getUserProfile(userId);
      res.status(200).json({ data: userProfile });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateUserProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { name, email, avatar } = req.body;

    if (!name && !email && !avatar) {
      return res
        .status(400)
        .json({
          error:
            "At least one field (name, email, avatar) is required to update",
        });
    }

    try {
      const updatedUser = await this.userService.updateUserProfile(userId, {
        name,
        email,
        avatar,
      });
      res.status(200).json({ data: updatedUser });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
