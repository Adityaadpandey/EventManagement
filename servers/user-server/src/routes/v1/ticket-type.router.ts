import { Router } from "express";
import { TicketTypeController } from "../../controllers/ticket-type.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();

const ticketTypeController = new TicketTypeController();
// to create a new ticket type in a event
router.post(
  "/:eventId",
  authMiddleware,
  requireRole(["ADMIN", "LISTER"]),
  ticketTypeController.Create.bind(ticketTypeController),
);

// to update a ticket type in a event
router.patch(
  "/:eventId/:ticketTypeId",
  authMiddleware,
  requireRole(["ADMIN", "LISTER"]),
  ticketTypeController.Update.bind(ticketTypeController),
);

// to delete a ticket type in a event
router.delete(
  "/:eventId/:ticketTypeId",
  authMiddleware,
  requireRole(["ADMIN", "LISTER"]),
  ticketTypeController.Delete.bind(ticketTypeController),
);

export { router as TicketTypeRouter };
