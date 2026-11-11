import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import {
  listDepartures,
  getDepartureManifest,
  updateDepartureStatus,
} from "../../services/departure.service.js";
import { overrideDepartureCapacity } from "../../services/offer.service.js";
import {
  departureStatusSchema,
  overrideDepartureCapacitySchema,
} from "@travel-agency/shared";

const router: Router = Router();

router.use(authenticate);

// GET /api/v1/admin/departures
router.get("/", requirePermission("offers:read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offerId = typeof req.query.offerId === "string" ? req.query.offerId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

    const result = await listDepartures({
      page,
      limit,
      offerId,
      status,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result.departures,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/departures/:id/manifest
router.get("/:id/manifest", requirePermission("offers:read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const manifest = await getDepartureManifest(req.params.id as string);
    res.json({
      success: true,
      data: manifest,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/departures/:id/status
router.patch("/:id/status", requirePermission("offers:write"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = departureStatusSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "backoffice";

    const updated = await updateDepartureStatus(
      req.params.id as string,
      status,
      req.user!,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/departures/:id/override
router.patch(
  "/:id/override",
  requirePermission("departures:capacity_override"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = overrideDepartureCapacitySchema.parse(req.body);
      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "backoffice";

      const updated = await overrideDepartureCapacity(
        req.params.id as string,
        validated,
        req.user!,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

