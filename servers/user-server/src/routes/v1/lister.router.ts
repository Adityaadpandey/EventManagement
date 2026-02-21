import { Router } from "express";
import { AccountController } from "../../controllers/account.controller";
import { BankDetailsController } from "../../controllers/bankDetails.controller";
import { ListerController } from "../../controllers/lister.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";

const router = Router();
const listerController = new ListerController();
const bankDetailsController = new BankDetailsController();
const accountController = new AccountController();

// POST /api/v1/lister/apply — Authenticated USER can apply
router.post(
  "/apply",
  authMiddleware,
  requireRole(["USER"]),
  listerController.applyForLister.bind(listerController),
);

// GET /api/v1/lister/me — LISTER can fetch their own info
router.get(
  "/me",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.meLister.bind(listerController),
);

// PATCH /api/v1/lister/me — LISTER updates their own profile
router.patch(
  "/me",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.updateLister.bind(listerController),
);

// GET /api/v1/lister/public/:listerId — Public route to get lister/org profile
router.get(
  "/public/:listerId",
  listerController.getLister.bind(listerController),
);

// GET /api/v1/listers/analytics — LISTER dashboard analytics
router.get(
  "/analytics/me",
  authMiddleware,
  requireRole(["LISTER"]),
  listerController.getListerAnalytics.bind(listerController),
);

router.get(
  "/ticket-attendes/:eventId",
  authMiddleware,
  requireRole(["LISTER", "ADMIN"]),
  listerController.getTicketAttendes.bind(listerController),
);

router.get(
  "/bank/details",
  authMiddleware,
  requireRole(["LISTER"]),
  bankDetailsController.getBankDetails.bind(bankDetailsController),
);

router.post(
  "/bank/details",
  authMiddleware,
  requireRole(["LISTER"]),
  bankDetailsController.addOrUpdateBankDetails.bind(bankDetailsController),
);

router.put(
  "/bank/details",
  authMiddleware,
  requireRole(["LISTER"]),
  bankDetailsController.addOrUpdateBankDetails.bind(bankDetailsController),
);

router.get(
  "/account",
  authMiddleware,
  requireRole(["LISTER"]),
  accountController.getAccountDetails.bind(accountController),
);

export { router as listerRouter };
