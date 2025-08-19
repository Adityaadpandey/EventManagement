import { Router } from "express";
import { AuthController } from "../../controllers/auth.controller";

const router = Router();
const authController = new AuthController();

// POST /api/v1/auth/otp/request
router.post("/otp/request", authController.requestOtp.bind(authController));

// POST /api/v1/auth/otp/verify
router.post("/otp/verify", authController.verifyOtp.bind(authController));

export { router as authRouter };
