import { Router } from "express";
import { TicketController } from "../../controllers/ticket.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const ticketController = new TicketController();

// Buy ticket (creates ticket with PENDING status)
router.post(
  "/buy",
  authMiddleware,
  ticketController.buyTicket.bind(ticketController),
);

// Get user's tickets
router.get(
  "/my-tickets",
  authMiddleware,
  ticketController.getUserTickets.bind(ticketController),
);

// Get ticket details by ID
router.get(
  "/:ticketId",
  authMiddleware,
  ticketController.getTicketDetails.bind(ticketController),
);

// Get ticket buyers for a specific event (for listers and admins)
router.get(
  "/event/:eventId/buyers",
  authMiddleware,
  ticketController.getTicketBuyersForEvent.bind(ticketController),
);

// Get all ticket buyers (admin only)
router.get(
  "/admin/all-buyers",
  authMiddleware,
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  ticketController.getAllTicketBuyers.bind(ticketController),
);

export { router as ticketRouter };
