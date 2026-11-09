import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../database/connection.js";
import { users } from "../database/schema.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generatePasswordResetToken,
} from "../utils/tokens.js";
import { createAuditEntry } from "./audit.service.js";
import { AppError } from "../middleware/errorHandler.js";
import type { Role } from "@travel-agency/shared";

export interface LoginParams {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
}

export interface RefreshParams {
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
}

export interface LogoutParams {
  userId: string;
  ipAddress: string;
  userAgent: string;
}

export interface RequestResetParams {
  email: string;
  ipAddress: string;
  userAgent: string;
}

export interface ResetPasswordParams {
  token: string;
  newPassword: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Calculates progressive lockout duration based on failed attempts:
 * - 5 attempts: 15 minutes
 * - 10 attempts: 1 hour
 * - 15+ attempts: 24 hours
 */
function getLockoutDurationMs(attempts: number): number | null {
  if (attempts >= 15) return 24 * 60 * 60 * 1000;
  if (attempts >= 10) return 60 * 60 * 1000;
  if (attempts >= 5) return 15 * 60 * 1000;
  return null;
}

export async function loginUser({ email, password, ipAddress, userAgent }: LoginParams) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Fetch user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    await createAuditEntry({
      action: "LOGIN_FAILED_UNKNOWN_EMAIL",
      entityType: "User",
      userEmail: normalizedEmail,
      ipAddress,
      userAgent,
      diffSummary: { reason: "User not found" },
    });
    throw new AppError(401, "Email ou mot de passe incorrect / Invalid email or password");
  }

  // 2. Check deactivation (immediate cut)
  if (!user.isActive) {
    await createAuditEntry({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN_BLOCKED_DEACTIVATED",
      entityType: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
      diffSummary: { reason: "Account is deactivated" },
    });
    throw new AppError(401, "Ce compte est désactivé. Veuillez contacter un administrateur / Account is deactivated");
  }

  // 3. Check progressive lockout status
  const now = new Date();
  if (user.lockoutUntil && user.lockoutUntil > now) {
    const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / 60000);
    await createAuditEntry({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN_BLOCKED_LOCKED",
      entityType: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
      diffSummary: { remainingMinutes },
    });
    throw new AppError(
      423,
      `Compte temporairement verrouillé. Réessayez dans ${remainingMinutes} minute(s) / Account locked for ${remainingMinutes} more minute(s)`,
    );
  }

  // 4. Verify password with Argon2id
  const isMatch = await verifyPassword(user.passwordHash, password);

  if (!isMatch) {
    const nextAttempts = user.failedLoginAttempts + 1;
    const lockoutDuration = getLockoutDurationMs(nextAttempts);
    const lockoutUntil = lockoutDuration ? new Date(Date.now() + lockoutDuration) : null;

    await db
      .update(users)
      .set({
        failedLoginAttempts: nextAttempts,
        lockoutUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await createAuditEntry({
      userId: user.id,
      userEmail: user.email,
      action: lockoutUntil ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
      entityType: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
      diffSummary: {
        failedAttempts: nextAttempts,
        lockedUntil: lockoutUntil?.toISOString() || null,
      },
    });

    if (lockoutUntil) {
      const remainingMinutes = Math.ceil((lockoutUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        423,
        `Trop de tentatives échouées. Compte verrouillé pour ${remainingMinutes} minute(s) / Too many failed attempts. Account locked for ${remainingMinutes} minute(s)`,
      );
    }

    throw new AppError(401, "Email ou mot de passe incorrect / Invalid email or password");
  }

  // 5. Successful login: Reset lockout counters & issue dual tokens
  const refreshTokenFamilyId = crypto.randomUUID();
  const rawRefreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);

  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockoutUntil: null,
      refreshTokenFamilyId,
      currentRefreshTokenHash: hashedRefreshToken,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const accessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as Role,
    fullName: user.fullName,
    branchId: user.branchId,
  });

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "LOGIN_SUCCESS",
    entityType: "User",
    entityId: user.id,
    ipAddress,
    userAgent,
    diffSummary: { role: user.role },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      phone: user.phone,
      branchId: user.branchId,
    },
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

export async function refreshAccessToken({ refreshToken, ipAddress, userAgent }: RefreshParams) {
  if (!refreshToken) {
    throw new AppError(401, "Jeton de rafraîchissement requis / Refresh token required");
  }

  const incomingHash = hashToken(refreshToken);

  // Look up user with matching current refresh token hash
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.currentRefreshTokenHash, incomingHash))
    .limit(1);

  if (!user) {
    // REUSE DETECTION: Token presented is invalid or already rotated.
    await createAuditEntry({
      action: "REFRESH_TOKEN_REUSE_DETECTED",
      entityType: "User",
      ipAddress,
      userAgent,
      diffSummary: { tokenHash: incomingHash.slice(0, 10) + "..." },
    });
    throw new AppError(403, "Jeton invalide ou réutilisé. Veuillez vous reconnecter / Invalid or reused refresh token");
  }

  if (!user.isActive) {
    // Deactivated user immediately cut off
    await db
      .update(users)
      .set({
        refreshTokenFamilyId: null,
        currentRefreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    throw new AppError(401, "Ce compte est désactivé / Account is deactivated");
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  await db
    .update(users)
    .set({
      currentRefreshTokenHash: newRefreshTokenHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const newAccessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as Role,
    fullName: user.fullName,
    branchId: user.branchId,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser({ userId, ipAddress, userAgent }: LogoutParams) {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user) {
    await db
      .update(users)
      .set({
        refreshTokenFamilyId: null,
        currentRefreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await createAuditEntry({
      userId: user.id,
      userEmail: user.email,
      action: "LOGOUT",
      entityType: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });
  }
}

export async function requestPasswordReset({ email, ipAddress, userAgent }: RequestResetParams) {
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !user.isActive) {
    // Return standard success to prevent user enumeration
    return { success: true };
  }

  const { token, tokenHash, expiresAt } = generatePasswordResetToken();

  await db
    .update(users)
    .set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "User",
    entityId: user.id,
    ipAddress,
    userAgent,
    diffSummary: { expiresAt: expiresAt.toISOString() },
  });

  return {
    success: true,
    // Return token in dev/test for easy automated testing & verification
    resetToken: process.env.NODE_ENV !== "production" ? token : undefined,
  };
}

export async function resetPassword({ token, newPassword, ipAddress, userAgent }: ResetPasswordParams) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetTokenHash, tokenHash))
    .limit(1);

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < now) {
    throw new AppError(400, "Jeton de réinitialisation invalide ou expiré / Invalid or expired reset token");
  }

  const newHash = await hashPassword(newPassword);

  // Update password and revoke all active sessions immediately
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
      refreshTokenFamilyId: null,
      currentRefreshTokenHash: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await createAuditEntry({
    userId: user.id,
    userEmail: user.email,
    action: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: user.id,
    ipAddress,
    userAgent,
  });

  return { success: true };
}
