import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { getDashboardSummary } from "../../services/dashboard.service.js";

const router: Router = Router();

router.use(authenticate);

// GET /api/v1/admin/dashboard/summary
// Requires reports:operational (accessible by owner, manager, reservation_agent)
router.get(
  "/summary",
  requirePermission("reports:operational"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await getDashboardSummary();
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
