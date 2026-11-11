import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { portalAuthenticate } from "../../middleware/portalAuth.js";
import {
  verifyPortalToken,
  getCustomerReservations,
  getCustomerReservationDetail,
  uploadPortalDocument,
  downloadPortalDocument,
  createPortalMessage,
  getPortalMessages,
} from "../../services/portal.service.js";
import {
  verifyPortalLinkSchema,
  portalMessageSchema,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@travel-agency/shared";
import { generatePortalAccessToken } from "../../utils/tokens.js";
import { AppError } from "../../middleware/errorHandler.js";

const router: Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/v1/portal/auth/verify-link
router.post("/auth/verify-link", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = verifyPortalLinkSchema.parse(req.body);
    const customer = await verifyPortalToken(token);

    const portalToken = generatePortalAccessToken({
      sub: customer.id,
      type: "portal",
      fullName: customer.fullName,
    });

    res.cookie("portalToken", portalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        customer,
        token: portalToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Protected Portal Routes (Guarded by portalAuthenticate with strict Anti-IDOR)
router.use(portalAuthenticate);

// GET /api/v1/portal/me
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservations = await getCustomerReservations(req.portalCustomer!.id);
    res.json({
      success: true,
      data: {
        customer: req.portalCustomer,
        reservations,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/portal/reservations/:id
router.get("/reservations/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await getCustomerReservationDetail(
      req.portalCustomer!.id,
      req.params.id as string
    );
    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/portal/reservations/:id/documents/upload
router.post(
  "/reservations/:id/documents/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, "Veuillez fournir un document / File missing");
      }

      const documentType = req.body.documentType as DocumentType;
      if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
        throw new AppError(400, "Type de document invalide / Invalid document type");
      }

      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "customer-portal";

      const doc = await uploadPortalDocument(
        req.portalCustomer!.id,
        req.params.id as string,
        req.file.buffer,
        req.file.originalname,
        documentType,
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

// GET /api/v1/portal/documents/:id/download
router.get("/documents/:id/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "customer-portal";

    const { document: doc, filePath } = await downloadPortalDocument(
      req.portalCustomer!.id,
      req.params.id as string,
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
});

// GET /api/v1/portal/reservations/:id/messages
router.get("/reservations/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await getPortalMessages(
      req.portalCustomer!.id,
      req.params.id as string
    );
    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/portal/reservations/:id/messages
router.post("/reservations/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = portalMessageSchema.parse(req.body);
    const msg = await createPortalMessage(
      req.portalCustomer!.id,
      req.params.id as string,
      validated
    );
    res.status(201).json({
      success: true,
      data: msg,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

