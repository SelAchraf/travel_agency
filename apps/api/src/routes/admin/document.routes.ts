import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import {
  uploadDocument,
  listDocuments,
  getDocumentForDownload,
  deleteDocument,
} from "../../services/document.service.js";
import {
  uploadDocumentMetadataSchema,
  documentFilterSchema,
} from "@travel-agency/shared";
import { AppError } from "../../middleware/errorHandler.js";

const router: Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.use(authenticate);

// POST /api/v1/admin/documents/upload
router.post(
  "/upload",
  requirePermission("documents:write"),
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, "Aucun fichier transmis / No file uploaded");
      }

      const metadata = uploadDocumentMetadataSchema.parse(req.body);
      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "backoffice";

      const doc = await uploadDocument(
        req.file.buffer,
        req.file.originalname,
        metadata,
        req.user!,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/admin/documents
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = documentFilterSchema.parse(req.query);
      const result = await listDocuments(filters);

      res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/admin/documents/:id/download
router.get(
  "/:id/download",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "backoffice";

      const { document: doc, filePath } = await getDocumentForDownload(
        req.params.id as string,
        req.user!,
        ipAddress,
        userAgent
      );

      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(doc.originalFilename)}"`
      );
      res.setHeader("Content-Length", doc.fileSizeBytes);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/admin/documents/:id
router.delete(
  "/:id",
  requirePermission("documents:delete"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "backoffice";

      const result = await deleteDocument(
        req.params.id as string,
        req.user!,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
