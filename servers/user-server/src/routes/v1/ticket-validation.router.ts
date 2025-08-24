import { Router } from "express";
import { TicketValidationController } from "../../controllers/ticket-validation.controller";
import { checkerAuthMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const ticketValidationController = new TicketValidationController();

// POST /ticket-validation/checker/login
router.post(
  "/checker/login",
  ticketValidationController.checkerLogin.bind(ticketValidationController),
);

// POST /ticket-validation/scan
router.post(
  "/scan",
  checkerAuthMiddleware,
  ticketValidationController.scanTicket.bind(ticketValidationController),
);

// POST /ticket-validation/reset/:ticketId
router.post(
  "/reset/:ticketId",
  checkerAuthMiddleware,
  ticketValidationController.resetTicketScan.bind(ticketValidationController),
);

// GET /ticket-validation/history
router.get(
  "/history",
  checkerAuthMiddleware,
  ticketValidationController.getScanHistory.bind(ticketValidationController),
);

// GET /ticket-validation/profile
router.get(
  "/profile",
  checkerAuthMiddleware,
  ticketValidationController.getCheckerProfile.bind(ticketValidationController),
);

export { router as ticketValidationRouter };
