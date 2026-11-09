import { Router, type Request, type Response } from "express";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, ROLE_PERMISSIONS } from "@travel-agency/shared";
import {
  loginUser,
  refreshAccessToken,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from "../services/auth.service.js";
import { authenticate } from "../middleware/auth.js";
import { authRateLimiter, forgotPasswordRateLimiter } from "../middleware/rateLimiter.js";
import { env } from "../config/env.js";

const router: Router = Router();

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/auth",
};

/**
 * POST /api/v1/auth/login
 * Staff login with Argon2id verification, lockout checks, and httpOnly cookies.
 */
router.post("/login", authRateLimiter, async (req: Request, res: Response, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const { user, accessToken, refreshToken } = await loginUser({
      email: validated.email,
      password: validated.password,
      ipAddress,
      userAgent,
    });

    res.cookie("accessToken", accessToken, COOKIE_OPTIONS_ACCESS);
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS_REFRESH);

    res.json({
      success: true,
      user,
      accessToken,
      permissions: ROLE_PERMISSIONS[user.role],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token and rotate refresh token with reuse detection.
 */
router.post("/refresh", async (req: Request, res: Response, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken({
      refreshToken: rawRefreshToken,
      ipAddress,
      userAgent,
    });

    res.cookie("accessToken", accessToken, COOKIE_OPTIONS_ACCESS);
    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS_REFRESH);

    res.json({
      success: true,
      accessToken,
    });
  } catch (err) {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/v1/auth" });
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 * Clear cookies and invalidate active refresh token in database.
 */
router.post("/logout", authenticate, async (req: Request, res: Response, next) => {
  try {
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    if (req.user) {
      await logoutUser({
        userId: req.user.id,
        ipAddress,
        userAgent,
      });
    }

    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/v1/auth" });

    res.json({
      success: true,
      message: "Déconnexion réussie / Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Issue single-use hashed password reset token.
 */
router.post("/forgot-password", forgotPasswordRateLimiter, async (req: Request, res: Response, next) => {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const result = await requestPasswordReset({
      email: validated.email,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: "Si un compte est associé à cette adresse, des instructions ont été envoyées / If an account exists, reset instructions have been issued",
      ...(result.resetToken ? { resetToken: result.resetToken } : {}),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Validate single-use token and update password with Argon2id.
 */
router.post("/reset-password", async (req: Request, res: Response, next) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await resetPassword({
      token: validated.token,
      newPassword: validated.newPassword,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès. Veuillez vous connecter / Password reset successfully. Please log in",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Return currently authenticated user profile and RBAC permissions.
 */
router.get("/me", authenticate, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }

  res.json({
    success: true,
    user: req.user,
    permissions: ROLE_PERMISSIONS[req.user.role],
  });
});

export default router;
