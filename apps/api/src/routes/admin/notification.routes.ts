import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  listStaffNotifications,
  markNotificationRead,
  generateSystemAlerts,
} from "../../services/notification.service.js";

const router: Router = Router();

router.use(authenticate);

// GET /api/v1/admin/notifications
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const result = await listStaffNotifications(status, page, limit);
    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/notifications/:id/read
router.patch("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await markNotificationRead(req.params.id as string);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/notifications/scan
router.post("/scan", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await generateSystemAlerts();
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

