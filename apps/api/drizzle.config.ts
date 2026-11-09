import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema.ts",
  out: "./src/database/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://travel_user:travel_password_secure_2026@127.0.0.1:5432/travel_agency",
  },
});

