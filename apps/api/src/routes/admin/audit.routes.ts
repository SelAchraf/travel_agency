import { Router, type Request, type Response } from "express";
import { getAuditLogs } from "../../services/audit.service.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";

const router: Router = Router();

// Protect audit log querying with authentication and audit:read permission
router.use(authenticate, requirePermission("audit:read"));

/**
 * GET /api/v1/admin/audit-logs
 * Query append-only audit trail with filtering and pagination.
 */
router.get("/", async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;

    const result = await getAuditLogs({
      page,
      limit,
      userId,
      action,
      entityType,
      startDate,
      endDate,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
