import { Router } from "express";
import { PayoutController } from "../../controllers/payout.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const payoutController = new PayoutController();

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

export { router as payoutRouter };
