import { Router } from "express";
import { ListerController } from "../../controllers/lister.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const listerController = new ListerController();

// POST /api/v1/lister/apply — Authenticated USER can apply
router.post(
  "/apply",
  authMiddleware,
  requireRole(["USER"]),
  listerController.applyForLister.bind(listerController),
);

// GET /api/v1/lister/me — LISTER can fetch their own info
router.get(
  "/me",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.meLister.bind(listerController),
);

// PATCH /api/v1/lister/me — LISTER updates their own profile
router.patch(
  "/me",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.updateLister.bind(listerController),
);

// GET /api/v1/lister/:listerId — Public route to get lister/org profile
router.get("/:listerId", listerController.getLister.bind(listerController));

// GET /api/v1/listers/analytics — LISTER dashboard analytics
router.get(
  "/analytics/me",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.getListerAnalytics.bind(listerController),
);

router.get(
  "/ticket-attendes/:eventId",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.getTicketAttendes.bind(listerController),
);

export { router as listerRouter };
