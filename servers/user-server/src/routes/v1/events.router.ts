import { Router } from "express";
import { EventController } from "../../controllers/event.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const eventController = new EventController();

// POST /api/v1/event
router.post(
	"/",
	authMiddleware,
	requireRole(["LISTER"]),
	eventController.createEvent.bind(eventController),
);

// GET /api/v1/event/public (PUBLIC)
router.get("/public", eventController.getPublicEvents.bind(eventController));

// GET /api/v1/event (LISTER)

// GET /api/v1/event/:eventId

// PATCH /api/v1/event/:eventId

// DELETE /api/v1/event/:eventId

// POST /api/v1/event/:eventId/submit-for-approval

// GET /api/v1/event/:eventId/attendees

export { router as eventsRouter };
