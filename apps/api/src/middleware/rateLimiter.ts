import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const isTest = env.NODE_ENV === "test";

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isTest ? 10000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later",
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10,  // Max 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Trop de tentatives de connexion. Réessayez dans 15 minutes / Too many login attempts. Try again in 15 minutes",
  },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 3,   // Max 3 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Limite de demandes de réinitialisation atteinte. Réessayez plus tard / Reset password limit reached. Try again later",
  },
});

export const enquiryRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isTest ? 1000 : 5,  // Max 5 enquiries per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Limite de soumission atteinte. Veuillez patienter avant de soumettre une nouvelle demande / Submission limit reached",
  },
});
