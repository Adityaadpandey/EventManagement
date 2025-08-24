import { Router } from "express";
import { AdminController } from "../../controllers/admin.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const adminController = new AdminController();

// for the approval or rejection of user -> lister
router.post(
	"/change-user-to-lister-status",
	authMiddleware,
	requireRole(["ADMIN"]),
	adminController.changeUserToListerStatus.bind(adminController),
);

// for getting all the users who have applied for lister role
router.get(
	"/get-all-lister-requests",
	authMiddleware,
	requireRole(["ADMIN"]),
	adminController.getAllListerRequests.bind(adminController),
);

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

export { router as adminRouter };
