import { Router } from "express";
import { NotificationController } from "../../controllers/notification.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const notificationController = new NotificationController();

// Public route - Get VAPID public key
router.get(
  "/vapid-public-key",
  notificationController.getVapidPublicKey.bind(notificationController),
);

// Protected routes - Require authentication
router.post(
  "/subscribe",
  authMiddleware,
  notificationController.subscribe.bind(notificationController),
);

router.post(
  "/unsubscribe",
  authMiddleware,
  notificationController.unsubscribe.bind(notificationController),
);

router.post(
  "/test",
  authMiddleware,
  notificationController.sendTestNotification.bind(notificationController),
);

// Admin only routes
router.post(
  "/send",
  authMiddleware,
  requireRole(["ADMIN"]),
  notificationController.sendCustomNotification.bind(notificationController),
);

export { router as notificationRouter };
