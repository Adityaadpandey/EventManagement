import { Router } from "express";
import { CheckerController } from "../../controllers/checker.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const checkerController = new CheckerController();

// POST /checker/create/:eventId for creating a checker for an event
router.post(
	"/create/:eventId",
	authMiddleware,
	requireRole(["LISTER"]),
	checkerController.createChecker.bind(checkerController),
);

// GET /checker/:eventId for getting all checkers for an event
router.get(
	"/:eventId",
	authMiddleware,
	requireRole(["LISTER"]),
	checkerController.getCheckersByEvent.bind(checkerController),
);

// GET /checker/details/:checkerId for getting a checker by its ID
router.get(
	"/details/:checkerId",
	authMiddleware,
	checkerController.getCheckerById.bind(checkerController),
);

// DELETE /checker/:checkerId for deleting a checker by its ID
router.delete(
	"/:checkerId",
	authMiddleware,
	requireRole(["LISTER"]),
	checkerController.deleteChecker.bind(checkerController),
);

export { router as checkerRouter };
