import { Router } from "express";
import { DiscountController } from "../../controllers/discount.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const discountController = new DiscountController();

router.post(
  "/create/:eventId",
  authMiddleware,
  requireRole(["ADMIN", "LISTER"]),
  discountController.createDiscountCode.bind(discountController),
);

router.get(
  "/event/:eventId",
  authMiddleware,
  requireRole(["ADMIN", "LISTER"]),
  discountController.getDiscountCodesByEvent.bind(discountController),
);

router.get(
  "/:code",
  authMiddleware,
  discountController.getCodeInfoById.bind(discountController),
);

export { router as discountRouter };
