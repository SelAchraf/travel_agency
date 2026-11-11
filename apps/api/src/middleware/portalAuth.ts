import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../database/connection.js";
import { customers } from "../database/schema.js";
import { verifyPortalAccessToken } from "../utils/tokens.js";

export interface PortalCustomerUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      portalCustomer?: PortalCustomerUser;
    }
  }
}

export async function portalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.portalToken;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Accès au portail non autorisé. Veuillez utiliser votre lien sécurisé / Portal token required",
      });
      return;
    }

    const payload = verifyPortalAccessToken(token);

    const [cust] = await db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        email: customers.email,
        isArchived: customers.isArchived,
      })
      .from(customers)
      .where(eq(customers.id, payload.sub))
      .limit(1);

    if (!cust || cust.isArchived) {
      res.status(401).json({
        success: false,
        error: "Dossier client introuvable ou archivé / Customer record unavailable",
      });
      return;
    }

    req.portalCustomer = {
      id: cust.id,
      fullName: cust.fullName,
      phone: cust.phone,
      email: cust.email,
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: "Session portail expirée ou invalide. Veuillez réutiliser votre lien de réservation / Session expired",
    });
  }
}

