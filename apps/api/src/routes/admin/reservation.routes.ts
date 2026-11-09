import { Router, type Request, type Response } from "express";
import {
  listReservations,
  getReservationById,
  createReservation,
  updateReservationStatus,
  applyReservationDiscount,
} from "../../services/reservation.service.js";
import {
  recordPayment,
  refundReservation,
} from "../../services/payment.service.js";
import {
  createReservationSchema,
  updateReservationStatusSchema,
  applyDiscountSchema,
  recordPaymentSchema,
  refundPaymentSchema,
} from "@travel-agency/shared";
import { authenticate, requirePermission } from "../../middleware/auth.js";

const router: Router = Router();

router.use(authenticate);

/**
 * GET /api/v1/admin/reservations
 */
router.get("/", requirePermission("reservations:read"), async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const paymentStatus = typeof req.query.paymentStatus === "string" ? (req.query.paymentStatus as any) : undefined;
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;
    const departureId = typeof req.query.departureId === "string" ? req.query.departureId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = await listReservations({
      page,
      limit,
      status,
      paymentStatus,
      customerId,
      departureId,
      search,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/reservations
 */
router.post("/", requirePermission("reservations:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = createReservationSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const reservation = await createReservation(validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/reservations/:id
 */
router.get("/:id", requirePermission("reservations:read"), async (req: Request, res: Response, next) => {
  try {
    const reservation = await getReservationById(req.params.id!);
    res.json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/reservations/:id/status
 */
router.patch("/:id/status", requirePermission("reservations:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = updateReservationStatusSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await updateReservationStatus(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/reservations/:id/discount
 */
router.patch("/:id/discount", requirePermission("reservations:discount"), async (req: Request, res: Response, next) => {
  try {
    const validated = applyDiscountSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await applyReservationDiscount(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/reservations/:id/payments
 */
router.post("/:id/payments", requirePermission("payments:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = recordPaymentSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const payment = await recordPayment(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/reservations/:id/refunds
 */
router.post("/:id/refunds", requirePermission("payments:refund"), async (req: Request, res: Response, next) => {
  try {
    const validated = refundPaymentSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const refund = await refundReservation(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: refund });
  } catch (err) {
    next(err);
  }
});

export default router;

