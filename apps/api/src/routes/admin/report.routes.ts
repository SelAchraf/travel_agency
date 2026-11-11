import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import {
  getFinancialReport,
  getOperationalReport,
  generateCsvExport,
} from "../../services/report.service.js";
import {
  financialReportFilterSchema,
  operationalReportFilterSchema,
  exportCsvFilterSchema,
  hasPermission,
} from "@travel-agency/shared";
import { AppError } from "../../middleware/errorHandler.js";

const router: Router = Router();

router.use(authenticate);

// GET /api/v1/admin/reports/financial
router.get(
  "/financial",
  requirePermission("reports:financial"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = financialReportFilterSchema.parse(req.query);
      const report = await getFinancialReport(filters);

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/admin/reports/operational
router.get(
  "/operational",
  requirePermission("reports:operational"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = operationalReportFilterSchema.parse(req.query);
      const report = await getOperationalReport(filters);

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/admin/reports/export-csv
router.get(
  "/export-csv",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = exportCsvFilterSchema.parse(req.query);

      // Check RBAC based on export type
      if (filters.type === "payments") {
        if (!hasPermission(req.user!.role, "reports:financial")) {
          throw new AppError(
            403,
            "Accès refusé : permission reports:financial requise pour exporter les paiements"
          );
        }
      } else {
        if (!hasPermission(req.user!.role, "reports:operational")) {
          throw new AppError(
            403,
            "Accès refusé : permission reports:operational requise pour exporter ces données"
          );
        }
      }

      const csvContent = await generateCsvExport(filters);
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `export_${filters.type}_${dateStr}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
