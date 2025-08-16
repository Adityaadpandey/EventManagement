import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const userController = new UserController();

// GET /user/profile/
router.get(
  "/profile",
  authMiddleware,
  userController.getUserProfile.bind(userController),
);

// PATCH /user/profile/
router.patch(
  "/profile",
  authMiddleware,
  userController.updateUserProfile.bind(userController),
);

export { router as userRouter };
