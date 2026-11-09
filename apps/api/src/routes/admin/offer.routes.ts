import { Router, type Request, type Response } from "express";
import multer from "multer";
import {
  listOffers,
  getOfferById,
  createOffer,
  updateOffer,
  togglePublishOffer,
  archiveOffer,
  addDeparture,
  overrideDepartureCapacity,
} from "../../services/offer.service.js";
import { travelOfferSchema, departureSchema } from "@travel-agency/shared";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { processPublicImage } from "../../utils/media.js";
import { z } from "zod";

const router: Router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  storage: multer.memoryStorage(),
});

router.use(authenticate);

/**
 * GET /api/v1/admin/offers
 */
router.get("/", requirePermission("offers:read"), async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const destinationId = typeof req.query.destinationId === "string" ? req.query.destinationId : undefined;
    const tripType = typeof req.query.tripType === "string" ? req.query.tripType : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const isPublished = req.query.isPublished !== undefined ? req.query.isPublished === "true" : undefined;
    const isArchived = req.query.isArchived !== undefined ? req.query.isArchived === "true" : undefined;

    const result = await listOffers({
      page,
      limit,
      destinationId,
      tripType,
      isPublished,
      isArchived,
      search,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/offers
 */
router.post("/", requirePermission("offers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = travelOfferSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const offer = await createOffer(validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/offers/upload-photo
 * Upload and process photo through Sharp AVIF/WebP image pipeline.
 */
router.post(
  "/upload-photo",
  requirePermission("offers:write"),
  upload.single("photo"),
  async (req: Request, res: Response, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, error: "Fichier d'image manquant / Missing image file" });
        return;
      }

      const result = await processPublicImage(req.file.buffer, "offers");
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/offers/:id
 */
router.get("/:id", requirePermission("offers:read"), async (req: Request, res: Response, next) => {
  try {
    const offer = await getOfferById(req.params.id!);
    res.json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/offers/:id
 */
router.put("/:id", requirePermission("offers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = travelOfferSchema.partial().parse(req.body);
    if (req.body.isPublished === undefined) delete (validated as any).isPublished;
    if (req.body.pricingBasis === undefined) delete (validated as any).pricingBasis;
    if (req.body.availabilityStatus === undefined) delete (validated as any).availabilityStatus;

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await updateOffer(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/offers/:id/publish
 */
router.patch("/:id/publish", requirePermission("offers:publish"), async (req: Request, res: Response, next) => {
  try {
    const isPublished = req.body.isPublished === true;
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await togglePublishOffer(req.params.id!, isPublished, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/offers/:id/archive
 */
router.patch("/:id/archive", requirePermission("offers:write"), async (req: Request, res: Response, next) => {
  try {
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await archiveOffer(req.params.id!, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/offers/:id/departures
 */
router.post("/:id/departures", requirePermission("offers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = departureSchema.omit({ offerId: true }).parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const departure = await addDeparture(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: departure });
  } catch (err) {
    next(err);
  }
});

const overrideSchema = z.object({
  extraPlaces: z.coerce.number().int().min(1, "Extra places must be positive"),
  reason: z.string().min(3, "Reason for override is required"),
});

/**
 * PATCH /api/v1/admin/offers/departures/:departureId/override
 * Manager approved override to exceed capacity.
 */
router.patch(
  "/departures/:departureId/override",
  requirePermission("departures:capacity_override"),
  async (req: Request, res: Response, next) => {
    try {
      const validated = overrideSchema.parse(req.body);
      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const updated = await overrideDepartureCapacity(
        req.params.departureId!,
        validated,
        req.user!,
        ipAddress,
        userAgent
      );

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

