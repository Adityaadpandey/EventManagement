import { Router } from "express";
import { PaymentController } from "../../controllers/payment.controller";
import { TicketController } from "../../controllers/ticket.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const ticketController = new TicketController();
const paymentController = new PaymentController();

// Verify payment and update ticket status
router.post(
	"/verify",
	authMiddleware,
	ticketController.verifyPayment.bind(ticketController),
);

// Handle payment failure
router.post(
	"/failure",
	authMiddleware,
	ticketController.handlePaymentFailure.bind(ticketController),
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
	"/refunds",
	authMiddleware,
	paymentController.getRefunds.bind(paymentController),
);

export { router as paymentRouter };
