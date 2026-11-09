import { Router, type Request, type Response } from "express";
import {
  listEnquiries,
  getEnquiryById,
  createAdminEnquiry,
  updateEnquiryStatus,
  assignEnquiry,
  addEnquiryNote,
} from "../../services/enquiry.service.js";
import { adminEnquirySchema, ENQUIRY_STATUSES } from "@travel-agency/shared";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { z } from "zod";

const router: Router = Router();

router.use(authenticate);

/**
 * GET /api/v1/admin/enquiries
 */
router.get("/", requirePermission("enquiries:read"), async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const assignedToUserId = typeof req.query.assignedToUserId === "string" ? req.query.assignedToUserId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = await listEnquiries({
      page,
      limit,
      status,
      assignedToUserId,
      search,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/enquiries
 * Manual phone/walk-in enquiry creation by staff.
 */
router.post("/", requirePermission("enquiries:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = adminEnquirySchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const enquiry = await createAdminEnquiry(validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/enquiries/:id
 */
router.get("/:id", requirePermission("enquiries:read"), async (req: Request, res: Response, next) => {
  try {
    const enquiry = await getEnquiryById(req.params.id!);
    res.json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
});

const updateStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
  notes: z.string().optional(),
});

/**
 * PATCH /api/v1/admin/enquiries/:id/status
 */
router.patch("/:id/status", requirePermission("enquiries:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = updateStatusSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await updateEnquiryStatus(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

const assignSchema = z.object({
  assignedToUserId: z.string().uuid("Invalid user ID"),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * PATCH /api/v1/admin/enquiries/:id/assign
 */
router.patch("/:id/assign", requirePermission("enquiries:assign"), async (req: Request, res: Response, next) => {
  try {
    const validated = assignSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await assignEnquiry(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

const noteSchema = z.object({
  notes: z.string().min(1, "Notes cannot be empty"),
});

/**
 * POST /api/v1/admin/enquiries/:id/notes
 */
router.post("/:id/notes", requirePermission("enquiries:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = noteSchema.parse(req.body);
    const activity = await addEnquiryNote(req.params.id!, validated, req.user!);
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
});

export default router;

