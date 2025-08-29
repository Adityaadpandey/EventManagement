import { Router } from "express";
import { PaymentController } from "../../controllers/payment.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const paymentController = new PaymentController();

// Verify payment and update ticket status
router.post(
  "/verify",
  authMiddleware,
  paymentController.verifyPayment.bind(paymentController),
);

// Handle payment failure
router.post(
  "/failure",
  authMiddleware,
  paymentController.handlePaymentFailure.bind(paymentController),
);

// ============ REFUND ROUTES ============

// Request refund (user)
router.post(
  "/refund/request",
  authMiddleware,
  paymentController.requestRefund.bind(paymentController),
);

// Process refund (admin - approve/reject)
router.post(
  "/refund/process",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN", "LISTER"]),
  paymentController.processRefund.bind(paymentController),
);

// Get refunds
router.get(
  "/refunds/:eventId",
  authMiddleware,
  paymentController.getRefunds.bind(paymentController),
);

export { router as paymentRouter };
