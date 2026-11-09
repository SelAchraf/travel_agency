import { Router, type Request, type Response } from "express";
import { createUserSchema, ROLES, type Role } from "@travel-agency/shared";
import {
  listStaffUsers,
  createStaffUser,
  getStaffUserById,
  deactivateStaffUser,
  reactivateStaffUser,
  updateStaffUserRole,
} from "../../services/user.service.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { z } from "zod";

const router: Router = Router();

// Protect all staff management routes with authentication and users:manage permission
router.use(authenticate, requirePermission("users:manage"));

/**
 * GET /api/v1/admin/users
 * List staff accounts with filtering and pagination.
 */
router.get("/", async (req: Request, res: Response, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = await listStaffUsers({ page, limit, role, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/users
 * Create new staff member account.
 */
router.post("/", async (req: Request, res: Response, next) => {
  try {
    const validated = createUserSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const user = await createStaffUser({
      email: validated.email,
      password: validated.password,
      fullName: validated.fullName,
      phone: validated.phone,
      role: validated.role,
      branchId: validated.branchId ?? null,
      currentUserId: req.user!.id,
      currentUserEmail: req.user!.email,
      ipAddress,
      userAgent,
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Retrieve details of a single staff member.
 */
router.get("/:id", async (req: Request, res: Response, next) => {
  try {
    const user = await getStaffUserById(req.params.id!);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/users/:id/deactivate
 * Immediately deactivate a staff user account and revoke sessions.
 */
router.patch("/:id/deactivate", async (req: Request, res: Response, next) => {
  try {
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await deactivateStaffUser({
      targetUserId: req.params.id!,
      currentUserId: req.user!.id,
      currentUserEmail: req.user!.email,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: "Compte utilisateur désactivé immédiatement / User account deactivated immediately",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/users/:id/reactivate
 * Reactivate a deactivated staff user account.
 */
router.patch("/:id/reactivate", async (req: Request, res: Response, next) => {
  try {
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await reactivateStaffUser({
      targetUserId: req.params.id!,
      currentUserId: req.user!.id,
      currentUserEmail: req.user!.email,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: "Compte utilisateur réactivé avec succès / User account reactivated successfully",
    });
  } catch (err) {
    next(err);
  }
});

const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

/**
 * PATCH /api/v1/admin/users/:id/role
 * Update role of a staff user account.
 */
router.patch("/:id/role", async (req: Request, res: Response, next) => {
  try {
    const { role } = updateRoleSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await updateStaffUserRole({
      targetUserId: req.params.id!,
      newRole: role as Role,
      currentUserId: req.user!.id,
      currentUserEmail: req.user!.email,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: "Rôle utilisateur mis à jour avec succès / User role updated successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
