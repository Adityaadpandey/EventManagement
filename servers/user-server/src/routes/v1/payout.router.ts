import { Router } from "express";
import { PayoutController } from "../../controllers/payout.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const payoutController = new PayoutController();

// Lister routes
router.post(
  "/request",
  authMiddleware,
  requireRole(["LISTER"]),
  payoutController.requestPayout.bind(payoutController),
);

router.get(
  "/",
  authMiddleware,
  requireRole(["LISTER"]),
  payoutController.getPayouts.bind(payoutController),
);

router.post(
  "/reconcile",
  authMiddleware,
  requireRole(["LISTER"]),
  payoutController.reconcileBalance.bind(payoutController),
);

router.get(
  "/ledger",
  authMiddleware,
  requireRole(["LISTER"]),
  payoutController.getLedger.bind(payoutController),
);

router.get(
  "/:payoutId",
  authMiddleware,
  requireRole(["LISTER"]),
  payoutController.getPayoutById.bind(payoutController),
);

router.patch(
  "/:payoutId/cancel",
  authMiddleware,
  requireRole(["LISTER"]),
  payoutController.cancelPayout.bind(payoutController),
);

// Admin routes
router.get(
  "/admin/all",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.getAllPayouts.bind(payoutController),
);

router.patch(
  "/admin/:payoutId/approve",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.approvePayout.bind(payoutController),
);

router.patch(
  "/admin/:payoutId/complete",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.completePayout.bind(payoutController),
);

router.patch(
  "/admin/:payoutId/reject",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.rejectPayout.bind(payoutController),
);

router.patch(
  "/admin/:payoutId/reverse",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.reversePayout.bind(payoutController),
);

export { router as payoutRouter };
