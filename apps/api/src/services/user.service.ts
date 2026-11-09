import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../database/connection.js";
import { users } from "../database/schema.js";
import { hashPassword } from "../utils/password.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { Role } from "@travel-agency/shared";

export interface ListUsersParams {
  page?: number | undefined;
  limit?: number | undefined;
  role?: string | undefined;
  search?: string | undefined;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: Role;
  branchId?: string | null;
  currentUserId: string;
  currentUserEmail: string;
  ipAddress: string;
  userAgent: string;
}

export interface UserActionParams {
  targetUserId: string;
  currentUserId: string;
  currentUserEmail: string;
  ipAddress: string;
  userAgent: string;
}

export interface UpdateRoleParams extends UserActionParams {
  newRole: Role;
}

export async function listStaffUsers(params: ListUsersParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.role) {
    conditions.push(eq(users.role, params.role));
  }

  if (params.search) {
    const searchPattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(users.fullName, searchPattern),
        ilike(users.email, searchPattern),
        ilike(users.phone, searchPattern),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(whereClause);

  const total = countResult?.count || 0;

  const staffMembers = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      branchId: users.branchId,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    users: staffMembers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createStaffUser(input: CreateUserInput) {
  const normalizedEmail = input.email.toLowerCase().trim();

  // 1. Check uniqueness
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    throw new AppError(409, "Un compte avec cette adresse email existe déjà / User with this email already exists");
  }

  // 2. Hash password with Argon2id
  const passwordHash = await hashPassword(input.password);

  // 3. Insert staff user
  const [createdUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      role: input.role,
      branchId: input.branchId || null,
      isActive: true,
    })
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      branchId: users.branchId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  if (!createdUser) {
    throw new AppError(500, "Échec de création du compte utilisateur / Failed to create user");
  }

  // 4. Log to append-only AuditLog
  await createAuditEntry({
    userId: input.currentUserId,
    userEmail: input.currentUserEmail,
    action: "USER_CREATE",
    entityType: "User",
    entityId: createdUser.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    diffSummary: {
      createdEmail: createdUser.email,
      role: createdUser.role,
      fullName: createdUser.fullName,
    },
  });

  return createdUser;
}

export async function getStaffUserById(id: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      branchId: users.branchId,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    throw new AppError(404, "Utilisateur introuvable / User not found");
  }

  return user;
}

export async function deactivateStaffUser({
  targetUserId,
  currentUserId,
  currentUserEmail,
  ipAddress,
  userAgent,
}: UserActionParams) {
  if (targetUserId === currentUserId) {
    throw new AppError(400, "Vous ne pouvez pas désactiver votre propre compte / Cannot deactivate your own account");
  }

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) {
    throw new AppError(404, "Utilisateur introuvable / User not found");
  }

  // Deactivate and immediately terminate all active sessions (clear refresh token family)
  await db
    .update(users)
    .set({
      isActive: false,
      refreshTokenFamilyId: null,
      currentRefreshTokenHash: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUserId));

  await createAuditEntry({
    userId: currentUserId,
    userEmail: currentUserEmail,
    action: "USER_DEACTIVATE",
    entityType: "User",
    entityId: targetUserId,
    ipAddress,
    userAgent,
    diffSummary: { targetEmail: target.email, previousStatus: target.isActive, newStatus: false },
  });

  return { success: true };
}

export async function reactivateStaffUser({
  targetUserId,
  currentUserId,
  currentUserEmail,
  ipAddress,
  userAgent,
}: UserActionParams) {
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) {
    throw new AppError(404, "Utilisateur introuvable / User not found");
  }

  await db
    .update(users)
    .set({
      isActive: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUserId));

  await createAuditEntry({
    userId: currentUserId,
    userEmail: currentUserEmail,
    action: "USER_REACTIVATE",
    entityType: "User",
    entityId: targetUserId,
    ipAddress,
    userAgent,
    diffSummary: { targetEmail: target.email, previousStatus: target.isActive, newStatus: true },
  });

  return { success: true };
}

export async function updateStaffUserRole({
  targetUserId,
  newRole,
  currentUserId,
  currentUserEmail,
  ipAddress,
  userAgent,
}: UpdateRoleParams) {
  if (targetUserId === currentUserId) {
    throw new AppError(400, "Vous ne pouvez pas modifier votre propre rôle / Cannot modify your own role");
  }

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) {
    throw new AppError(404, "Utilisateur introuvable / User not found");
  }

  // Update role and revoke refresh tokens so user re-authenticates with new permissions
  await db
    .update(users)
    .set({
      role: newRole,
      refreshTokenFamilyId: null,
      currentRefreshTokenHash: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUserId));

  await createAuditEntry({
    userId: currentUserId,
    userEmail: currentUserEmail,
    action: "USER_ROLE_UPDATE",
    entityType: "User",
    entityId: targetUserId,
    ipAddress,
    userAgent,
    diffSummary: {
      targetEmail: target.email,
      previousRole: target.role,
      newRole,
    },
  });

  return { success: true };
}
