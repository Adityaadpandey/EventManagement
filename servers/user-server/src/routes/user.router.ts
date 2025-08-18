import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const userController = new UserController();

// GET /api/v1/user/profile/
router.get(
	"/profile",
	authMiddleware,
	userController.getUserProfile.bind(userController),
);

// PATCH /api/v1/user/profile/
router.patch(
	"/profile",
	authMiddleware,
	userController.updateUserProfile.bind(userController),
);

export { router as userRouter };
