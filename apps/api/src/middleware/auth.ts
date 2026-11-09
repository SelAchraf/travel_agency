import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../database/connection.js";
import { users } from "../database/schema.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { ROLE_PERMISSIONS, type Role, type Permission } from "@travel-agency/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  branchId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: Verify JWT Access Token from httpOnly cookie or Authorization header.
 * Enforces immediate account deactivation check directly against database.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Authentification requise. Veuillez vous connecter / Authentication required",
      });
      return;
    }

    // 1. Verify access token signature and expiration
    const payload = verifyAccessToken(token);

    // 2. Fetch active status from PostgreSQL (guarantees deactivating user cuts access immediately)
    const [dbUser] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        branchId: users.branchId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!dbUser || !dbUser.isActive) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.status(401).json({
        success: false,
        error: "Compte introuvable ou désactivé / Account is deactivated or not found",
      });
      return;
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role as Role,
      branchId: dbUser.branchId,
    };

    next();
  } catch (err: any) {
    res.clearCookie("accessToken");
    res.status(401).json({
      success: false,
      error: "Session invalide ou expirée. Veuillez vous reconnecter / Session expired or invalid",
    });
  }
}

/**
 * Middleware factory: Enforce required RBAC permissions on protected routes.
 * Checks permissions dynamically from ROLE_PERMISSIONS matrix in @travel-agency/shared.
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentification requise / Authentication required",
      });
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAll) {
      res.status(403).json({
        success: false,
        error: "Accès refusé : permissions insuffisantes / Forbidden: Insufficient permissions",
        required: requiredPermissions,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: Enforce specific roles (e.g. owner only).
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentification requise / Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Accès refusé pour ce rôle / Forbidden: Role not allowed",
      });
      return;
    }

    next();
  };
}

