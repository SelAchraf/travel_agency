import { Router, type Request, type Response } from "express";
import {
  listDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
} from "../../services/destination.service.js";
import { destinationSchema } from "@travel-agency/shared";
import { authenticate, requirePermission } from "../../middleware/auth.js";

const router: Router = Router();

router.use(authenticate);

/**
 * GET /api/v1/admin/destinations
 */
router.get("/", requirePermission("offers:read"), async (req: Request, res: Response, next) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const data = await listDestinations({ category, search });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/destinations
 */
router.post("/", requirePermission("offers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = destinationSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const destination = await createDestination(validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: destination });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/destinations/:id
 */
router.get("/:id", requirePermission("offers:read"), async (req: Request, res: Response, next) => {
  try {
    const destination = await getDestinationById(req.params.id!);
    res.json({ success: true, data: destination });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/destinations/:id
 */
router.put("/:id", requirePermission("offers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = destinationSchema.partial().parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await updateDestination(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

