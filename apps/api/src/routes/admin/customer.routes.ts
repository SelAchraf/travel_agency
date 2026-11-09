import { Router, type Request, type Response } from "express";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  detectDuplicates,
  addTraveller,
} from "../../services/customer.service.js";
import { customerSchema, travellerSchema } from "@travel-agency/shared";
import { authenticate, requirePermission } from "../../middleware/auth.js";

const router: Router = Router();

router.use(authenticate);

/**
 * GET /api/v1/admin/customers/duplicates
 * Check for matching customers by phone or email.
 */
router.get("/duplicates", requirePermission("customers:read"), async (req: Request, res: Response, next) => {
  try {
    const phone = typeof req.query.phone === "string" ? req.query.phone : undefined;
    const email = typeof req.query.email === "string" ? req.query.email : undefined;

    const matches = await detectDuplicates({ phone, email });
    res.json({
      success: true,
      duplicateFound: matches.length > 0,
      duplicates: matches,
      matches,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/customers
 */
router.get("/", requirePermission("customers:read"), async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const wilayaCode = req.query.wilayaCode ? parseInt(req.query.wilayaCode as string, 10) : undefined;
    const isArchived = req.query.isArchived !== undefined ? req.query.isArchived === "true" : undefined;

    const result = await listCustomers({
      page,
      limit,
      search,
      wilayaCode,
      isArchived,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/customers
 */
router.post("/", requirePermission("customers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = customerSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const customer = await createCustomer(validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/customers/:id
 */
router.get("/:id", requirePermission("customers:read"), async (req: Request, res: Response, next) => {
  try {
    const customer = await getCustomerById(req.params.id!);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/customers/:id
 */
router.put("/:id", requirePermission("customers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = customerSchema.partial().parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await updateCustomer(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/customers/:id/travellers
 */
router.post("/:id/travellers", requirePermission("customers:write"), async (req: Request, res: Response, next) => {
  try {
    const validated = travellerSchema.omit({ customerId: true }).parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const traveller = await addTraveller(req.params.id!, validated, req.user!, ipAddress, userAgent);
    res.status(201).json({ success: true, data: traveller });
  } catch (err) {
    next(err);
  }
});

export default router;
