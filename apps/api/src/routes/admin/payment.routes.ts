import { Router, type Request, type Response } from "express";
import {
  listPayments,
  getPaymentById,
  reversePayment,
} from "../../services/payment.service.js";
import { reversePaymentSchema } from "@travel-agency/shared";
import { authenticate, requirePermission } from "../../middleware/auth.js";

const router: Router = Router();

router.use(authenticate);

/**
 * GET /api/v1/admin/payments
 */
router.get("/", requirePermission("payments:read"), async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const method = typeof req.query.method === "string" ? req.query.method : undefined;
    const reservationId = typeof req.query.reservationId === "string" ? req.query.reservationId : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

    const result = await listPayments({
      page,
      limit,
      method,
      reservationId,
      startDate,
      endDate,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/payments/:id
 */
router.get("/:id", requirePermission("payments:read"), async (req: Request, res: Response, next) => {
  try {
    const payment = await getPaymentById(req.params.id!);
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/payments/:id/reverse
 */
router.patch("/:id/reverse", requirePermission("payments:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = reversePaymentSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const reversed = await reversePayment(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: reversed });
  } catch (err) {
    next(err);
  }
});

export default router;

