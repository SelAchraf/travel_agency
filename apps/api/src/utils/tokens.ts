import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@travel-agency/shared";

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
  branchId?: string | null;
}

/**
 * Generate short-lived access token (15 minutes).
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
    issuer: "travel_agency_platform",
    audience: "travel_agency_client",
  });
}

/**
 * Verify access token.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "travel_agency_platform",
    audience: "travel_agency_client",
  }) as TokenPayload;
}

/**
 * Generate cryptographically secure refresh token (hex string).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * Hash token using SHA-256 for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate single-use password reset token with 1-hour expiration.
 */
export function generatePasswordResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, tokenHash, expiresAt };
}

