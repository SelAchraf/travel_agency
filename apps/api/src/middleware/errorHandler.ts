import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;

  constructor(statusCode: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (code !== undefined) this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.flatten(),
      },
    });
    return;
  }

  // Handle Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? "APP_ERROR",
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Unexpected Internal Errors
  logger.error({
    msg: "Unhandled internal error",
    err,
    path: req.path,
    method: req.method,
  });

  const isProd = env.NODE_ENV === "production";
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProd
        ? "An unexpected server error occurred"
        : (err as Error)?.message || "Internal error",
      ...(isProd ? {} : { stack: (err as Error)?.stack }),
    },
  });
}
