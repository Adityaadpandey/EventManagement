import { Router } from "express";
import { AdminController } from "../../controllers/admin.controller";
import { PayoutController } from "../../controllers/payout.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const adminController = new AdminController();
const payoutController = new PayoutController();

// Event management routes

// for the approval or rejection of event
router.post(
  "/change-event-status",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.changeEventStatus.bind(adminController),
);

// for getting all the events which are in pending state
router.get(
  "/get-all-pending-events",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.getAllPendingEvents.bind(adminController),
);

router.patch(
  "/event/canBuy/:eventId",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.changeEventBuyStatus.bind(adminController),
);

router.get(
  "/event/all",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.getAllEvents.bind(adminController),
);

router.get(
  "/event/:eventId",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.getEventById.bind(adminController),
);

router.get(
  "/event/analytics/:eventId",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.getEventAnalytics.bind(adminController),
);

router.get(
  "/event/attendee/:eventId",
  authMiddleware,
  requireRole(["ADMIN"]),
  adminController.getEventTicketAttendees.bind(adminController),
);

// Payout management routes

router.get(
  "/payout/all",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.getAllPayouts.bind(payoutController),
);

router.patch(
  "/payout/:payoutId/approve",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.approvePayout.bind(payoutController),
);

router.patch(
  "/payout/:payoutId/complete",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.completePayout.bind(payoutController),
);

router.patch(
  "/payout/:payoutId/reject",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.rejectPayout.bind(payoutController),
);

router.patch(
  "/payout/:payoutId/reverse",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  payoutController.reversePayout.bind(payoutController),
);

export { router as adminRouter };
