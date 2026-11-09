import dotenv from "dotenv";
import path from "node:path";
import { envSchema, type EnvConfig } from "@travel-agency/shared";

// Attempt to load from current directory and workspace root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

// Provide test defaults if running vitest
if (process.env.NODE_ENV === "test") {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://travel_user:travel_password_secure_2026@127.0.0.1:5432/travel_agency";
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || "test_access_secret_minimum_32_characters_long_for_security";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "test_refresh_secret_minimum_32_characters_long_for_security";
  process.env.COOKIE_SECRET =
    process.env.COOKIE_SECRET || "test_cookie_secret_minimum_32_characters_long_for_security";
}

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("FATAL: Invalid environment configuration:", result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadConfig();
