import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import * as schema from "./schema.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export async function connectDatabase(): Promise<void> {
  try {
    logger.info("Connecting to PostgreSQL...");
    const client = await pool.connect();
    const res = await client.query("SELECT version();");
    client.release();
    logger.info({
      msg: "PostgreSQL connected successfully",
      version: res.rows[0]?.version,
    });
  } catch (error) {
    logger.error({ msg: "PostgreSQL connection error", error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();
  logger.info("PostgreSQL pool closed");
}
