import { Router } from "express";
import { EventController } from "../../controllers/event.controller";
import { trackEventView } from "../../middlewares/analytics.middleware";
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
router.get(
  "/lister",
  authMiddleware,
  requireRole(["LISTER", "ADMIN"]),
  eventController.getListerEvents.bind(eventController),
);

// GET /api/v1/event/:eventId/public (PUBLIC)
router.get(
  "/:eventId/public",
  trackEventView,
  eventController.getPublicEventDetails.bind(eventController),
);

// GET /api/v1/event/:eventId/lister
router.get(
  "/:eventId/lister",
  authMiddleware,
  requireRole(["LISTER", "ADMIN"]),
  eventController.getEventDetails.bind(eventController),
);

// PATCH /api/v1/event/:eventId
router.patch(
  "/:eventId",
  authMiddleware,
  requireRole(["LISTER", "ADMIN"]),
  eventController.patchEvent.bind(eventController),
);

router.post(
  "/info-update/:eventId",
  authMiddleware,
  requireRole(["LISTER", "ADMIN"]),
  eventController.updateInfo.bind(eventController),
);

router.get(
  "/:eventId/analytics",
  authMiddleware,
  requireRole(["LISTER", "ADMIN"]),
  eventController.getAnalytics.bind(eventController),
);
// DELETE /api/v1/event/:eventId

// GET /api/v1/event/:eventId/attendees

export { router as eventsRouter };
