import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool, connectDatabase, disconnectDatabase } from "../src/database/connection.js";
import { migrateDatabase } from "../src/database/migrate.js";
import { getNextSequence } from "../src/database/counter.js";

describe("API Health & PostgreSQL Transaction Integration Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await connectDatabase();
    await migrateDatabase();
    app = createApp();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("GET /health returns healthy status and PostgreSQL connection confirmation", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.services.database.type).toBe("PostgreSQL");
    expect(res.body.services.database.status).toBe("connected");
  });

  it("GET /api/v1/public/agency returns Algerian agency branding & settings", async () => {
    const res = await request(app).get("/api/v1/public/agency");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.branding.primaryColor).toBe("#0D233A");
    expect(res.body.data.settings.currency).toBe("DZD");
    expect(res.body.data.name.ar).toBe("وكالة نوميديا للأسفار والسياحة");
  });

  it("Executes ACID PostgreSQL transaction and rolls back on failure", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO counters (id, seq) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
        ["ROLLBACK_TEST", 100],
      );

      // Verify row exists inside the transaction
      const innerCheck = await client.query("SELECT * FROM counters WHERE id = $1", ["ROLLBACK_TEST"]);
      expect(innerCheck.rows.length).toBe(1);

      // Rollback the transaction
      await client.query("ROLLBACK");

      // Verify that document does NOT exist after rollback
      const outerCheck = await pool.query("SELECT * FROM counters WHERE id = $1", ["ROLLBACK_TEST"]);
      expect(outerCheck.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it("Generates atomic sequential references without race conditions in PostgreSQL", async () => {
    const ref1 = await getNextSequence("TRV");
    const ref2 = await getNextSequence("TRV");
    const year = new Date().getFullYear();

    expect(ref1).toMatch(new RegExp(`^TRV-${year}-\\d{6}$`));
    expect(ref2).toMatch(new RegExp(`^TRV-${year}-\\d{6}$`));

    const num1 = parseInt(ref1.split("-")[2]!, 10);
    const num2 = parseInt(ref2.split("-")[2]!, 10);
    expect(num2).toBe(num1 + 1);
  });
});
