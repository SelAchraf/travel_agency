import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { listDestinations, getDestinationBySlug } from "../../services/destination.service.js";
import { listOffers, getOfferBySlug } from "../../services/offer.service.js";
import { submitPublicEnquiry } from "../../services/enquiry.service.js";
import { publicEnquirySchema } from "@travel-agency/shared";
import { enquiryRateLimiter } from "../../middleware/rateLimiter.js";

const router: Router = Router();

/**
 * GET /api/v1/public/destinations
 * List published destinations for public catalogue.
 */
router.get("/destinations", async (req: Request, res: Response, next) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const featuredOnly = req.query.featured === "true";

    const data = await listDestinations({
      category,
      isPublished: true,
      search,
      featuredOnly,
    });

    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/destinations/:slug
 * Retrieve destination details.
 */
router.get("/destinations/:slug", async (req: Request, res: Response, next) => {
  try {
    const destination = await getDestinationBySlug(req.params.slug!);
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json({ success: true, data: destination });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/offers
 * Searchable public travel offer catalogue with ETag caching.
 */
router.get("/offers", async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;
    const destinationId = typeof req.query.destinationId === "string" ? req.query.destinationId : undefined;
    const tripType = typeof req.query.tripType === "string" ? req.query.tripType : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;

    const result = await listOffers({
      page,
      limit,
      destinationId,
      tripType,
      isPublished: true,
      isArchived: false,
      search,
      minPrice,
      maxPrice,
    });

    // Generate ETag from payload for efficient caching
    const payloadString = JSON.stringify(result);
    const etag = `"${crypto.createHash("md5").update(payloadString).digest("hex")}"`;

    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/offers/:slug
 * Full offer itinerary, inclusions, and departure schedule.
 */
router.get("/offers/:slug", async (req: Request, res: Response, next) => {
  try {
    const offer = await getOfferBySlug(req.params.slug!, true);

    const payloadString = JSON.stringify(offer);
    const etag = `"${crypto.createHash("md5").update(payloadString).digest("hex")}"`;

    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/public/enquiries
 * Inbound travel lead capture with rate limiting, honeypot, and idempotency key.
 */
router.post("/enquiries", enquiryRateLimiter, async (req: Request, res: Response, next) => {
  try {
    // Check Idempotency-Key header or body field
    const idempotencyHeader = req.headers["idempotency-key"] as string | undefined;
    const bodyWithHeaderKey = {
      ...req.body,
      idempotencyKey: req.body.idempotencyKey || idempotencyHeader || undefined,
    };

    const validated = publicEnquirySchema.parse(bodyWithHeaderKey);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const result = await submitPublicEnquiry(validated, ipAddress, userAgent);

    res.status(result.idempotentReplay ? 200 : 201).json({
      success: true,
      ...result,
      data: { id: result.id, enquiryNumber: result.enquiryNumber, status: result.status },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
