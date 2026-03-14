import { Router } from "express";
import { AuthController } from "../../controllers/auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const authController = new AuthController();

// POST /api/v1/auth/otp/request - handles both phone and email
router.post("/otp/request", authController.requestOtp.bind(authController));

// POST /api/v1/auth/otp/verify - handles both phone and email
router.post("/otp/verify", authController.verifyOtp.bind(authController));

// POST /api/v1/auth/logout - blacklists the token
router.post(
  "/logout",
  authMiddleware,
  authController.logout.bind(authController),
);

export { router as authRouter };
