import express, { type Express, type Request, type Response } from "express";
import path from "node:path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { pool, db } from "./database/connection.js";
import { agency } from "./database/schema.js";
import { globalRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, AppError } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.routes.js";
import adminUserRouter from "./routes/admin/user.routes.js";
import adminAuditRouter from "./routes/admin/audit.routes.js";
import publicCatalogueRouter from "./routes/public/catalogue.routes.js";
import adminDestinationRouter from "./routes/admin/destination.routes.js";
import adminOfferRouter from "./routes/admin/offer.routes.js";
import adminCustomerRouter from "./routes/admin/customer.routes.js";
import adminEnquiryRouter from "./routes/admin/enquiry.routes.js";
import adminReservationRouter from "./routes/admin/reservation.routes.js";
import adminPaymentRouter from "./routes/admin/payment.routes.js";

export function createApp(): Express {
  const app = express();

  // 1. Edge Security: Helmet with Strict CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'", ...env.CORS_ORIGIN.split(",")],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Strict CORS
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o: string) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Idempotency-Key"],
    }),
  );

  // 3. Structured Request Logging (pino-http)
  if (env.NODE_ENV !== "test") {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req: Request) => req.url === "/health",
        },
      }),
    );
  }

  // 4. Input Parsing & Request Size Limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // 5. Parameter Pollution Defense
  app.use(hpp());

  // 6. Global Rate Limiter
  app.use(globalRateLimiter);

  // 6b. Static Public Images (Optimized WebP/AVIF with long cache header)
  app.use(
    "/public/images",
    express.static(path.resolve(process.cwd(), "storage/public/images"), {
      maxAge: "30d",
      etag: true,
    })
  );

  // 7. Health & Readiness Endpoint
  app.get("/health", async (_req: Request, res: Response) => {
    let isDbHealthy = false;
    let pgVersion = "";

    try {
      const dbRes = await pool.query("SELECT version();");
      isDbHealthy = true;
      pgVersion = dbRes.rows[0]?.version || "";
    } catch {
      isDbHealthy = false;
    }

    const healthy = isDbHealthy;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      stack: "PERN (PostgreSQL + Express + React + Node.js)",
      services: {
        database: {
          type: "PostgreSQL",
          status: isDbHealthy ? "connected" : "disconnected",
          version: pgVersion,
        },
      },
    });
  });

  // 8. Public Agency Baseline Endpoint
  app.get("/api/v1/public/agency", async (_req: Request, res: Response) => {
    try {
      const agencies = await db.select().from(agency).limit(1);
      const data = agencies[0];

      if (data) {
        res.json({
          success: true,
          data: {
            name: data.name,
            licenceNumber: data.licenceNumber,
            email: data.email,
            phoneNumbers: data.phoneNumbers,
            whatsappNumber: data.whatsappNumber,
            socialLinks: data.socialLinks,
            branding: data.branding,
            settings: data.settings,
          },
        });
        return;
      }
    } catch {
      // Fallback if DB not seeded yet
    }

    res.json({
      success: true,
      data: {
        name: {
          ar: "وكالة نوميديا للأسفار والسياحة",
          fr: "Numidia Voyages & Tourisme",
        },
        licenceNumber: "AGV-2024-16-042",
        email: "contact@numidiavoyages.dz",
        phoneNumbers: ["+21321458920", "+213550123456"],
        whatsappNumber: "+213550123456",
        branding: {
          primaryColor: "#0D233A", // Mediterranean Night Indigo
          accentColor: "#C85A32",  // Saharan Terracotta
          saffronColor: "#E09F3E", // Desert Saffron
        },
        settings: {
          currency: "DZD",
          defaultLanguage: "ar",
          supportedLanguages: ["ar", "fr"],
        },
      },
    });
  });

  // 9. Mount Domain Routers
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/public", publicCatalogueRouter);
  app.use("/api/v1/admin/users", adminUserRouter);
  app.use("/api/v1/admin/audit-logs", adminAuditRouter);
  app.use("/api/v1/admin/destinations", adminDestinationRouter);
  app.use("/api/v1/admin/offers", adminOfferRouter);
  app.use("/api/v1/admin/customers", adminCustomerRouter);
  app.use("/api/v1/admin/enquiries", adminEnquiryRouter);
  app.use("/api/v1/admin/reservations", adminReservationRouter);
  app.use("/api/v1/admin/payments", adminPaymentRouter);

  // 10. 404 Route Handler
  app.use((req: Request, _res: Response, next) => {
    next(new AppError(404, `Cannot ${req.method} ${req.path}`, "NOT_FOUND"));
  });

  // 11. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
